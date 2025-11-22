# Phase H.1: Formulation Normalizer + Indication Intelligence

**Status**: ✅ Core Implementation Complete  
**Version**: 1.0.0  
**Last Updated**: November 22, 2025

---

## 📋 Overview

The Formulation Normalizer is an intelligent parsing engine that extracts structured information from raw drug formulation strings. It provides:

1. **INN Extraction**: Pure API name extraction (strips salts, brand names)
2. **Dosage Form Detection**: 40+ controlled vocabulary forms
3. **Route Inference**: 20+ routes of administration
4. **Strength Normalization**: Automatic unit conversion
5. **Context-Aware Indications**: Formulation-specific indication suggestions

---

## 🎯 Key Features

### ✅ Intelligent Parsing
- Handles multilingual input (English + Russian)
- Strips manufacturer terms and brand names
- Normalizes chemical salts to pure INN
- Extracts strength with unit conversion

### ✅ Controlled Vocabularies
- **40+ Dosage Forms**: tablet, capsule, cream, injection, etc.
- **20+ Routes**: oral, IV, topical, vaginal, etc.
- **Automatic Mapping**: Synonyms → Standard terms

### ✅ Formulation-Aware Indications
- **Local Forms** (vaginal, topical, ophthalmic) → Specific indications
- **Systemic Forms** (oral, IV) → General indications
- **Confidence Scores**: 0-1 for each extracted field

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { normalizeFormulation } from '@/lib/engine/formulation'

// Parse a formulation string
const result = normalizeFormulation('Metronidazole vaginal suppository 500 mg')

console.log(result)
// {
//   apiName: 'Metronidazole',
//   dosageForm: 'vaginal suppository',
//   route: 'vaginal',
//   strength: { value: 500, unit: 'mg', normalized: '500 mg' },
//   additionalProperties: [],
//   confidence: { overall: 0.92, ... },
//   warnings: []
// }
```

### Get Indication Suggestions

```typescript
import { normalizeFormulation, suggestIndications } from '@/lib/engine/formulation'

const parsed = normalizeFormulation('Metronidazole vaginal suppository 500 mg')
const indications = await suggestIndications(parsed)

console.log(indications)
// [
//   { indication: 'Bacterial Vaginosis', confidence: 0.95, source: 'formulation-specific' },
//   { indication: 'Trichomonas Vaginalis', confidence: 0.95, source: 'formulation-specific' },
//   ...
// ]
```

### Format for Display

```typescript
import { normalizeFormulation, formatFormulation } from '@/lib/engine/formulation'

const parsed = normalizeFormulation('Metformin hydrochloride 850mg film-coated tablets')
const formatted = formatFormulation(parsed)

console.log(formatted)
// "Metformin 850 mg film-coated tablet [film-coated]"
```

---

## 📚 API Reference

### `normalizeFormulation(rawInput: string): ParsedFormulation`

Main entry point for parsing formulations.

**Input**: Raw formulation string  
**Output**: Structured `ParsedFormulation` object

**Example**:
```typescript
const result = normalizeFormulation('Sitagliptin 100 mg tablet oral')
```

---

### `suggestIndications(parsed, options): Promise<IndicationSuggestion[]>`

Get context-aware indication suggestions.

**Parameters**:
- `parsed`: ParsedFormulation object
- `options`: 
  - `includeSystemic`: boolean (default: true)
  - `includeFDA`: boolean (default: true)
  - `includeEMA`: boolean (default: true)
  - `maxSuggestions`: number (default: 10)

**Returns**: Array of indication suggestions with confidence scores

---

### `validateFormulation(parsed): ValidationResult`

Check if formulation is complete.

**Returns**:
```typescript
{
  isComplete: boolean
  missingFields: string[]
  suggestions: string[]
}
```

---

### `formatFormulation(parsed): string`

Format formulation for human-readable display.

**Example Output**: `"Metronidazole 500 mg vaginal suppository"`

---

### `isLocalFormulation(dosageForm, route): boolean`

Check if formulation is local (non-systemic).

**Local Forms**:
- Vaginal (suppository, cream, gel)
- Topical (cream, ointment, gel)
- Ophthalmic (eye drops, ointment)
- Nasal (spray, drops)
- Rectal (suppository, cream)

---

## 🧪 Examples

### Example 1: Vaginal Suppository

```typescript
const input = 'Metronidazole vaginal suppository 500 mg'
const parsed = normalizeFormulation(input)

// Result:
{
  apiName: 'Metronidazole',
  dosageForm: 'vaginal suppository',
  route: 'vaginal',
  strength: { value: 500, unit: 'mg', normalized: '500 mg' },
  confidence: { overall: 0.92 }
}

// Indications:
['Bacterial Vaginosis', 'Trichomonas Vaginalis', 'Vaginitis']
```

### Example 2: Oral Tablet

```typescript
const input = 'Sitagliptin phosphate 100 mg tablet'
const parsed = normalizeFormulation(input)

// Result:
{
  apiName: 'Sitagliptin',  // Salt stripped
  dosageForm: 'tablet',
  route: 'oral',
  strength: { value: 100, unit: 'mg', normalized: '100 mg' },
  confidence: { overall: 0.95 }
}

// Indications:
['Type 2 Diabetes Mellitus', 'Glycemic Control']
```

### Example 3: Inhalation Powder

```typescript
const input = 'Tobramycin inhalation powder 28 mg'
const parsed = normalizeFormulation(input)

// Result:
{
  apiName: 'Tobramycin',
  dosageForm: 'inhalation powder',
  route: 'inhalation',
  strength: { value: 28, unit: 'mg', normalized: '28 mg' },
  confidence: { overall: 0.90 }
}

// Indications:
['Cystic Fibrosis', 'Chronic Bronchitis', 'COPD']
```

### Example 4: Ophthalmic Solution

```typescript
const input = 'Ciprofloxacin ophthalmic solution 0.3%'
const parsed = normalizeFormulation(input)

// Result:
{
  apiName: 'Ciprofloxacin',
  dosageForm: 'ophthalmic solution',
  route: 'ophthalmic',
  strength: { value: 0.3, unit: '%', normalized: '0.3 %' },
  confidence: { overall: 0.93 }
}

// Indications:
['Bacterial Conjunctivitis', 'Keratitis', 'Corneal Ulcer']
```

---

## 🔧 Supported Dosage Forms

### Oral Solid (10)
- tablet, film-coated tablet, chewable tablet
- capsule, hard capsule, soft capsule
- powder for oral suspension, granules

### Oral Liquid (4)
- oral solution, oral suspension, syrup, drops

### Parenteral (8)
- injection, solution for injection, powder for injection
- IV infusion, subcutaneous injection, intramuscular injection
- pre-filled syringe, pen injector

### Inhalation (4)
- inhalation powder, inhalation solution
- metered-dose inhaler, nebulizer solution

### Topical (7)
- cream, ointment, gel, lotion, foam
- patch, transdermal patch

### Vaginal (5)
- vaginal suppository, vaginal cream, vaginal gel
- vaginal tablet, vaginal ring

### Ophthalmic (3)
- ophthalmic solution, ophthalmic ointment, eye drops

### Nasal (3)
- nasal spray, nasal drops, nasal gel

### Rectal (3)
- rectal suppository, rectal cream, enema

### Other (4)
- spray, pessary, lozenge, implant

**Total**: 40+ dosage forms

---

## 🛣️ Supported Routes

- oral, intravenous, intramuscular, subcutaneous
- inhalation, topical, transdermal
- vaginal, intravaginal, rectal
- ophthalmic, intranasal
- sublingual, buccal
- intradermal, intra-articular
- intrathecal, epidural
- intracardiac, intraperitoneal

**Total**: 20+ routes

---

## 📊 Confidence Scores

Each parsed formulation includes confidence scores (0-1):

- **apiName**: Confidence in INN extraction
- **dosageForm**: Confidence in form detection
- **route**: Confidence in route inference
- **strength**: Confidence in strength parsing
- **overall**: Weighted average

**Thresholds**:
- ≥ 0.9: High confidence ✅
- 0.7-0.9: Medium confidence ⚠️
- < 0.7: Low confidence ❌

---

## ⚙️ Normalization Rules

### Chemical Salts Stripped
- hydrochloride, phosphate, sulfate, sodium, etc.
- **Example**: "Metronidazole hydrochloride" → "Metronidazole"

### Synonyms Normalized
- "tab" → "tablet"
- "vaginal pessary" → "vaginal suppository"
- "po" → "oral"
- "iv" → "intravenous"

### Units Converted
- 0.5 g → 500 mg
- 1000 IU/ml → 1000 IU/ml
- mcg → mcg (standardized)

### Manufacturer Terms Removed
- pharma, pharmaceuticals, labs, inc, ltd, etc.

---

## 🎯 Formulation-Specific Indications

### Vaginal Forms → Gynecological
- Bacterial Vaginosis
- Trichomonas Vaginalis
- Vulvovaginal Candidiasis
- Vaginitis

### Ophthalmic Forms → Eye Conditions
- Bacterial Conjunctivitis
- Keratitis
- Blepharitis
- Corneal Ulcer

### Inhalation Forms → Respiratory
- Asthma
- COPD
- Bronchospasm
- Cystic Fibrosis

### Topical Forms → Dermatological
- Atopic Dermatitis
- Psoriasis
- Eczema
- Acne Vulgaris

---

## ⚠️ Limitations

1. **No Real-Time FDA/EMA Integration** (yet)
   - Currently uses drug class patterns
   - Future: Connect to FDA/EMA APIs

2. **Limited Multilingual Support**
   - English + Russian only
   - Future: Add more languages

3. **No Brand Name Database**
   - Cannot resolve brand → INN automatically
   - Future: Add brand name mapping

4. **Confidence Thresholds**
   - Low confidence (< 0.7) requires manual review
   - Always verify critical extractions

---

## 🔮 Future Enhancements

- [ ] FDA/EMA API integration
- [ ] Brand name → INN mapping
- [ ] More languages (Spanish, French, German)
- [ ] Machine learning for better parsing
- [ ] Autocomplete suggestions in UI
- [ ] Confidence heatmap visualization

---

## 🧪 Testing

See `/tests/formulation/` for comprehensive test suite:
- 30+ parsing examples
- Multilingual tests
- Edge cases
- Regression tests

**Coverage**: > 80%

---

## 📞 Support

For issues or questions:
- Check examples above
- Review test cases in `/tests/formulation/`
- Consult Phase H.1 task document

---

**Built with ❤️ for Skaldi Clinical Documentation Engine**
