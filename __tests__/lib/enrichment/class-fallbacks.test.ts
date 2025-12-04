/**
 * Class Fallbacks Tests
 * 
 * Tests for therapeutic class fallback data.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import {
  getClassFallback,
  hasSpecificFallback,
  getSupportedClasses,
  getClassCMCFallback,
  getClassPKFallback,
  getClassSafetyFallback,
  SSRI_FALLBACK,
  MAB_FALLBACK,
  PPI_FALLBACK,
  ANTI_TNF_FALLBACK,
  DEFAULT_FALLBACK
} from '@/lib/enrichment/class-fallbacks'

describe('Class Fallbacks', () => {
  describe('getClassFallback', () => {
    it('should return SSRI fallback for SSRI class', () => {
      const fallback = getClassFallback('SSRI')
      expect(fallback.therapeutic_class).toBe('SSRI')
      expect(fallback.display_name).toContain('Serotonin')
    })
    
    it('should return mAb fallback for mAb class', () => {
      const fallback = getClassFallback('mAb')
      expect(fallback.therapeutic_class).toBe('mAb')
      expect(fallback.display_name).toContain('Monoclonal')
    })
    
    it('should return PPI fallback for PPI class', () => {
      const fallback = getClassFallback('PPI')
      expect(fallback.therapeutic_class).toBe('PPI')
    })
    
    it('should return Anti-TNF fallback for ANTI_TNF class', () => {
      const fallback = getClassFallback('ANTI_TNF')
      expect(fallback.therapeutic_class).toBe('ANTI_TNF')
    })
    
    it('should return DEFAULT fallback for unknown class', () => {
      const fallback = getClassFallback('OTHER')
      expect(fallback.therapeutic_class).toBe('OTHER')
    })
    
    it('should map SNRI to SSRI fallback', () => {
      const fallback = getClassFallback('SNRI')
      expect(fallback.therapeutic_class).toBe('SSRI')
    })
  })
  
  describe('hasSpecificFallback', () => {
    it('should return true for SSRI', () => {
      expect(hasSpecificFallback('SSRI')).toBe(true)
    })
    
    it('should return true for mAb', () => {
      expect(hasSpecificFallback('mAb')).toBe(true)
    })
    
    it('should return false for OTHER', () => {
      expect(hasSpecificFallback('OTHER')).toBe(false)
    })
    
    it('should return false for STATIN (not yet implemented)', () => {
      expect(hasSpecificFallback('STATIN')).toBe(false)
    })
  })
  
  describe('getSupportedClasses', () => {
    it('should return array of supported classes', () => {
      const classes = getSupportedClasses()
      expect(Array.isArray(classes)).toBe(true)
      expect(classes).toContain('SSRI')
      expect(classes).toContain('mAb')
      expect(classes).toContain('PPI')
      expect(classes).toContain('ANTI_TNF')
      expect(classes).not.toContain('OTHER')
    })
  })
  
  describe('SSRI Fallback Data', () => {
    it('should have complete CMC data', () => {
      expect(SSRI_FALLBACK.cmc).toBeDefined()
      expect(SSRI_FALLBACK.cmc.source).toBe('class_based')
    })
    
    it('should have complete PK data', () => {
      expect(SSRI_FALLBACK.pk).toBeDefined()
      expect(SSRI_FALLBACK.pk.t_half).toBeDefined()
      expect(SSRI_FALLBACK.pk.metabolism?.enzymes).toContain('CYP2D6')
    })
    
    it('should have complete safety data', () => {
      expect(SSRI_FALLBACK.safety).toBeDefined()
      expect(SSRI_FALLBACK.safety.boxed_warning).toBeDefined()
      expect(SSRI_FALLBACK.safety.common_ae?.length).toBeGreaterThan(0)
      expect(SSRI_FALLBACK.safety.drug_interactions?.length).toBeGreaterThan(0)
    })
    
    it('should have nonclinical data', () => {
      expect(SSRI_FALLBACK.nonclinical).toBeDefined()
      expect(SSRI_FALLBACK.nonclinical.primary_pharmacodynamics).toBeDefined()
    })
  })
  
  describe('mAb Fallback Data', () => {
    it('should have biologic-specific CMC data', () => {
      expect(MAB_FALLBACK.cmc).toBeDefined()
      expect(MAB_FALLBACK.cmc.biologic_properties).toBeDefined()
      expect(MAB_FALLBACK.cmc.biologic_properties?.expression_system).toContain('CHO')
    })
    
    it('should have appropriate PK for biologics', () => {
      expect(MAB_FALLBACK.pk).toBeDefined()
      expect(MAB_FALLBACK.pk.t_half).toContain('days')
    })
    
    it('should have immunogenicity in safety', () => {
      expect(MAB_FALLBACK.safety).toBeDefined()
      expect(MAB_FALLBACK.safety.immunogenicity).toBeDefined()
    })
  })
  
  describe('Anti-TNF Fallback Data', () => {
    it('should have boxed warning', () => {
      expect(ANTI_TNF_FALLBACK.safety?.boxed_warning).toBeDefined()
      expect(ANTI_TNF_FALLBACK.safety?.boxed_warning).toContain('infection')
    })
    
    it('should have TB screening in precautions', () => {
      const precautions = ANTI_TNF_FALLBACK.safety?.precautions || []
      expect(precautions.some(p => p.toLowerCase().includes('tuberculosis'))).toBe(true)
    })
  })
  
  describe('DEFAULT Fallback Data', () => {
    it('should have minimal but valid structure', () => {
      expect(DEFAULT_FALLBACK.cmc).toBeDefined()
      expect(DEFAULT_FALLBACK.pk).toBeDefined()
      expect(DEFAULT_FALLBACK.safety).toBeDefined()
      expect(DEFAULT_FALLBACK.nonclinical).toBeDefined()
    })
    
    it('should indicate data needs to be provided', () => {
      expect(DEFAULT_FALLBACK.nonclinical.primary_pharmacodynamics).toContain('specific to the compound')
    })
  })
  
  describe('Section-specific getters', () => {
    it('should get CMC fallback', () => {
      const cmc = getClassCMCFallback('SSRI')
      expect(cmc).toBeDefined()
      expect(cmc.source).toBe('class_based')
    })
    
    it('should get PK fallback', () => {
      const pk = getClassPKFallback('PPI')
      expect(pk).toBeDefined()
      expect(pk.t_half).toBeDefined()
    })
    
    it('should get safety fallback', () => {
      const safety = getClassSafetyFallback('ANTI_TNF')
      expect(safety).toBeDefined()
      expect(safety.boxed_warning).toBeDefined()
    })
  })
})
