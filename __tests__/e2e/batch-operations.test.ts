/**
 * E2E-02: Batch Operations Test
 * 
 * Tests batch generation, validation, and export
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('E2E-02: Batch Operations', () => {
  let supabase: any
  let projectId: string
  let documentIds: string[] = []

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: project } = await supabase
      .from('projects')
      .insert({
        compound_name: 'Batch Test Compound',
        drug_class: 'Test Class',
        indication: 'Test Indication',
        phase: 'Phase 2'
      })
      .select()
      .single()

    projectId = project.id
    console.log('✅ Test project created:', projectId)
  })

  afterAll(async () => {
    if (projectId) {
      await supabase.from('projects').delete().eq('id', projectId)
      console.log('🧹 Cleanup complete')
    }
  })

  it('Batch Generate 3 Documents', async () => {
    console.log('📦 Batch generating 3 documents...')

    const response = await fetch('http://localhost:3000/api/documents/batch-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        document_types: ['Protocol', 'IB', 'Synopsis'],
        options: {
          parallel: true,
          max_concurrent: 3
        }
      })
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.result.successful).toBe(3)
    expect(data.result.failed).toBe(0)

    // Store document IDs
    documentIds = data.result.documents
      .filter((d: any) => d.status === 'success')
      .map((d: any) => d.document_id)

    expect(documentIds.length).toBe(3)

    console.log(`✅ Batch generation complete:`)
    console.log(`   Successful: ${data.result.successful}`)
    console.log(`   Duration: ${data.result.total_duration_ms}ms`)
  }, 180000)

  it('Bulk Validate All Documents', async () => {
    console.log('🔍 Bulk validating...')

    const response = await fetch('http://localhost:3000/api/validation/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_ids: documentIds
      })
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.summary.total).toBe(3)
    expect(data.summary.successful).toBe(3)

    console.log(`✅ Bulk validation complete:`)
    console.log(`   Total errors: ${data.summary.total_errors}`)
    console.log(`   Total warnings: ${data.summary.total_warnings}`)
  }, 60000)

  it('Batch Export as ZIP', async () => {
    console.log('📦 Batch exporting...')

    const response = await fetch('http://localhost:3000/api/documents/batch-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_ids: documentIds,
        format: 'both'
      })
    })

    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('zip')

    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)

    console.log(`✅ ZIP exported: ${buffer.byteLength} bytes`)
  }, 60000)
})
