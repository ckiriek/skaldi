/**
 * Sync External Data to RAG Chunks
 * 
 * Takes data from external_data_cache and creates embeddings
 * for use in RAG retrieval system.
 * 
 * Flow:
 * 1. Fetch external data from cache
 * 2. Generate embeddings via Azure OpenAI
 * 3. Store in drug_reference_chunks with source tracking
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY!
const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002'
const EMBEDDING_API_VERSION = '2023-05-15'

const BATCH_SIZE = 10 // Process in batches to avoid rate limits
const DELAY_MS = 1000 // Delay between batches

interface ExternalDataRecord {
  id: string
  compound_name: string
  disease: string | null
  source: string
  source_id: string | null
  source_url: string | null
  content_type: string
  section_name: string | null
  normalized_content: string
  payload: any
}

/**
 * Generate embedding via Azure OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${EMBEDDING_API_VERSION}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_KEY,
    },
    body: JSON.stringify({
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure OpenAI error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 Syncing External Data to RAG Chunks')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Fetch all external data that hasn't been synced yet
  console.log('\n📥 Fetching external data from cache...')
  
  const { data: externalData, error: fetchError } = await supabase
    .from('external_data_cache')
    .select('*')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('❌ Error fetching external data:', fetchError)
    throw fetchError
  }

  if (!externalData || externalData.length === 0) {
    console.log('ℹ️  No external data found in cache')
    return
  }

  console.log(`✅ Found ${externalData.length} external data records`)

  // Group by compound for better organization
  const byCompound = new Map<string, ExternalDataRecord[]>()
  
  for (const record of externalData as ExternalDataRecord[]) {
    if (!byCompound.has(record.compound_name)) {
      byCompound.set(record.compound_name, [])
    }
    byCompound.get(record.compound_name)!.push(record)
  }

  console.log(`📊 Found data for ${byCompound.size} compounds`)

  let totalProcessed = 0
  let totalErrors = 0

  // Process each compound
  for (const [compoundName, records] of byCompound.entries()) {
    console.log(`\n🔬 Processing ${compoundName} (${records.length} records)`)

    // Process in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`)

      for (const record of batch) {
        try {
          // Skip if content is too short
          if (!record.normalized_content || record.normalized_content.length < 50) {
            console.log(`  ⏭️  Skipping ${record.source}/${record.content_type} (too short)`)
            continue
          }

          // Generate embedding
          console.log(`  🔄 Generating embedding for ${record.source}/${record.content_type}...`)
          const embedding = await generateEmbedding(record.normalized_content)

          // Store in drug_reference_chunks
          const { error: insertError } = await supabase
            .from('drug_reference_chunks')
            .insert({
              compound_name: record.compound_name,
              source: `external:${record.source}`,
              document_type: record.content_type,
              content: record.normalized_content,
              embedding: embedding as any,
              url: record.source_url,
              metadata: {
                external_data_id: record.id,
                source_id: record.source_id,
                section_name: record.section_name,
                content_type: record.content_type,
                ...record.payload,
              },
            })

          if (insertError) {
            // Check if it's a duplicate
            if (insertError.code === '23505') {
              console.log(`  ⏭️  Already exists: ${record.source}/${record.content_type}`)
            } else {
              console.error(`  ❌ Error inserting chunk:`, insertError)
              totalErrors++
            }
          } else {
            console.log(`  ✅ Synced ${record.source}/${record.content_type}`)
            totalProcessed++
          }

        } catch (error) {
          console.error(`  ❌ Error processing record:`, error)
          totalErrors++
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < records.length) {
        console.log(`  ⏳ Waiting ${DELAY_MS}ms...`)
        await sleep(DELAY_MS)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Sync Complete!')
  console.log(`📊 Processed: ${totalProcessed}`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
