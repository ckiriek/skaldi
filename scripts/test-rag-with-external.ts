/**
 * Test RAG with External Data
 * 
 * Tests RAG retrieval including external sources (trials, literature)
 */

import { ReferenceRetriever } from '../lib/services/reference-retriever'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  console.log('🧪 Testing RAG with External Data')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const retriever = new ReferenceRetriever(supabase)

  // Test 1: Search for acyclovir using IUPAC name (we have trials for this)
  console.log('\n📋 Test 1: Acyclovir Clinical Trials (IUPAC name)')
  console.log('-'.repeat(60))
  
  const acyclovirRefs = await retriever.retrieveDrugReferences({
    compoundName: '2-amino-9-(2-hydroxyethoxymethyl)-1H-purin-6-one',
    topK: 5,
    minSimilarity: 0.1
  })

  console.log(`Found ${acyclovirRefs.length} references:`)
  acyclovirRefs.forEach((ref, i) => {
    console.log(`\n${i + 1}. Source: ${ref.source}`)
    console.log(`   Similarity: ${(ref.similarity! * 100).toFixed(1)}%`)
    console.log(`   Content: ${ref.content.substring(0, 100)}...`)
    if (ref.metadata) {
      console.log(`   Metadata:`, JSON.stringify(ref.metadata, null, 2).substring(0, 200))
    }
  })

  // Test 2: Search without compound filter (all sources)
  console.log('\n\n📋 Test 2: General Clinical Trial Search')
  console.log('-'.repeat(60))
  
  // Direct query to see all external chunks
  const { data: allExternal } = await supabase
    .from('drug_reference_chunks')
    .select('compound_name, source, LEFT(content, 100) as preview')
    .like('source', 'external:%')
    .limit(5)

  console.log(`\nExternal chunks in database:`)
  if (allExternal) {
    allExternal.forEach((chunk: any, i) => {
      console.log(`${i + 1}. ${chunk.compound_name} (${chunk.source}): ${chunk.preview}...`)
    })
  }

  // Test 3: Try retrieval with actual compound name from DB
  if (allExternal && allExternal.length > 0) {
    const firstCompound = allExternal[0].compound_name
    console.log(`\n\n📋 Test 3: Retrieval for "${firstCompound}"`)
    console.log('-'.repeat(60))
    
    const refs = await retriever.retrieveDrugReferences({
      compoundName: firstCompound,
      topK: 3,
      minSimilarity: 0.1
    })

    console.log(`Found ${refs.length} references:`)
    refs.forEach((ref, i) => {
      console.log(`\n${i + 1}. Source: ${ref.source}`)
      console.log(`   Similarity: ${(ref.similarity! * 100).toFixed(1)}%`)
      console.log(`   Content: ${ref.content.substring(0, 150)}...`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('='.repeat(60))
}

main().catch(console.error)
