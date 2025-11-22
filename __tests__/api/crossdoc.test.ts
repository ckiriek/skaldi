/**
 * API Tests: Cross-Document Endpoints
 * Test /api/crossdoc/validate and /api/crossdoc/auto-fix
 */

import { POST as validatePOST } from '@/app/api/crossdoc/validate/route'
import { POST as autoFixPOST } from '@/app/api/crossdoc/auto-fix/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

// Mock loaders
jest.mock('@/lib/engine/crossdoc/loaders', () => ({
  loadIbForCrossDoc: jest.fn(async (id: string) => ({
    id,
    objectives: [
      { id: 'ib_obj_1', type: 'primary', description: 'To evaluate efficacy' },
    ],
    dosingInformation: [
      { dose: '10 mg', route: 'oral', frequency: 'once daily' },
    ],
  })),
  loadProtocolForCrossDoc: jest.fn(async (id: string) => ({
    id,
    objectives: [
      { id: 'prot_obj_1', type: 'primary', description: 'To evaluate efficacy' },
    ],
    endpoints: [
      { id: 'ep_1', type: 'primary', name: 'HbA1c change', description: 'Change in HbA1c', dataType: 'continuous' },
    ],
    arms: [
      { id: 'arm_1', dose: '10mg', route: 'oral', frequency: 'QD' },
    ],
  })),
  loadIcfForCrossDoc: jest.fn(async (id: string) => null),
  loadSapForCrossDoc: jest.fn(async (id: string) => ({
    id,
    primaryEndpoints: [
      { id: 'sap_ep_1', name: 'HbA1c change', description: 'Change in HbA1c' },
    ],
    statisticalTests: [
      { endpointId: 'ep_1', test: 'ANCOVA' },
    ],
  })),
  loadCsrForCrossDoc: jest.fn(async (id: string) => null),
}))

describe('POST /api/crossdoc/validate', () => {
  it('should validate documents successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/validate', {
      method: 'POST',
      body: JSON.stringify({
        ibId: 'ib_123',
        protocolId: 'prot_456',
        sapId: 'sap_789',
      }),
    })

    const response = await validatePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('issues')
    expect(data).toHaveProperty('summary')
    expect(data).toHaveProperty('byCategory')
    expect(data).toHaveProperty('metadata')
    expect(Array.isArray(data.issues)).toBe(true)
  })

  it('should require at least 2 documents', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/validate', {
      method: 'POST',
      body: JSON.stringify({
        ibId: 'ib_123',
      }),
    })

    const response = await validatePOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('At least 2 document IDs')
  })

  it('should handle validation errors gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await validatePOST(request)
    
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /api/crossdoc/auto-fix', () => {
  it('should apply auto-fixes successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/auto-fix', {
      method: 'POST',
      body: JSON.stringify({
        issueIds: ['PRIMARY_ENDPOINT_DRIFT'],
        strategy: 'align_to_protocol',
        documentIds: {
          protocolId: 'prot_456',
          sapId: 'sap_789',
        },
      }),
    })

    const response = await autoFixPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('appliedPatches')
    expect(data).toHaveProperty('updatedDocuments')
    expect(data).toHaveProperty('remainingIssues')
    expect(data).toHaveProperty('changelog')
    expect(data).toHaveProperty('summary')
  })

  it('should require issueIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/auto-fix', {
      method: 'POST',
      body: JSON.stringify({
        documentIds: {
          protocolId: 'prot_456',
        },
      }),
    })

    const response = await autoFixPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('issueIds')
  })

  it('should require documentIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/auto-fix', {
      method: 'POST',
      body: JSON.stringify({
        issueIds: ['PRIMARY_ENDPOINT_DRIFT'],
      }),
    })

    const response = await autoFixPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('documentIds')
  })

  it('should handle empty issueIds gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/crossdoc/auto-fix', {
      method: 'POST',
      body: JSON.stringify({
        issueIds: [],
        documentIds: {
          protocolId: 'prot_456',
        },
      }),
    })

    const response = await autoFixPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
  })
})

describe('Cross-Document Validation Flow', () => {
  it('should complete full validation → auto-fix → re-validation cycle', async () => {
    // Step 1: Initial validation
    const validateRequest1 = new NextRequest('http://localhost:3000/api/crossdoc/validate', {
      method: 'POST',
      body: JSON.stringify({
        protocolId: 'prot_456',
        sapId: 'sap_789',
      }),
    })

    const validateResponse1 = await validatePOST(validateRequest1)
    const validateData1 = await validateResponse1.json()

    expect(validateResponse1.status).toBe(200)
    expect(validateData1.issues).toBeDefined()

    // Step 2: Apply auto-fixes (if any auto-fixable issues)
    const autoFixableIssues = validateData1.issues.filter((issue: any) =>
      issue.suggestions?.some((s: any) => s.autoFixable)
    )

    if (autoFixableIssues.length > 0) {
      const autoFixRequest = new NextRequest('http://localhost:3000/api/crossdoc/auto-fix', {
        method: 'POST',
        body: JSON.stringify({
          issueIds: autoFixableIssues.map((i: any) => i.code),
          strategy: 'align_to_protocol',
          documentIds: {
            protocolId: 'prot_456',
            sapId: 'sap_789',
          },
        }),
      })

      const autoFixResponse = await autoFixPOST(autoFixRequest)
      const autoFixData = await autoFixResponse.json()

      expect(autoFixResponse.status).toBe(200)
      expect(autoFixData.appliedPatches).toBeDefined()
      expect(autoFixData.changelog).toBeDefined()

      // Step 3: Re-validate
      const validateRequest2 = new NextRequest('http://localhost:3000/api/crossdoc/validate', {
        method: 'POST',
        body: JSON.stringify({
          protocolId: 'prot_456',
          sapId: 'sap_789',
        }),
      })

      const validateResponse2 = await validatePOST(validateRequest2)
      const validateData2 = await validateResponse2.json()

      expect(validateResponse2.status).toBe(200)
      
      // After auto-fix, some issues should be resolved
      expect(validateData2.issues.length).toBeLessThanOrEqual(validateData1.issues.length)
    }
  })
})
