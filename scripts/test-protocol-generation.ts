/**
 * Test Protocol Generation
 * 
 * Tests the full generation pipeline:
 * 1. DocumentOrchestrator
 * 2. SectionGenerator
 * 3. Edge Function (generate-section)
 * 4. QCValidator
 * 
 * Usage:
 *   npx tsx scripts/test-protocol-generation.ts <projectId>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

// Mock createClient for server context
// This is a workaround since DocumentOrchestrator uses lib/supabase/server
// which requires Next.js request context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Create a standalone Supabase client for testing
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const projectId = process.argv[2]

  if (!projectId) {
    console.error('❌ Usage: npx tsx scripts/test-protocol-generation.ts <projectId>')
    console.error('   Example: npx tsx scripts/test-protocol-generation.ts 123e4567-e89b-12d3-a456-426614174000')
    process.exit(1)
  }

  console.log('🧪 Testing Protocol Generation')
  console.log('=' .repeat(60))
  console.log(`📋 Project ID: ${projectId}`)
  console.log(`📄 Document Type: Protocol`)
  console.log('=' .repeat(60))
  console.log('')

  const orchestrator = new DocumentOrchestrator()

  try {
    const startTime = Date.now()

    console.log('🚀 Starting generation...\n')

    const result = await orchestrator.generateDocument({
      projectId,
      documentType: 'Protocol',
      userId: 'test-user', // Placeholder for testing
    })

    const duration = Date.now() - startTime

    console.log('\n' + '='.repeat(60))
    console.log('📊 GENERATION RESULTS')
    console.log('='.repeat(60))

    if (result.success) {
      console.log('✅ Status: SUCCESS')
      console.log(`📄 Document ID: ${result.documentId}`)
      console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`)
      console.log(`📝 Sections Generated: ${Object.keys(result.sections).length}`)
      
      console.log('\n📋 Sections:')
      for (const [sectionId, content] of Object.entries(result.sections)) {
        const preview = content.substring(0, 100).replace(/\n/g, ' ')
        console.log(`  • ${sectionId}: ${preview}...`)
      }

      if (result.validation) {
        console.log('\n🔍 QC VALIDATION RESULTS')
        console.log('='.repeat(60))
        console.log(`Status: ${result.validation.passed ? '✅ PASSED' : '❌ FAILED'}`)
        console.log(`Issues: ${result.validation.issues.length}`)
        
        if (result.validation.issues.length > 0) {
          console.log('\nIssues:')
          for (const issue of result.validation.issues) {
            const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
            console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`)
            if (issue.section_id) {
              console.log(`     Section: ${issue.section_id}`)
            }
          }
        }
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  GENERATION ERRORS')
        console.log('='.repeat(60))
        for (const error of result.errors) {
          console.log(`  ❌ ${error.section}: ${error.error}`)
        }
      }

    } else {
      console.log('❌ Status: FAILED')
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n❌ ERRORS')
        console.log('='.repeat(60))
        for (const error of result.errors) {
          console.log(`  • ${error.section}: ${error.error}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1)

  } catch (error) {
    console.error('\n❌ FATAL ERROR')
    console.error('='.repeat(60))
    console.error(error)
    console.error('='.repeat(60))
    process.exit(1)
  }
}

main()
