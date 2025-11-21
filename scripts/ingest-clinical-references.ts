/**
 * Ingestion Script for clinical_reference/ documents
 * 
 * Reads markdown files from clinical_reference/, chunks them,
 * generates embeddings, and stores in Supabase for RAG.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY!
const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002'
const EMBEDDING_API_VERSION = '2023-05-15' // Embeddings use older API version

const CLINICAL_REF_DIR = path.join(process.cwd(), 'clinical_reference')
const CHUNK_SIZE = 400 // tokens (roughly 300-400 words) - reduced to fit embedding model limit
const CHUNK_OVERLAP = 50 // tokens overlap between chunks

interface DocumentMetadata {
  filename: string
  documentType: string
  compoundName?: string
  disease?: string
}

/**
 * Generate embedding using Azure OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${EMBEDDING_API_VERSION}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_KEY,
    },
    body: JSON.stringify({ input: text }),
  })

  if (!response.ok) {
    throw new Error(`Embedding failed: ${await response.text()}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Parse filename to extract metadata
 */
function parseFilename(filename: string): DocumentMetadata {
  const base = filename.replace('.md', '')
  
  // Detect document type
  let documentType = 'unknown'
  if (base.includes('CSR') || base.includes('_CSR')) {
    documentType = 'csr'
  } else if (base.includes('IB') || base.includes('_IB')) {
    documentType = 'ib'
  } else if (base.includes('protocol_')) {
    documentType = 'protocol'
  } else if (base.includes('ICF_')) {
    documentType = 'icf'
  } else if (base.includes('synopsis_')) {
    documentType = 'synopsis'
  } else if (base.includes('summary_')) {
    documentType = 'spc'
  }

  // Extract compound name (e.g., bcd-063, linex, femilex)
  const compoundMatch = base.match(/^([a-z]+-\d+|[a-z]+)/i)
  const compoundName = compoundMatch ? compoundMatch[1] : undefined

  return {
    filename,
    documentType,
    compoundName,
  }
}

/**
 * Chunk text into smaller pieces
 * Simple chunking by paragraphs with size limit
 */
function chunkText(text: string, maxChunkSize: number = CHUNK_SIZE): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    // Rough token estimate: 1 token ≈ 4 characters
    const paraTokens = para.length / 4
    const currentTokens = currentChunk.length / 4

    if (currentTokens + paraTokens > maxChunkSize && currentChunk) {
      // Save current chunk and start new one
      chunks.push(currentChunk.trim())
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(c => c.length > 50) // Filter out tiny chunks
}

/**
 * Ingest a single document
 */
async function ingestDocument(
  supabase: ReturnType<typeof createClient>,
  filepath: string
): Promise<number> {
  const filename = path.basename(filepath)
  const content = fs.readFileSync(filepath, 'utf-8')
  const metadata = parseFilename(filename)

  console.log(`\n📄 Processing: ${filename}`)
  console.log(`   Type: ${metadata.documentType}`)
  console.log(`   Compound: ${metadata.compoundName || 'N/A'}`)

  // 1. Store full document
  const { data: docData, error: docError } = await supabase
    .from('clinical_reference_documents')
    .upsert({
      filename,
      document_type: metadata.documentType,
      compound_name: metadata.compoundName,
      full_content: content,
      metadata: { source: 'clinical_reference' },
    })
    .select()

  if (docError) {
    console.error(`   ❌ Error storing document: ${docError.message}`)
    return 0
  }

  console.log(`   ✅ Document stored`)

  // 2. Chunk the content
  const chunks = chunkText(content)
  console.log(`   📦 Created ${chunks.length} chunks`)

  // 3. Generate embeddings and store chunks
  let storedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk)

      // Store in drug_reference_chunks
      if (metadata.compoundName) {
        const { error } = await supabase
          .from('drug_reference_chunks')
          .insert({
            compound_name: metadata.compoundName,
            source: 'clinical_reference',
            document_type: metadata.documentType,
            content: chunk,
            embedding,
            metadata: {
              filename,
              chunk_index: i,
              total_chunks: chunks.length,
            },
          })

        if (error) {
          console.error(`   ❌ Error storing chunk ${i}: ${error.message}`)
        } else {
          storedCount++
        }
      }

      // Rate limiting: wait 100ms between API calls
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`   ❌ Error processing chunk ${i}:`, error)
    }
  }

  console.log(`   ✅ Stored ${storedCount}/${chunks.length} chunks`)
  return storedCount
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('🚀 Clinical Reference Ingestion Script')
  console.log('=' .repeat(50))

  // Initialize Supabase with Database types
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get all markdown files
  const files = fs.readdirSync(CLINICAL_REF_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(CLINICAL_REF_DIR, f))

  console.log(`\n📁 Found ${files.length} markdown files in clinical_reference/`)

  let totalChunks = 0

  for (const file of files) {
    const chunks = await ingestDocument(supabase, file)
    totalChunks += chunks
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Ingestion complete!`)
  console.log(`   Documents processed: ${files.length}`)
  console.log(`   Total chunks stored: ${totalChunks}`)
  console.log('='.repeat(50))
}

// Run
main().catch(console.error)
