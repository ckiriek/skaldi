/**
 * Visit Normalizer Tests
 */

import { describe, it, expect } from '@jest/globals'
import { normalizeVisits, parseVisitName } from '@/lib/engine/studyflow/visit_model/visit_normalizer'

describe('Visit Normalizer', () => {
  describe('parseVisitName', () => {
    it('should parse Day patterns', () => {
      const result = parseVisitName('Day 7')
      expect(result.day).toBe(7)
      expect(result.type).toBe('treatment')
    })

    it('should parse Week patterns', () => {
      const result = parseVisitName('Week 4')
      expect(result.day).toBe(28)
      expect(result.type).toBe('treatment')
    })

    it('should parse Month patterns', () => {
      const result = parseVisitName('Month 3')
      expect(result.day).toBe(90)
      expect(result.type).toBe('treatment')
    })

    it('should parse Russian patterns', () => {
      const result = parseVisitName('День 14')
      expect(result.day).toBe(14)
      expect(result.type).toBe('treatment')
    })

    it('should detect Screening', () => {
      const result = parseVisitName('Screening')
      expect(result.type).toBe('screening')
      expect(result.day).toBe(-14)
    })

    it('should detect Baseline', () => {
      const result = parseVisitName('Baseline')
      expect(result.type).toBe('baseline')
      expect(result.day).toBe(0)
    })

    it('should detect End of Treatment', () => {
      const result = parseVisitName('End of Treatment')
      expect(result.type).toBe('end_of_treatment')
    })

    it('should detect Follow-up', () => {
      const result = parseVisitName('Follow-up')
      expect(result.type).toBe('follow_up')
    })
  })

  describe('normalizeVisits', () => {
    it('should normalize multiple visits', () => {
      const visits = ['Screening', 'Baseline', 'Week 4', 'Week 12', 'EOT']
      const result = normalizeVisits(visits)
      
      expect(result).toHaveLength(5)
      expect(result[0].type).toBe('screening')
      expect(result[1].type).toBe('baseline')
      expect(result[2].day).toBe(28)
      expect(result[3].day).toBe(84)
    })

    it('should sort visits by day', () => {
      const visits = ['Week 12', 'Baseline', 'Week 4']
      const result = normalizeVisits(visits)
      
      expect(result[0].day).toBeLessThan(result[1].day)
      expect(result[1].day).toBeLessThan(result[2].day)
    })
  })
})
