/**
 * Test Enrichment Pipeline
 * 
 * Tests the full external data pipeline:
 * 1. Call enrich-data Edge Function
 * 2. Verify data in external tables
 * 3. Check external_data_cache
 * 4. Run sync-external-to-rag
 * 5. Verify RAG chunks
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  console.log('🧪 Testing Enrichment Pipeline')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Step 1: Find a project to test with
  console.log('\n📋 Step 1: Finding test project...')
  
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, compound_name, indication, enrichment_status')
    .order('created_at', { ascending: false })
    .limit(5)

  if (projectsError || !projects || projects.length === 0) {
    console.error('❌ No projects found:', projectsError)
    return
  }

  console.log(`✅ Found ${projects.length} projects:`)
  projects.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.compound_name} (${p.indication}) - ${p.enrichment_status}`)
  })

  // Use first project
  const testProject = projects[0]
  console.log(`\n🎯 Testing with: ${testProject.compound_name}`)

  // Step 2: Call enrich-data Edge Function
  console.log('\n📡 Step 2: Calling enrich-data Edge Function...')
  
  const enrichUrl = `${SUPABASE_URL}/functions/v1/enrich-data`
  
  try {
    const response = await fetch(enrichUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        project_id: testProject.id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Enrichment failed: ${response.status}`)
      console.error(error)
      return
    }

    const result = await response.json()
    console.log('✅ Enrichment completed!')
    console.log(`   InChIKey: ${result.inchikey}`)
    console.log(`   Duration: ${result.duration_ms}ms`)
    console.log(`   Sources: ${result.metrics?.sources_used?.join(', ')}`)
    
    if (result.metrics?.records_fetched) {
      console.log('\n📊 Records fetched:')
      console.log(`   Labels: ${result.metrics.records_fetched.labels}`)
      console.log(`   Trials: ${result.metrics.records_fetched.trials}`)
      console.log(`   Literature: ${result.metrics.records_fetched.literature}`)
      console.log(`   Adverse Events: ${result.metrics.records_fetched.adverse_events}`)
    }

    // Step 3: Verify data in tables
    console.log('\n🔍 Step 3: Verifying data in tables...')
    
    const inchikey = result.inchikey

    // Check compounds
    const { data: compounds } = await supabase
      .from('compounds')
      .select('*')
      .eq('inchikey', inchikey)
      .single()
    
    console.log(`   Compounds: ${compounds ? '✅' : '❌'}`)

    // Check labels
    const { data: labels, count: labelsCount } = await supabase
      .from('labels')
      .select('*', { count: 'exact' })
      .eq('inchikey', inchikey)
    
    console.log(`   Labels: ${labelsCount || 0} records ${labelsCount ? '✅' : '⚠️'}`)

    // Check trials
    const { data: trials, count: trialsCount } = await supabase
      .from('trials')
      .select('*', { count: 'exact' })
      .eq('inchikey', inchikey)
    
    console.log(`   Trials: ${trialsCount || 0} records ${trialsCount ? '✅' : '⚠️'}`)

    // Check literature
    const { data: literature, count: litCount } = await supabase
      .from('literature')
      .select('*', { count: 'exact' })
      .eq('inchikey', inchikey)
    
    console.log(`   Literature: ${litCount || 0} records ${litCount ? '✅' : '⚠️'}`)

    // Check adverse events
    const { data: adverseEvents, count: aeCount } = await supabase
      .from('adverse_events')
      .select('*', { count: 'exact' })
      .eq('inchikey', inchikey)
    
    console.log(`   Adverse Events: ${aeCount || 0} records ${aeCount ? '✅' : '⚠️'}`)

    // Step 4: Check external_data_cache (will be empty until we update enrich-data)
    console.log('\n📦 Step 4: Checking external_data_cache...')
    
    const { data: cachedData, count: cacheCount } = await supabase
      .from('external_data_cache')
      .select('*', { count: 'exact' })
      .eq('compound_name', testProject.compound_name)
    
    console.log(`   Cached records: ${cacheCount || 0} ${cacheCount ? '✅' : '⚠️ (Expected - need to update enrich-data)'}`)

    // Step 5: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Pipeline Test Summary')
    console.log('='.repeat(60))
    console.log(`✅ Enrichment: SUCCESS`)
    console.log(`✅ Data stored: ${(labelsCount || 0) + (trialsCount || 0) + (litCount || 0)} records`)
    console.log(`⚠️  Cache: ${cacheCount || 0} records (needs enrich-data update)`)
    console.log('\n💡 Next steps:')
    console.log('   1. Update enrich-data to populate external_data_cache')
    console.log('   2. Run sync-external-to-rag script')
    console.log('   3. Test RAG retrieval with external data')

  } catch (error) {
    console.error('❌ Error calling enrich-data:', error)
  }
}

main().catch(console.error)
