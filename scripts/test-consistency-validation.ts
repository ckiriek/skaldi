/**
 * Test Consistency Validation
 * 
 * Tests the ConsistencyValidator service
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import { ConsistencyValidator } from '../lib/services/consistency-validator'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  console.log('🧪 Testing Consistency Validation')
  console.log('='.repeat(60))

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const validator = new ConsistencyValidator(supabase)

  // Find a test document
  console.log('\n📋 Step 1: Finding test document...')
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, type, project_id')
    .eq('type', 'Protocol')
    .limit(1)

  if (docsError || !documents || documents.length === 0) {
    console.log('❌ No protocol documents found')
    console.log('Creating test document with sections...')
    
    // Create test document
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single()

    if (!project) {
      console.log('❌ No projects found. Please create a project first.')
      return
    }

    const { data: doc, error: createError } = await supabase
      .from('documents')
      .insert({
        project_id: project.id,
        type: 'Protocol',
        version: 1,
        status: 'draft'
      })
      .select()
      .single()

    if (createError || !doc) {
      console.error('❌ Failed to create document:', createError)
      return
    }

    console.log(`✅ Created test document: ${doc.id}`)

    // Create test sections with consistency issues
    const sections = [
      {
        document_id: doc.id,
        section_name: 'study_design',
        order_index: 1,
        content: `This is a randomized, double-blind, placebo-controlled study with 3 arms.
        
Treatment groups:
- Placebo
- Low Dose (10mg daily)
- High Dose (20mg daily)

Total sample size: N=300 (100 per arm)

Study population: Adults aged 18-65 years`
      },
      {
        document_id: doc.id,
        section_name: 'treatments',
        order_index: 2,
        content: `Study Drug Administration:

Active treatment: 10mg or 20mg administered orally once daily

Placebo: Matching placebo administered orally once daily

Duration: 12 weeks`
      },
      {
        document_id: doc.id,
        section_name: 'statistics',
        order_index: 3,
        content: `Statistical Analysis Plan:

Sample size: N=300 subjects (100 per treatment arm)

Primary analysis will compare the 3 treatment groups using ANOVA.

Dosing: 10mg and 20mg groups vs placebo

Power: 90% to detect a difference with alpha=0.05`
      },
      {
        document_id: doc.id,
        section_name: 'objectives',
        order_index: 4,
        content: `Study Objectives:

Primary Objective:
To evaluate the efficacy of the study drug compared to placebo

Primary Endpoint:
Change from baseline in disease severity score at Week 12`
      },
      {
        document_id: doc.id,
        section_name: 'endpoints',
        order_index: 5,
        content: `Study Endpoints:

Primary Endpoint:
- Change from baseline in disease severity score at Week 12

Secondary Endpoints:
- Response rate at Week 12
- Time to response
- Quality of life assessment`
      }
    ]

    const { error: sectionsError } = await supabase
      .from('document_sections')
      .insert(sections)

    if (sectionsError) {
      console.error('❌ Failed to create sections:', sectionsError)
      return
    }

    console.log(`✅ Created ${sections.length} test sections`)
    
    // Use this document for testing
    documents[0] = doc
  }

  const testDoc = documents[0]
  console.log(`✅ Using document: ${testDoc.id} (${testDoc.type})`)

  // Run validation
  console.log('\n🔍 Step 2: Running consistency validation...')
  const report = await validator.validate(testDoc.id)

  console.log('\n📊 Validation Report:')
  console.log('-'.repeat(60))
  console.log(`Document: ${report.document_id}`)
  console.log(`Type: ${report.document_type}`)
  console.log(`Total Checks: ${report.total_checks}`)
  console.log(`Passed: ${report.passed} ✅`)
  console.log(`Failed: ${report.failed} ❌`)
  console.log(`Warnings: ${report.warnings} ⚠️`)

  console.log('\n📋 Detailed Checks:')
  console.log('-'.repeat(60))
  
  report.checks.forEach((check, i) => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
    console.log(`\n${i + 1}. ${icon} ${check.type.toUpperCase()} [${check.severity}]`)
    console.log(`   Status: ${check.status}`)
    console.log(`   Message: ${check.message}`)
    console.log(`   Sections: ${check.sections.join(', ')}`)
    if (check.expected) {
      console.log(`   Expected: ${check.expected}`)
    }
    if (check.actual) {
      console.log(`   Actual: ${check.actual}`)
    }
  })

  // Store report
  console.log('\n💾 Step 3: Storing validation report...')
  await validator.storeReport(report)

  // Verify storage
  const { data: stored, error: fetchError } = await supabase
    .from('consistency_validations')
    .select('*')
    .eq('document_id', testDoc.id)

  if (fetchError) {
    console.error('❌ Failed to fetch stored validations:', fetchError)
  } else {
    console.log(`✅ Verified: ${stored?.length} validation records stored`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Consistency Validation Test Complete!')
  console.log('='.repeat(60))
}

main().catch(console.error)
