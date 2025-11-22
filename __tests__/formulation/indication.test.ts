/**
 * Phase H.1: Indication Suggester Tests
 */

import { parseFormulation } from '@/lib/engine/formulation/formulation_parser'
import { suggestIndications, getIndicationCategory } from '@/lib/engine/formulation/indication_suggester'
import { getFormulationIndications, isLocalFormulation } from '@/lib/engine/formulation'

describe('Indication Suggester', () => {
  describe('Formulation-Specific Indications', () => {
    test('should suggest gynecological indications for vaginal suppository', async () => {
      const parsed = parseFormulation('Metronidazole vaginal suppository 500 mg')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Bacterial Vaginosis')
      expect(indicationTexts).toContain('Trichomonas Vaginalis')
      expect(indications[0].source).toBe('formulation-specific')
      expect(indications[0].formRelevance).toBe('local')
    })
    
    test('should suggest ophthalmic indications for eye drops', async () => {
      const parsed = parseFormulation('Ciprofloxacin eye drops 0.3%')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Bacterial Conjunctivitis')
      expect(indicationTexts).toContain('Keratitis')
    })
    
    test('should suggest respiratory indications for inhalation', async () => {
      const parsed = parseFormulation('Tobramycin inhalation powder 28 mg')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Asthma')
      expect(indicationTexts).toContain('Chronic Obstructive Pulmonary Disease (COPD)')
      expect(indicationTexts).toContain('Cystic Fibrosis')
    })
    
    test('should suggest dermatological indications for topical cream', async () => {
      const parsed = parseFormulation('Hydrocortisone cream 1%')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Atopic Dermatitis')
      expect(indicationTexts).toContain('Psoriasis')
      expect(indicationTexts).toContain('Eczema')
    })
    
    test('should suggest nasal indications for nasal spray', async () => {
      const parsed = parseFormulation('Fluticasone nasal spray 50 mcg')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Allergic Rhinitis')
      expect(indicationTexts).toContain('Nasal Congestion')
    })
  })
  
  describe('Systemic Indications', () => {
    test('should suggest systemic indications for oral tablet', async () => {
      const parsed = parseFormulation('Sitagliptin 100 mg tablet')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Type 2 Diabetes Mellitus')
      expect(indications[0].formRelevance).toBe('systemic')
    })
    
    test('should suggest cardiovascular indications for ACE inhibitor', async () => {
      const parsed = parseFormulation('Perindopril 4 mg tablet')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Hypertension')
      expect(indicationTexts).toContain('Heart Failure')
    })
    
    test('should suggest diabetes indications for metformin', async () => {
      const parsed = parseFormulation('Metformin 850 mg tablet')
      const indications = await suggestIndications(parsed)
      
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Type 2 Diabetes Mellitus')
    })
  })
  
  describe('Local vs Systemic Detection', () => {
    test('should detect vaginal as local', () => {
      const isLocal = isLocalFormulation('vaginal suppository', 'vaginal')
      expect(isLocal).toBe(true)
    })
    
    test('should detect topical as local', () => {
      const isLocal = isLocalFormulation('cream', 'topical')
      expect(isLocal).toBe(true)
    })
    
    test('should detect ophthalmic as local', () => {
      const isLocal = isLocalFormulation('eye drops', 'ophthalmic')
      expect(isLocal).toBe(true)
    })
    
    test('should detect oral as systemic', () => {
      const isLocal = isLocalFormulation('tablet', 'oral')
      expect(isLocal).toBe(false)
    })
    
    test('should detect IV as systemic', () => {
      const isLocal = isLocalFormulation('injection', 'intravenous')
      expect(isLocal).toBe(false)
    })
  })
  
  describe('Indication Categories', () => {
    test('should categorize gynecological indications', () => {
      expect(getIndicationCategory('Bacterial Vaginosis')).toBe('Gynecological')
      expect(getIndicationCategory('Trichomonas Vaginalis')).toBe('Gynecological')
    })
    
    test('should categorize ophthalmic indications', () => {
      expect(getIndicationCategory('Bacterial Conjunctivitis')).toBe('Ophthalmic')
      expect(getIndicationCategory('Keratitis')).toBe('Ophthalmic')
    })
    
    test('should categorize respiratory indications', () => {
      expect(getIndicationCategory('Asthma')).toBe('Respiratory')
      expect(getIndicationCategory('COPD')).toBe('Respiratory')
    })
    
    test('should categorize dermatological indications', () => {
      expect(getIndicationCategory('Atopic Dermatitis')).toBe('Dermatological')
      expect(getIndicationCategory('Psoriasis')).toBe('Dermatological')
    })
    
    test('should categorize cardiovascular indications', () => {
      expect(getIndicationCategory('Hypertension')).toBe('Cardiovascular')
      expect(getIndicationCategory('Heart Failure')).toBe('Cardiovascular')
    })
    
    test('should categorize endocrine indications', () => {
      expect(getIndicationCategory('Type 2 Diabetes Mellitus')).toBe('Endocrine')
    })
  })
  
  describe('Confidence Scores', () => {
    test('should have high confidence for formulation-specific', async () => {
      const parsed = parseFormulation('Metronidazole vaginal suppository 500 mg')
      const indications = await suggestIndications(parsed)
      
      expect(indications[0].confidence).toBeGreaterThan(0.9)
    })
    
    test('should have medium confidence for systemic', async () => {
      const parsed = parseFormulation('Metronidazole 500 mg tablet')
      const indications = await suggestIndications(parsed)
      
      expect(indications[0].confidence).toBeGreaterThan(0.6)
      expect(indications[0].confidence).toBeLessThan(0.9)
    })
  })
  
  describe('Real-World Examples', () => {
    test('should handle Metronidazole vaginal correctly', async () => {
      const parsed = parseFormulation('Metronidazole vaginal suppository 500 mg')
      const indications = await suggestIndications(parsed)
      
      // Should prioritize local gynecological indications
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Bacterial Vaginosis')
      expect(indicationTexts).toContain('Trichomonas Vaginalis')
      
      // Should NOT include systemic indications as primary
      const firstFive = indicationTexts.slice(0, 5)
      expect(firstFive).not.toContain('Anaerobic Bacterial Infections')
    })
    
    test('should handle Metronidazole oral correctly', async () => {
      const parsed = parseFormulation('Metronidazole 500 mg tablet')
      const indications = await suggestIndications(parsed)
      
      // Should include systemic indications
      const indicationTexts = indications.map(i => i.indication)
      expect(indicationTexts).toContain('Anaerobic Bacterial Infections')
    })
  })
})

describe('Formulation Indication Mapping', () => {
  test('should get vaginal indications', () => {
    const indications = getFormulationIndications('vaginal suppository', null)
    expect(indications).toContain('Bacterial Vaginosis')
    expect(indications).toContain('Trichomonas Vaginalis')
  })
  
  test('should get ophthalmic indications', () => {
    const indications = getFormulationIndications('eye drops', null)
    expect(indications).toContain('Bacterial Conjunctivitis')
    expect(indications).toContain('Keratitis')
  })
  
  test('should return empty for systemic forms', () => {
    const indications = getFormulationIndications('tablet', 'oral')
    expect(indications).toEqual([])
  })
})
