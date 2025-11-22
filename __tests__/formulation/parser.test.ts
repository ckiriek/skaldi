/**
 * Phase H.1: Formulation Parser Tests
 * 
 * Comprehensive test suite for formulation parsing
 */

import { parseFormulation } from '@/lib/engine/formulation/formulation_parser'
import { normalizeFormulation } from '@/lib/engine/formulation'

describe('Formulation Parser', () => {
  describe('Basic Parsing', () => {
    test('should parse simple tablet formulation', () => {
      const result = parseFormulation('Metformin 500 mg tablet')
      
      expect(result.apiName).toBe('Metformin')
      expect(result.dosageForm).toBe('tablet')
      expect(result.route).toBe('oral')
      expect(result.strength?.value).toBe(500)
      expect(result.strength?.unit).toBe('mg')
    })
    
    test('should parse vaginal suppository', () => {
      const result = parseFormulation('Metronidazole vaginal suppository 500 mg')
      
      expect(result.apiName).toBe('Metronidazole')
      expect(result.dosageForm).toBe('vaginal suppository')
      expect(result.route).toBe('vaginal')
      expect(result.strength?.value).toBe(500)
      expect(result.strength?.unit).toBe('mg')
    })
    
    test('should parse film-coated tablet', () => {
      const result = parseFormulation('Metformin hydrochloride 850mg film-coated tablets')
      
      expect(result.apiName).toBe('Metformin')
      expect(result.dosageForm).toBe('film-coated tablet')
      expect(result.route).toBe('oral')
      expect(result.strength?.value).toBe(850)
      expect(result.additionalProperties).toContain('film-coated')
    })
    
    test('should parse injection with IU', () => {
      const result = parseFormulation('Insulin glargine pen injection 100 IU/ml')
      
      expect(result.apiName).toBe('Insulin glargine')
      expect(result.dosageForm).toBe('injection')
      expect(result.strength?.value).toBe(100)
      expect(result.strength?.unit).toBe('IU/ml')
      expect(result.additionalProperties).toContain('pen-injector')
    })
    
    test('should parse inhalation powder', () => {
      const result = parseFormulation('Tobramycin inhalation powder 28 mg')
      
      expect(result.apiName).toBe('Tobramycin')
      expect(result.dosageForm).toBe('inhalation powder')
      expect(result.route).toBe('inhalation')
      expect(result.strength?.value).toBe(28)
    })
  })
  
  describe('INN Extraction', () => {
    test('should strip hydrochloride salt', () => {
      const result = parseFormulation('Metronidazole hydrochloride 500 mg')
      expect(result.apiName).toBe('Metronidazole')
    })
    
    test('should strip phosphate salt', () => {
      const result = parseFormulation('Sitagliptin phosphate 100 mg tablet')
      expect(result.apiName).toBe('Sitagliptin')
    })
    
    test('should strip erbumine salt', () => {
      const result = parseFormulation('Perindopril erbumine 4 mg tablet')
      expect(result.apiName).toBe('Perindopril')
    })
    
    test('should handle compound names', () => {
      const result = parseFormulation('Insulin glargine pen 100 IU/ml')
      expect(result.apiName).toBe('Insulin glargine')
    })
  })
  
  describe('Dosage Form Detection', () => {
    test('should detect vaginal cream', () => {
      const result = parseFormulation('Metronidazole vaginal cream 0.75%')
      expect(result.dosageForm).toBe('vaginal cream')
      expect(result.route).toBe('vaginal')
    })
    
    test('should detect ophthalmic solution', () => {
      const result = parseFormulation('Ciprofloxacin ophthalmic solution 0.3%')
      expect(result.dosageForm).toBe('ophthalmic solution')
      expect(result.route).toBe('ophthalmic')
    })
    
    test('should detect nasal spray', () => {
      const result = parseFormulation('Fluticasone nasal spray 50 mcg')
      expect(result.dosageForm).toBe('nasal spray')
      expect(result.route).toBe('intranasal')
    })
    
    test('should detect topical cream', () => {
      const result = parseFormulation('Hydrocortisone cream 1%')
      expect(result.dosageForm).toBe('cream')
      expect(result.route).toBe('topical')
    })
    
    test('should detect capsule', () => {
      const result = parseFormulation('Omeprazole 20 mg capsule')
      expect(result.dosageForm).toBe('capsule')
      expect(result.route).toBe('oral')
    })
  })
  
  describe('Route Inference', () => {
    test('should infer oral from tablet', () => {
      const result = parseFormulation('Aspirin 100 mg tablet')
      expect(result.route).toBe('oral')
    })
    
    test('should infer vaginal from intravaginal', () => {
      const result = parseFormulation('Metronidazole 500 mg intravaginal')
      expect(result.route).toBe('vaginal')
    })
    
    test('should detect IV route', () => {
      const result = parseFormulation('Ceftriaxone 1g IV injection')
      expect(result.route).toBe('intravenous')
    })
    
    test('should detect SC route', () => {
      const result = parseFormulation('Insulin aspart 100 IU/ml SC injection')
      expect(result.route).toBe('subcutaneous')
    })
  })
  
  describe('Strength Normalization', () => {
    test('should normalize grams to mg', () => {
      const result = parseFormulation('Metronidazole 0.5 g tablet')
      expect(result.strength?.value).toBe(500)
      expect(result.strength?.unit).toBe('mg')
      expect(result.strength?.normalized).toBe('500 mg')
    })
    
    test('should handle percentage', () => {
      const result = parseFormulation('Hydrocortisone cream 1%')
      expect(result.strength?.value).toBe(1)
      expect(result.strength?.unit).toBe('%')
    })
    
    test('should handle IU', () => {
      const result = parseFormulation('Insulin 100 IU/ml')
      expect(result.strength?.value).toBe(100)
      expect(result.strength?.unit).toBe('IU/ml')
    })
    
    test('should handle mcg', () => {
      const result = parseFormulation('Fluticasone 50 mcg spray')
      expect(result.strength?.value).toBe(50)
      expect(result.strength?.unit).toBe('mcg')
    })
  })
  
  describe('Additional Properties', () => {
    test('should detect film-coated', () => {
      const result = parseFormulation('Metformin 850 mg film-coated tablet')
      expect(result.additionalProperties).toContain('film-coated')
    })
    
    test('should detect extended-release', () => {
      const result = parseFormulation('Metformin 500 mg extended-release tablet')
      expect(result.additionalProperties).toContain('extended-release')
    })
    
    test('should detect chewable', () => {
      const result = parseFormulation('Aspirin 100 mg chewable tablet')
      expect(result.additionalProperties).toContain('chewable')
    })
    
    test('should detect pre-filled', () => {
      const result = parseFormulation('Insulin glargine 100 IU/ml pre-filled pen')
      expect(result.additionalProperties).toContain('pre-filled')
    })
  })
  
  describe('Confidence Scores', () => {
    test('should have high confidence for complete formulation', () => {
      const result = parseFormulation('Metronidazole vaginal suppository 500 mg')
      expect(result.confidence.overall).toBeGreaterThan(0.8)
    })
    
    test('should have lower confidence for incomplete formulation', () => {
      const result = parseFormulation('Metronidazole')
      expect(result.confidence.overall).toBeLessThan(0.7)
    })
    
    test('should have high API name confidence', () => {
      const result = parseFormulation('Metronidazole 500 mg')
      expect(result.confidence.apiName).toBeGreaterThan(0.8)
    })
  })
  
  describe('Edge Cases', () => {
    test('should handle missing strength', () => {
      const result = parseFormulation('Metronidazole vaginal suppository')
      expect(result.apiName).toBe('Metronidazole')
      expect(result.dosageForm).toBe('vaginal suppository')
      expect(result.strength).toBeNull()
      expect(result.warnings).toContain('Strength not detected')
    })
    
    test('should handle missing dosage form', () => {
      const result = parseFormulation('Metronidazole 500 mg')
      expect(result.apiName).toBe('Metronidazole')
      expect(result.strength?.value).toBe(500)
      expect(result.dosageForm).toBeNull()
      expect(result.warnings).toContain('Dosage form not detected')
    })
    
    test('should handle only API name', () => {
      const result = parseFormulation('Metronidazole')
      expect(result.apiName).toBe('Metronidazole')
      expect(result.dosageForm).toBeNull()
      expect(result.route).toBeNull()
      expect(result.strength).toBeNull()
    })
    
    test('should handle extra whitespace', () => {
      const result = parseFormulation('  Metronidazole   500  mg   tablet  ')
      expect(result.apiName).toBe('Metronidazole')
      expect(result.strength?.value).toBe(500)
    })
    
    test('should handle mixed case', () => {
      const result = parseFormulation('METRONIDAZOLE 500 MG TABLET')
      expect(result.apiName).toBe('Metronidazole')
      expect(result.dosageForm).toBe('tablet')
    })
  })
  
  describe('Multilingual Support', () => {
    test('should parse Russian tablet', () => {
      const result = parseFormulation('Метронидазол 500 мг таблетка')
      expect(result.apiName).toBeTruthy()
      expect(result.strength?.value).toBe(500)
    })
    
    test('should parse Russian vaginal suppository', () => {
      const result = parseFormulation('Метронидазол вагинальные свечи 500 мг')
      expect(result.dosageForm).toBe('vaginal suppository')
    })
  })
  
  describe('Real-World Examples', () => {
    test('should parse Femilex formulation', () => {
      const result = parseFormulation('Femilex vaginal suppository 500 mg')
      expect(result.apiName).toBe('Femilex')
      expect(result.dosageForm).toBe('vaginal suppository')
      expect(result.route).toBe('vaginal')
    })
    
    test('should parse Perindopril formulation', () => {
      const result = parseFormulation('Perindopril erbumine 4 mg tablet')
      expect(result.apiName).toBe('Perindopril')
      expect(result.dosageForm).toBe('tablet')
      expect(result.strength?.value).toBe(4)
    })
    
    test('should parse Sitagliptin formulation', () => {
      const result = parseFormulation('Sitagliptin phosphate 100 mg film-coated tablet')
      expect(result.apiName).toBe('Sitagliptin')
      expect(result.dosageForm).toBe('film-coated tablet')
      expect(result.strength?.value).toBe(100)
    })
    
    test('should parse Podhaler formulation', () => {
      const result = parseFormulation('Tobramycin Podhaler inhalation powder 28 mg')
      expect(result.apiName).toContain('Tobramycin')
      expect(result.dosageForm).toBe('inhalation powder')
      expect(result.route).toBe('inhalation')
    })
  })
})

describe('Normalization Integration', () => {
  test('should work through main API', () => {
    const result = normalizeFormulation('Metronidazole vaginal suppository 500 mg')
    
    expect(result.apiName).toBe('Metronidazole')
    expect(result.dosageForm).toBe('vaginal suppository')
    expect(result.route).toBe('vaginal')
    expect(result.strength?.normalized).toBe('500 mg')
  })
})
