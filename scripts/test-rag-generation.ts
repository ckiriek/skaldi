/**
 * Test RAG-Powered Section Generation
 * 
 * Tests the generate-section Edge Function with RAG enabled
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  console.log('🧪 Testing RAG-Powered Section Generation')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Test 1: Disease Background with RAG
  console.log('\n📋 Test 1: Disease Background (with RAG)')
  console.log('-'.repeat(60))

  // Load template
  const templatePath = 'templates_en/protocol/disease_background.json'
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'))

  console.log(`Template: ${template.display_name}`)
  console.log(`RAG Queries: ${template.rag_queries.length}`)

  // Prepare RAG queries
  const ragQueries = template.rag_queries.map((q: any) => ({
    type: q.type,
    query: q.query_template.replace('{{disease_name}}', 'Herpes Simplex'),
    maxChunks: q.max_chunks,
    minSimilarity: q.min_similarity
  }))

  // Prepare prompt with placeholder
  const prompt = template.prompt_template
    .replace(/\{\{disease_name\}\}/g, 'Herpes Simplex')
    .replace(/\{\{indication\}\}/g, 'Herpes Simplex Virus Infection')
    .replace(/\{\{target_population\}\}/g, 'Adults with recurrent HSV')

  console.log('\n🔄 Calling generate-section with RAG...')

  const startTime = Date.now()

  const { data, error } = await supabase.functions.invoke('generate-section', {
    body: {
      prompt,
      sectionId: 'disease_background',
      documentType: 'protocol',
      useRag: true,
      ragQueries,
      diseaseName: 'Herpes Simplex',
      maxTokens: 1500,
      temperature: 0.7
    }
  })

  const duration = Date.now() - startTime

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`\n✅ Generation completed in ${duration}ms`)
  console.log(`📊 Tokens used: ${data.usage?.totalTokens || 'N/A'}`)
  console.log(`📝 Content length: ${data.content?.length || 0} characters`)
  console.log(`📝 Word count: ${data.content?.split(/\s+/).length || 0} words`)

  console.log('\n📄 Generated Content:')
  console.log('-'.repeat(60))
  console.log(data.content)
  console.log('-'.repeat(60))

  // Test 2: Mechanism of Action with RAG
  console.log('\n\n📋 Test 2: Mechanism of Action (with RAG)')
  console.log('-'.repeat(60))

  const moaTemplatePath = 'templates_en/ib/mechanism_of_action.json'
  const moaTemplate = JSON.parse(fs.readFileSync(moaTemplatePath, 'utf-8'))

  const moaRagQueries = moaTemplate.rag_queries.map((q: any) => ({
    type: q.type,
    query: q.query_template.replace('{{compound_name}}', 'acyclovir'),
    maxChunks: q.max_chunks || 4
  }))

  const moaPrompt = moaTemplate.prompt_template
    .replace(/\{\{compound_name\}\}/g, 'acyclovir')
    .replace(/\{\{drug_class\}\}/g, 'antiviral nucleoside analog')
    .replace(/\{\{indication\}\}/g, 'Herpes Simplex Virus Infection')

  console.log('\n🔄 Calling generate-section with RAG...')

  const moaStartTime = Date.now()

  const { data: moaData, error: moaError } = await supabase.functions.invoke('generate-section', {
    body: {
      prompt: moaPrompt,
      sectionId: 'mechanism_of_action',
      documentType: 'ib',
      useRag: true,
      ragQueries: moaRagQueries,
      compoundName: '2-amino-9-(2-hydroxyethoxymethyl)-1H-purin-6-one', // IUPAC name for acyclovir
      maxTokens: 1000,
      temperature: 0.7
    }
  })

  const moaDuration = Date.now() - moaStartTime

  if (moaError) {
    console.error('❌ Error:', moaError)
    return
  }

  console.log(`\n✅ Generation completed in ${moaDuration}ms`)
  console.log(`📊 Tokens used: ${moaData.usage?.totalTokens || 'N/A'}`)
  console.log(`📝 Content length: ${moaData.content?.length || 0} characters`)
  console.log(`📝 Word count: ${moaData.content?.split(/\s+/).length || 0} words`)

  console.log('\n📄 Generated Content:')
  console.log('-'.repeat(60))
  console.log(moaData.content)
  console.log('-'.repeat(60))

  // Test 3: Generation WITHOUT RAG (baseline)
  console.log('\n\n📋 Test 3: Disease Background (WITHOUT RAG - baseline)')
  console.log('-'.repeat(60))

  const baselinePrompt = `Write a Disease Background section for Herpes Simplex Virus Infection.

Include:
1. Definition and classification
2. Pathophysiology
3. Clinical presentation
4. Epidemiology
5. Clinical significance

Style: Formal, scientific, regulatory-appropriate. 500-800 words.`

  console.log('\n🔄 Calling generate-section WITHOUT RAG...')

  const baselineStartTime = Date.now()

  const { data: baselineData, error: baselineError } = await supabase.functions.invoke('generate-section', {
    body: {
      prompt: baselinePrompt,
      sectionId: 'disease_background',
      documentType: 'protocol',
      useRag: false,
      maxTokens: 1500,
      temperature: 0.7
    }
  })

  const baselineDuration = Date.now() - baselineStartTime

  if (baselineError) {
    console.error('❌ Error:', baselineError)
    return
  }

  console.log(`\n✅ Generation completed in ${baselineDuration}ms`)
  console.log(`📊 Tokens used: ${baselineData.usage?.totalTokens || 'N/A'}`)
  console.log(`📝 Content length: ${baselineData.content?.length || 0} characters`)
  console.log(`📝 Word count: ${baselineData.content?.split(/\s+/).length || 0} words`)

  console.log('\n📄 Generated Content:')
  console.log('-'.repeat(60))
  console.log(baselineData.content)
  console.log('-'.repeat(60))

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  console.log(`\nTest 1 (Disease Background WITH RAG):`)
  console.log(`  Duration: ${duration}ms`)
  console.log(`  Tokens: ${data.usage?.totalTokens || 'N/A'}`)
  console.log(`  Words: ${data.content?.split(/\s+/).length || 0}`)
  
  console.log(`\nTest 2 (Mechanism of Action WITH RAG):`)
  console.log(`  Duration: ${moaDuration}ms`)
  console.log(`  Tokens: ${moaData.usage?.totalTokens || 'N/A'}`)
  console.log(`  Words: ${moaData.content?.split(/\s+/).length || 0}`)
  
  console.log(`\nTest 3 (Disease Background WITHOUT RAG):`)
  console.log(`  Duration: ${baselineDuration}ms`)
  console.log(`  Tokens: ${baselineData.usage?.totalTokens || 'N/A'}`)
  console.log(`  Words: ${baselineData.content?.split(/\s+/).length || 0}`)

  console.log('\n✅ All tests completed!')
  console.log('='.repeat(60))
}

main().catch(console.error)
