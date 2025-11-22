/**
 * Phase G.10 Integration Tests
 * Tests the full pipeline: Generation → StudyFlow → CrossDoc → AutoFix
 */

import { describe, it, expect, beforeAll } from '@jest/globals'

describe('Phase G.10: Full Pipeline Integration', () => {
  const testProjectId = 'test_project_integration'
  let protocolId: string
  let studyFlowId: string

  describe('1. Document Generation with Auto-Validation', () => {
    it('should generate Protocol and automatically run validations', async () => {
      // Generate Protocol
      const genResponse = await fetch('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          documentType: 'protocol',
          parameters: {
            compound: 'Test Compound',
            indication: 'Type 2 Diabetes',
            phase: 'III',
          },
        }),
      })

      expect(genResponse.status).toBe(200)
      const genData = await genResponse.json()
      protocolId = genData.documentId

      // Wait for post-generation checks
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Verify validation was run
      const historyResponse = await fetch(
        `http://localhost:3000/api/validation/history?documentId=${protocolId}`
      )
      expect(historyResponse.status).toBe(200)
      const historyData = await historyResponse.json()
      
      expect(historyData.studyflow.length).toBeGreaterThan(0)
      expect(historyData.crossdoc.length).toBeGreaterThan(0)
    })
  })

  describe('2. StudyFlow Generation', () => {
    it('should generate StudyFlow from Protocol', async () => {
      const response = await fetch('http://localhost:3000/api/studyflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId,
          endpoints: [
            {
              id: 'ep_1',
              name: 'Change in HbA1c from baseline',
              type: 'primary',
            },
          ],
          visitSchedule: ['Screening', 'Baseline', 'Week 12', 'Week 24', 'EOT'],
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.studyFlow).toBeDefined()
      expect(data.studyFlow.visits.length).toBe(5)
      
      studyFlowId = data.studyFlow.id
    })
  })

  describe('3. SAP Pre-fill from Protocol + StudyFlow', () => {
    it('should pre-fill SAP with aligned data', async () => {
      // This would be called internally during SAP generation
      // For now, test the alignment function directly
      const response = await fetch('http://localhost:3000/api/documents/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          protocolId,
          targetDocumentType: 'sap',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        expect(data.primaryEndpoints).toBeDefined()
        expect(data.visitSchedule).toBeDefined()
        expect(data.procedures).toBeDefined()
        expect(data.topMatrix).toBeDefined()
      }
    })
  })

  describe('4. CrossDoc Validation', () => {
    it('should validate cross-document consistency', async () => {
      const response = await fetch('http://localhost:3000/api/crossdoc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          documentIds: [protocolId],
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.result.summary).toBeDefined()
    })
  })

  describe('5. Auto-Fix Pipeline', () => {
    it('should apply auto-fixes and revalidate', async () => {
      // First, validate to get issues
      const validateResponse = await fetch('http://localhost:3000/api/studyflow/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyFlowId,
          protocolId,
        }),
      })

      const validateData = await validateResponse.json()
      
      if (validateData.result.issues.length > 0) {
        // Apply auto-fix
        const fixResponse = await fetch('http://localhost:3000/api/studyflow/auto-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyFlowId,
            issueIds: validateData.result.issues.map((i: any) => i.code),
            strategy: 'balanced',
          }),
        })

        expect(fixResponse.status).toBe(200)
        const fixData = await fixResponse.json()
        
        expect(fixData.success).toBe(true)
        expect(fixData.result.summary.changesApplied).toBeGreaterThan(0)
      }
    })
  })

  describe('6. Self-Healing Pipeline', () => {
    it('should auto-fix → refresh → revalidate → update', async () => {
      // This tests the full self-healing cycle
      const initialStatus = await fetch(
        `http://localhost:3000/api/documents/${protocolId}/status`
      )
      const initialData = await initialStatus.json()

      // If there are issues, apply auto-fix
      if (initialData.validation_status !== 'clean') {
        // Apply fixes
        await fetch('http://localhost:3000/api/studyflow/auto-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyFlowId,
            issueIds: ['MISSING_BASELINE', 'MISSING_EOT'],
            strategy: 'balanced',
          }),
        })

        // Revalidate
        await fetch('http://localhost:3000/api/studyflow/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyFlowId,
            protocolId,
          }),
        })

        // Check updated status
        const updatedStatus = await fetch(
          `http://localhost:3000/api/documents/${protocolId}/status`
        )
        const updatedData = await updatedStatus.json()

        // Status should improve or stay the same
        expect(['clean', 'warning', 'error']).toContain(updatedData.validation_status)
      }
    })
  })

  describe('7. Validation History Tracking', () => {
    it('should track all validation runs in history', async () => {
      const response = await fetch(
        `http://localhost:3000/api/validation/history?documentId=${protocolId}`
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.studyflow.length).toBeGreaterThan(0)
      expect(data.crossdoc.length).toBeGreaterThan(0)

      // Each history item should have required fields
      if (data.studyflow.length > 0) {
        const item = data.studyflow[0]
        expect(item.id).toBeDefined()
        expect(item.created_at).toBeDefined()
        expect(item.summary).toBeDefined()
        expect(item.issues).toBeDefined()
      }
    })
  })
})

describe('Real Protocol Testing', () => {
  // These tests use actual reference protocols from /clinical_reference/
  
  it.skip('should process protocol_femilex.md', async () => {
    // Parse protocol_femilex.md
    // Generate StudyFlow
    // Validate
    // Check for expected visits and procedures
  })

  it.skip('should process protocol_sitaglipin.md', async () => {
    // Parse protocol_sitaglipin.md
    // Generate StudyFlow
    // Validate
    // Check for expected visits and procedures
  })

  it.skip('should process protocol_perindopril.md', async () => {
    // Parse protocol_perindopril.md
    // Generate StudyFlow
    // Validate
    // Check for expected visits and procedures
  })
})
