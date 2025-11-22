/**
 * Study Flow API Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Study Flow API', () => {
  const testProtocolId = 'test_protocol_123'
  let generatedFlowId: string

  describe('POST /api/studyflow/generate', () => {
    it('should generate study flow from protocol', async () => {
      const response = await fetch('http://localhost:3000/api/studyflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId: testProtocolId,
          endpoints: [
            {
              id: 'ep_1',
              name: 'Change in HbA1c from baseline',
              type: 'primary',
            },
          ],
          visitSchedule: ['Screening', 'Baseline', 'Week 4', 'Week 12', 'EOT'],
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.studyFlow).toBeDefined()
      expect(data.studyFlow.visits).toHaveLength(5)
      expect(data.summary.totalVisits).toBe(5)
      
      generatedFlowId = data.studyFlow.id
    })

    it('should return 400 for missing protocol ID', async () => {
      const response = await fetch('http://localhost:3000/api/studyflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/studyflow/validate', () => {
    it('should validate study flow', async () => {
      if (!generatedFlowId) {
        console.log('Skipping: no generated flow')
        return
      }

      const response = await fetch('http://localhost:3000/api/studyflow/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyFlowId: generatedFlowId,
          protocolId: testProtocolId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.result).toBeDefined()
      expect(data.result.summary).toBeDefined()
    })

    it('should return 400 for missing study flow ID', async () => {
      const response = await fetch('http://localhost:3000/api/studyflow/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/studyflow/auto-fix', () => {
    it('should apply auto-fixes', async () => {
      if (!generatedFlowId) {
        console.log('Skipping: no generated flow')
        return
      }

      const response = await fetch('http://localhost:3000/api/studyflow/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyFlowId: generatedFlowId,
          issueIds: ['MISSING_BASELINE'],
          strategy: 'balanced',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.result).toBeDefined()
    })

    it('should return 400 for missing issue IDs', async () => {
      const response = await fetch('http://localhost:3000/api/studyflow/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyFlowId: generatedFlowId,
          issueIds: [],
        }),
      })

      expect(response.status).toBe(400)
    })
  })
})
