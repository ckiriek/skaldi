/**
 * E2E-01: Full Cycle Test
 * 
 * Tests complete workflow:
 * Generate → Enrich → Validate → Fix → Revalidate → Export
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { DocumentStore } from '@/engine/document_store'
import { ValidationEngine } from '@/engine/validation'
import { allRules } from '@/engine/validation/rules'
import { SuggestionEngine } from '@/engine/suggestions'
import { AuditLogger } from '@/engine/audit'

describe('E2E-01: Full Document Lifecycle', () => {
  let supabase: any
  let projectId: string
  let documentId: string

  beforeAll(async () => {
    // Setup test environment
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create test project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        compound_name: 'Test Compound E2E',
        drug_class: 'Test Class',
        indication: 'Test Indication',
        phase: 'Phase 2'
      })
      .select()
      .single()

    if (error) throw error
    projectId = project.id

    console.log('✅ Test project created:', projectId)
  })

  afterAll(async () => {
    // Cleanup
    if (projectId) {
      await supabase.from('projects').delete().eq('id', projectId)
      console.log('🧹 Test project cleaned up')
    }
  })

  it('Step 1: Generate Document', async () => {
    console.log('📝 Step 1: Generating document...')

    const response = await fetch('http://localhost:3000/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        document_type: 'IB'
      })
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    documentId = data.document_id

    expect(documentId).toBeDefined()
    console.log('✅ Document generated:', documentId)
  }, 60000)

  it('Step 2: Enrich Data', async () => {
    console.log('🔬 Step 2: Enriching data...')

    const response = await fetch('http://localhost:3000/api/enrich-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId
      })
    })

    expect(response.ok).toBe(true)

    // Wait for enrichment to complete
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 30

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      status = (project as any).enrichment_status || 'PENDING'
      attempts++
      
      console.log(`   Status: ${status} (${attempts}/${maxAttempts})`)
    }

    expect(status).toBe('COMPLETED')
    console.log('✅ Enrichment completed')
  }, 120000)

  it('Step 3: Run Validation', async () => {
    console.log('🔍 Step 3: Running validation...')

    const store = new DocumentStore(supabase)
    const document = await store.loadDocument(documentId)

    expect(document).toBeDefined()
    expect(document?.sections.length).toBeGreaterThan(0)

    const engine = new ValidationEngine()
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    const result = await engine.runValidation(document!)

    expect(result).toBeDefined()
    expect(result.issues.length).toBeGreaterThan(0)

    console.log(`✅ Validation complete:`)
    console.log(`   Errors: ${result.errors}`)
    console.log(`   Warnings: ${result.warnings}`)
    console.log(`   Total issues: ${result.issues.length}`)

    // Store for next step
    ;(global as any).validationResult = result
  }, 30000)

  it('Step 4: Apply Suggestion', async () => {
    console.log('💡 Step 4: Applying suggestion...')

    const result = (global as any).validationResult
    expect(result).toBeDefined()

    // Find first issue with location
    const issue = result.issues.find((i: any) => i.locations.length > 0)
    expect(issue).toBeDefined()

    const location = issue.locations[0]
    const store = new DocumentStore(supabase)
    const document = await store.loadDocument(documentId)
    
    const block = document?.sections
      .find(s => s.section_id === location.section_id)
      ?.blocks.find(b => b.block_id === location.block_id)

    expect(block).toBeDefined()

    // Generate suggestion
    const suggestionEngine = new SuggestionEngine({
      azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      azureKey: process.env.AZURE_OPENAI_API_KEY!
    })

    const suggestions = await suggestionEngine.generateSuggestions(
      issue,
      document!,
      block!
    )

    expect(suggestions.length).toBeGreaterThan(0)

    const suggestion = suggestions[0]
    console.log(`   Suggestion: ${suggestion.description}`)

    // Apply suggestion
    const updateResult = await store.updateBlock({
      document_id: documentId,
      block_id: block!.block_id,
      new_text: suggestion.suggested_text
    })

    expect(updateResult).toBeDefined()

    // Check audit log
    const audit = new AuditLogger(supabase)
    await audit.logSuggestionApplied(
      documentId,
      suggestion.suggestion_id,
      block!.block_id
    )

    console.log('✅ Suggestion applied and logged')
  }, 60000)

  it('Step 5: Revalidate', async () => {
    console.log('🔄 Step 5: Revalidating...')

    const store = new DocumentStore(supabase)
    const document = await store.loadDocument(documentId)

    const engine = new ValidationEngine()
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    const result = await engine.runValidation(document!)

    console.log(`✅ Revalidation complete:`)
    console.log(`   Errors: ${result.errors}`)
    console.log(`   Warnings: ${result.warnings}`)

    // Errors should be less than before
    const previousResult = (global as any).validationResult
    expect(result.errors).toBeLessThanOrEqual(previousResult.errors)
  }, 30000)

  it('Step 6: Export DOCX', async () => {
    console.log('📄 Step 6: Exporting DOCX...')

    const response = await fetch(`http://localhost:3000/api/documents/${documentId}/export/docx`)

    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('wordprocessingml')

    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)

    console.log(`✅ DOCX exported: ${buffer.byteLength} bytes`)
  }, 30000)

  it('Step 7: Export PDF', async () => {
    console.log('📕 Step 7: Exporting PDF...')

    const response = await fetch(`http://localhost:3000/api/documents/${documentId}/export/pdf`)

    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('pdf')

    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)

    console.log(`✅ PDF exported: ${buffer.byteLength} bytes`)
  }, 30000)
})
