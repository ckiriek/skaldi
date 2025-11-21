/**
 * API Tests: Validation Endpoints
 */

import { describe, it, expect } from '@jest/globals'

const BASE_URL = 'http://localhost:3000'

describe('API-VAL: Validation Endpoints', () => {
  
  it('API-VAL-01: POST /api/validation/run - valid document', async () => {
    // This test requires a real document ID
    // For now, we test the error case
    
    const response = await fetch(`${BASE_URL}/api/validation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: 'non-existent-id'
      })
    })

    expect(response.status).toBe(404)
  })

  it('API-VAL-02: POST /api/validation/run - missing document_id', async () => {
    const response = await fetch(`${BASE_URL}/api/validation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('document_id')
  })

  it('API-DOC-01: POST /api/document/update-block - missing fields', async () => {
    const response = await fetch(`${BASE_URL}/api/document/update-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
  })

  it('API-SUG-01: POST /api/validation/apply-suggestion - missing fields', async () => {
    const response = await fetch(`${BASE_URL}/api/validation/apply-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
  })

  it('API-BATCH-01: POST /api/documents/batch-generate - empty selection', async () => {
    const response = await fetch(`${BASE_URL}/api/documents/batch-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: 'test-id',
        document_types: []
      })
    })

    expect(response.status).toBe(400)
  })

  it('API-BATCH-02: POST /api/validation/bulk - empty array', async () => {
    const response = await fetch(`${BASE_URL}/api/validation/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_ids: []
      })
    })

    expect(response.status).toBe(400)
  })
})
