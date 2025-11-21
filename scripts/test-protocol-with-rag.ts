/**
 * Test Protocol Generation with RAG
 * 
 * Tests full document generation with RAG reference injection
 */

import { DocumentOrchestrator } from '../lib/services/document-orchestrator'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('🧪 Testing Protocol Generation with RAG')
  console.log('='.repeat(60))

  // Create service role client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const orchestrator = new DocumentOrchestrator()

  // Test generation for a single section first
  console.log('\n📝 Generating Protocol Synopsis with RAG...')
  console.log('-'.repeat(60))

  try {
    const result = await orchestrator.generateDocument({
      projectId: '00000000-0000-0000-0000-000000000021',
      documentType: 'Protocol',
      userId: '2ef23ee6-7cd1-4034-ae5c-593f4d5bd9ba',
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ Generation Complete!')
    console.log('='.repeat(60))
    
    console.log(`\n📊 Results:`)
    console.log(`   Success: ${result.success}`)
    console.log(`   Document ID: ${result.documentId}`)
    console.log(`   Sections generated: ${Object.keys(result.sections).length}`)
    console.log(`   Duration: ${result.duration_ms}ms`)
    
    if (result.validation) {
      console.log(`\n🔍 Validation:`)
      console.log(`   Passed: ${result.validation.passed}`)
      console.log(`   Issues: ${result.validation.issues.length}`)
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`)
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.section}: ${err.error}`)
      })
    }

    // Show first section content
    const firstSection = Object.keys(result.sections)[0]
    if (firstSection) {
      console.log(`\n📄 Sample Content (${firstSection}):`)
      console.log('-'.repeat(60))
      console.log(result.sections[firstSection].substring(0, 500))
      console.log('...')
    }

  } catch (error) {
    console.error('\n❌ Generation failed:', error)
    throw error
  }
}

main().catch(console.error)
