/**
 * Sync Templates Script
 * 
 * Syncs JSON templates from templates_en/ directory to document_templates table in Supabase.
 * 
 * Usage:
 *   npx tsx scripts/sync-templates.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface TemplateFile {
  documentType: string
  sectionId: string
  filePath: string
  content: any
}

/**
 * Recursively find all JSON files in templates_en/
 */
function findTemplateFiles(dir: string, documentType: string = ''): TemplateFile[] {
  const templates: TemplateFile[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Directory name is the document type (e.g., 'protocol', 'ib')
      const docType = entry.name
      templates.push(...findTemplateFiles(fullPath, docType))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      // File name (without .json) is the section ID
      const sectionId = entry.name.replace('.json', '')
      
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
        templates.push({
          documentType,
          sectionId: `${documentType}_${sectionId}`,
          filePath: fullPath,
          content,
        })
      } catch (error) {
        console.error(`❌ Error parsing ${fullPath}:`, error)
      }
    }
  }

  return templates
}

/**
 * Extract placeholders from prompt text
 */
function extractPlaceholders(promptText: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const placeholders: string[] = []
  let match

  while ((match = regex.exec(promptText)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1])
    }
  }

  return placeholders
}

/**
 * Sync a single template to the database
 */
async function syncTemplate(template: TemplateFile): Promise<boolean> {
  const { documentType, sectionId, content } = template

  // Extract data from template JSON
  const promptText = content.prompt_text || ''
  const constraints = content.constraints || []
  const expectedInputs = content.expected_inputs || []
  const placeholders = extractPlaceholders(promptText)

  console.log(`  📄 ${sectionId}`)

  try {
    // Check if template already exists
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id, version')
      .eq('document_type_id', documentType)
      .eq('section_id', sectionId)
      .eq('is_active', true)
      .single()

    if (existing) {
      // Update existing template (increment version)
      const { error } = await supabase
        .from('document_templates')
        .update({
          prompt_text: promptText,
          constraints: constraints,
          expected_inputs: expectedInputs,
          placeholders: placeholders,
          version: existing.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`    ❌ Update failed:`, error.message)
        return false
      }

      console.log(`    ✅ Updated (v${existing.version + 1})`)
    } else {
      // Insert new template
      const { error } = await supabase
        .from('document_templates')
        .insert({
          document_type_id: documentType,
          section_id: sectionId,
          prompt_text: promptText,
          constraints: constraints,
          expected_inputs: expectedInputs,
          placeholders: placeholders,
          version: 1,
          is_active: true,
        })

      if (error) {
        console.error(`    ❌ Insert failed:`, error.message)
        return false
      }

      console.log(`    ✅ Created (v1)`)
    }

    return true
  } catch (error) {
    console.error(`    ❌ Error:`, error)
    return false
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('🔄 Starting template sync...\n')

  const templatesDir = path.join(process.cwd(), 'templates_en')

  if (!fs.existsSync(templatesDir)) {
    console.error(`❌ Templates directory not found: ${templatesDir}`)
    process.exit(1)
  }

  // Find all template files
  console.log('📂 Scanning templates_en/ directory...')
  const templates = findTemplateFiles(templatesDir)
  console.log(`   Found ${templates.length} templates\n`)

  // Group by document type
  const byType = templates.reduce((acc, t) => {
    if (!acc[t.documentType]) acc[t.documentType] = []
    acc[t.documentType].push(t)
    return acc
  }, {} as Record<string, TemplateFile[]>)

  let totalSuccess = 0
  let totalFailed = 0

  // Sync each document type
  for (const [docType, typeTemplates] of Object.entries(byType)) {
    console.log(`\n📋 ${docType.toUpperCase()} (${typeTemplates.length} templates)`)

    for (const template of typeTemplates) {
      const success = await syncTemplate(template)
      if (success) {
        totalSuccess++
      } else {
        totalFailed++
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successfully synced: ${totalSuccess}`)
  console.log(`❌ Failed: ${totalFailed}`)
  console.log(`📊 Total: ${templates.length}`)
  console.log('='.repeat(60))

  if (totalFailed > 0) {
    process.exit(1)
  }
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
