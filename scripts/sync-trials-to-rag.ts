/**
 * Sync Trials & Literature to RAG Chunks
 * 
 * Syncs data from trials and literature tables directly to drug_reference_chunks
 * for RAG retrieval (bypassing external_data_cache for now)
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

const BATCH_SIZE = 5
const DELAY_MS = 1000

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 Syncing Trials & Literature to RAG Chunks')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let totalProcessed = 0
  let totalErrors = 0

  // ========================================================================
  // STEP 1: Sync Trials
  // ========================================================================
  console.log('\n📋 Step 1: Syncing Clinical Trials...')
  
  const { data: trials, error: trialsError } = await supabase
    .from('trials')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (trialsError) {
    console.error('❌ Error fetching trials:', trialsError)
  } else if (trials && trials.length > 0) {
    console.log(`✅ Found ${trials.length} trials`)

    for (let i = 0; i < trials.length; i += BATCH_SIZE) {
      const batch = trials.slice(i, i + BATCH_SIZE)
      console.log(`\n  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(trials.length / BATCH_SIZE)}`)

      for (const trial of batch) {
        try {
          // Create content for embedding
          const content = `Clinical Trial ${trial.nct_id}: ${trial.title || 'No title'}`
          
          if (content.length < 50) {
            console.log(`  ⏭️  Skipping ${trial.nct_id} (too short)`)
            continue
          }

          // Check if already exists
          const { data: existing } = await supabase
            .from('drug_reference_chunks')
            .select('id')
            .eq('source', 'external:ctgov')
            .eq('metadata->>nct_id', trial.nct_id)
            .single()

          if (existing) {
            console.log(`  ⏭️  Already exists: ${trial.nct_id}`)
            continue
          }

          // Generate embedding
          console.log(`  🔄 Generating embedding for ${trial.nct_id}...`)
          const embedding = await generateEmbedding(content)

          // Get compound name from inchikey (lookup in compounds table)
          let compoundName = 'unknown'
          if (trial.inchikey) {
            const { data: compound } = await supabase
              .from('compounds')
              .select('name')
              .eq('inchikey', trial.inchikey)
              .single()
            
            if (compound) {
              compoundName = compound.name
            }
          }

          // Store in drug_reference_chunks
          const { error: insertError } = await supabase
            .from('drug_reference_chunks')
            .insert({
              compound_name: compoundName,
              source: 'external:ctgov',
              document_type: 'trial_description',
              content: content,
              embedding: embedding as any,
              url: trial.source_url,
              metadata: {
                nct_id: trial.nct_id,
                phase: trial.phase,
                status: trial.status,
                enrollment: trial.enrollment,
                inchikey: trial.inchikey,
              },
            })

          if (insertError) {
            console.error(`  ❌ Error inserting ${trial.nct_id}:`, insertError)
            totalErrors++
          } else {
            console.log(`  ✅ Synced ${trial.nct_id}`)
            totalProcessed++
          }

        } catch (error) {
          console.error(`  ❌ Error processing ${trial.nct_id}:`, error)
          totalErrors++
        }
      }

      if (i + BATCH_SIZE < trials.length) {
        console.log(`  ⏳ Waiting ${DELAY_MS}ms...`)
        await sleep(DELAY_MS)
      }
    }
  }

  // ========================================================================
  // STEP 2: Sync Literature
  // ========================================================================
  console.log('\n📚 Step 2: Syncing Literature...')
  
  const { data: literature, error: litError } = await supabase
    .from('literature')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  if (litError) {
    console.error('❌ Error fetching literature:', litError)
  } else if (literature && literature.length > 0) {
    console.log(`✅ Found ${literature.length} publications`)

    for (let i = 0; i < literature.length; i += BATCH_SIZE) {
      const batch = literature.slice(i, i + BATCH_SIZE)
      console.log(`\n  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(literature.length / BATCH_SIZE)}`)

      for (const pub of batch) {
        try {
          // Create content for embedding
          const content = pub.abstract || `PubMed Article ${pub.pmid}: ${pub.title}`
          
          if (content.length < 50) {
            console.log(`  ⏭️  Skipping ${pub.pmid} (too short)`)
            continue
          }

          // Check if already exists
          const { data: existing } = await supabase
            .from('drug_reference_chunks')
            .select('id')
            .eq('source', 'external:pubmed')
            .eq('metadata->>pmid', pub.pmid)
            .single()

          if (existing) {
            console.log(`  ⏭️  Already exists: ${pub.pmid}`)
            continue
          }

          // Generate embedding
          console.log(`  🔄 Generating embedding for ${pub.pmid}...`)
          const embedding = await generateEmbedding(content.substring(0, 8000)) // Limit to model max

          // Get compound name from inchikey
          let compoundName = 'unknown'
          if (pub.inchikey) {
            const { data: compound } = await supabase
              .from('compounds')
              .select('name')
              .eq('inchikey', pub.inchikey)
              .single()
            
            if (compound) {
              compoundName = compound.name
            }
          }

          // Store in drug_reference_chunks
          const { error: insertError } = await supabase
            .from('drug_reference_chunks')
            .insert({
              compound_name: compoundName,
              source: 'external:pubmed',
              document_type: 'abstract',
              content: content.substring(0, 2000), // Store first 2000 chars
              embedding: embedding as any,
              url: pub.source_url,
              metadata: {
                pmid: pub.pmid,
                title: pub.title,
                journal: pub.journal,
                publication_date: pub.publication_date,
                doi: pub.doi,
                inchikey: pub.inchikey,
              },
            })

          if (insertError) {
            console.error(`  ❌ Error inserting ${pub.pmid}:`, insertError)
            totalErrors++
          } else {
            console.log(`  ✅ Synced ${pub.pmid}`)
            totalProcessed++
          }

        } catch (error) {
          console.error(`  ❌ Error processing ${pub.pmid}:`, error)
          totalErrors++
        }
      }

      if (i + BATCH_SIZE < literature.length) {
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
