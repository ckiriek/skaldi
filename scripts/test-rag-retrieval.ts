/**
 * Test RAG Retrieval
 * 
 * Tests the ReferenceRetriever to verify embeddings and vector search work correctly.
 */

import { ReferenceRetriever } from '../lib/services/reference-retriever'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('🧪 Testing RAG Retrieval')
  console.log('='.repeat(50))

  // Create service role client for testing
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const retriever = new ReferenceRetriever(supabase)

  // Test 1: Drug reference retrieval
  console.log('\n📋 Test 1: Drug Reference Retrieval')
  console.log('-'.repeat(50))
  
  const drugRefs = await retriever.retrieveDrugReferences({
    compoundName: 'protocol',
    topK: 5,
    minSimilarity: 0.1  // Very low threshold for testing
  })

  console.log(`Found ${drugRefs.length} drug reference chunks:`)
  drugRefs.forEach((ref, i) => {
    console.log(`\n${i + 1}. Source: ${ref.source}`)
    console.log(`   Similarity: ${(ref.similarity! * 100).toFixed(1)}%`)
    console.log(`   Content: ${ref.content.substring(0, 150)}...`)
  })

  // Test 2: Combined retrieval
  console.log('\n\n📋 Test 2: Combined Retrieval')
  console.log('-'.repeat(50))

  const combined = await retriever.retrieveReferences({
    compoundName: 'protocol',
    disease: 'diabetes',
    sectionId: 'protocol_objectives',
    topK: 5,
    minSimilarity: 0.5
  })

  console.log(`\nDrug references: ${combined.drugReferences.length}`)
  console.log(`Disease references: ${combined.diseaseReferences.length}`)
  console.log(`Combined (deduplicated): ${combined.combined.length}`)

  // Test 3: Format for prompt
  console.log('\n\n📋 Test 3: Formatted for Prompt')
  console.log('-'.repeat(50))

  const formatted = retriever.formatReferencesForPrompt(combined.combined.slice(0, 2))
  console.log(formatted)

  console.log('\n' + '='.repeat(50))
  console.log('✅ RAG Retrieval Test Complete!')
}

main().catch(console.error)
