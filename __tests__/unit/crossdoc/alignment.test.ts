/**
 * Unit Tests: Cross-Document Alignment
 * Test alignment modules (objectives, endpoints, doses)
 */

import {
  jaccardSimilarity,
  cosineSimilarity,
  levenshteinSimilarity,
  combinedSimilarity,
  areSimilar,
  findBestMatch,
} from '@/lib/engine/crossdoc/alignment/similarity'

import { mapObjectives } from '@/lib/engine/crossdoc/alignment/objectives_map'
import { mapEndpoints } from '@/lib/engine/crossdoc/alignment/endpoints_map'
import { mapDoses } from '@/lib/engine/crossdoc/alignment/dose_map'

describe('Text Similarity', () => {
  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const score = jaccardSimilarity('test string', 'test string')
      expect(score).toBe(1.0)
    })

    it('should return 0.0 for completely different strings', () => {
      const score = jaccardSimilarity('abc', 'xyz')
      expect(score).toBe(0.0)
    })

    it('should return partial similarity for overlapping strings', () => {
      const score = jaccardSimilarity('hello world', 'hello there')
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(1)
    })
  })

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const score = cosineSimilarity('test string', 'test string')
      expect(score).toBe(1.0)
    })

    it('should return 0.0 for completely different strings', () => {
      const score = cosineSimilarity('abc', 'xyz')
      expect(score).toBe(0.0)
    })
  })

  describe('levenshteinSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const score = levenshteinSimilarity('test', 'test')
      expect(score).toBe(1.0)
    })

    it('should return 0.0 for completely different strings', () => {
      const score = levenshteinSimilarity('abc', 'xyz')
      expect(score).toBe(0.0)
    })

    it('should handle single character differences', () => {
      const score = levenshteinSimilarity('test', 'text')
      expect(score).toBeGreaterThan(0.5)
    })
  })

  describe('combinedSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const score = combinedSimilarity('test string', 'test string')
      expect(score).toBe(1.0)
    })

    it('should combine multiple similarity metrics', () => {
      const score = combinedSimilarity('hello world', 'hello there')
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(1)
    })
  })

  describe('areSimilar', () => {
    it('should return true for highly similar strings', () => {
      expect(areSimilar('test string', 'test string')).toBe(true)
      expect(areSimilar('hello world', 'hello world!')).toBe(true)
    })

    it('should return false for dissimilar strings', () => {
      expect(areSimilar('abc', 'xyz')).toBe(false)
    })

    it('should respect custom threshold', () => {
      expect(areSimilar('hello', 'hallo', 0.9)).toBe(false)
      expect(areSimilar('hello', 'hallo', 0.6)).toBe(true)
    })
  })

  describe('findBestMatch', () => {
    const candidates = [
      { id: '1', text: 'primary endpoint' },
      { id: '2', text: 'secondary endpoint' },
      { id: '3', text: 'exploratory endpoint' },
    ]

    it('should find exact match', () => {
      const match = findBestMatch('primary endpoint', candidates, 'text')
      expect(match).toBeDefined()
      expect(match?.id).toBe('1')
      expect(match?.score).toBe(1.0)
    })

    it('should find best partial match', () => {
      const match = findBestMatch('primary outcome', candidates, 'text')
      expect(match).toBeDefined()
      expect(match?.id).toBe('1')
      expect(match?.score).toBeGreaterThan(0.5)
    })

    it('should return null if no match above threshold', () => {
      const match = findBestMatch('completely different', candidates, 'text', 0.8)
      expect(match).toBeNull()
    })
  })
})

describe('Objectives Mapping', () => {
  const mockIb = {
    id: 'ib_1',
    objectives: [
      { id: 'ib_obj_1', type: 'primary', description: 'To evaluate efficacy of drug X' },
      { id: 'ib_obj_2', type: 'secondary', description: 'To assess safety profile' },
    ],
  }

  const mockProtocol = {
    id: 'prot_1',
    objectives: [
      { id: 'prot_obj_1', type: 'primary', description: 'To evaluate the efficacy of drug X' },
      { id: 'prot_obj_2', type: 'secondary', description: 'To evaluate safety and tolerability' },
    ],
  }

  it('should map matching objectives', () => {
    const links = mapObjectives(mockIb as any, mockProtocol as any)
    
    expect(links.length).toBeGreaterThan(0)
    
    const primaryLink = links.find(l => l.type === 'primary')
    expect(primaryLink).toBeDefined()
    expect(primaryLink?.aligned).toBe(true)
    expect(primaryLink?.score).toBeGreaterThan(0.8)
  })

  it('should detect misaligned objectives', () => {
    const mismatchedProtocol = {
      id: 'prot_2',
      objectives: [
        { id: 'prot_obj_3', type: 'primary', description: 'Completely different objective' },
      ],
    }

    const links = mapObjectives(mockIb as any, mismatchedProtocol as any)
    
    const primaryLink = links.find(l => l.type === 'primary')
    expect(primaryLink?.aligned).toBe(false)
  })

  it('should handle missing objectives', () => {
    const emptyProtocol = {
      id: 'prot_3',
      objectives: [],
    }

    const links = mapObjectives(mockIb as any, emptyProtocol as any)
    expect(links.length).toBe(mockIb.objectives.length)
    links.forEach(link => {
      expect(link.aligned).toBe(false)
    })
  })
})

describe('Endpoints Mapping', () => {
  const mockProtocol = {
    id: 'prot_1',
    endpoints: [
      { 
        id: 'ep_1', 
        type: 'primary', 
        name: 'Change in HbA1c',
        description: 'Change from baseline in HbA1c at week 24',
      },
      { 
        id: 'ep_2', 
        type: 'secondary', 
        name: 'Fasting plasma glucose',
        description: 'Change in fasting plasma glucose',
      },
    ],
  }

  const mockSap = {
    id: 'sap_1',
    primaryEndpoints: [
      { 
        id: 'sap_ep_1', 
        name: 'Change in HbA1c',
        description: 'Change from baseline in HbA1c at week 24',
      },
    ],
    secondaryEndpoints: [
      { 
        id: 'sap_ep_2', 
        name: 'FPG change',
        description: 'Change in fasting plasma glucose from baseline',
      },
    ],
  }

  it('should map matching endpoints', () => {
    const links = mapEndpoints(mockProtocol as any, mockSap as any, null)
    
    expect(links.length).toBeGreaterThan(0)
    
    const primaryLink = links.find(l => l.protocolEndpoint.id === 'ep_1')
    expect(primaryLink).toBeDefined()
    expect(primaryLink?.aligned).toBe(true)
    expect(primaryLink?.score).toBeGreaterThan(0.8)
  })

  it('should detect missing endpoints in SAP', () => {
    const incompleteSap = {
      id: 'sap_2',
      primaryEndpoints: [],
      secondaryEndpoints: [],
    }

    const links = mapEndpoints(mockProtocol as any, incompleteSap as any, null)
    
    links.forEach(link => {
      expect(link.aligned).toBe(false)
    })
  })
})

describe('Dose Mapping', () => {
  const mockIb = {
    id: 'ib_1',
    dosingInformation: [
      { dose: '10 mg', route: 'oral', frequency: 'once daily' },
      { dose: '20 mg', route: 'oral', frequency: 'once daily' },
    ],
  }

  const mockProtocol = {
    id: 'prot_1',
    arms: [
      { id: 'arm_1', name: 'Treatment A', dose: '10mg', route: 'oral', frequency: 'QD' },
      { id: 'arm_2', name: 'Treatment B', dose: '20mg', route: 'oral', frequency: 'QD' },
    ],
  }

  it('should map matching doses', () => {
    const links = mapDoses(mockIb as any, mockProtocol as any, null)
    
    expect(links.length).toBe(2)
    
    links.forEach(link => {
      expect(link.aligned).toBe(true)
      expect(link.score).toBeGreaterThan(0.7)
    })
  })

  it('should handle dose format variations', () => {
    const variedProtocol = {
      id: 'prot_2',
      arms: [
        { id: 'arm_3', name: 'Treatment C', dose: '10 milligrams', route: 'PO', frequency: 'daily' },
      ],
    }

    const links = mapDoses(mockIb as any, variedProtocol as any, null)
    
    const link = links[0]
    expect(link).toBeDefined()
    expect(link.aligned).toBe(true)
  })

  it('should detect missing doses', () => {
    const incompleteProt = {
      id: 'prot_3',
      arms: [
        { id: 'arm_4', name: 'Treatment D', dose: '50mg', route: 'oral', frequency: 'QD' },
      ],
    }

    const links = mapDoses(mockIb as any, incompleteProt as any, null)
    
    const unmatchedLinks = links.filter(l => !l.aligned)
    expect(unmatchedLinks.length).toBeGreaterThan(0)
  })
})
