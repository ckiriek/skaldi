/**
 * Phase H.1: Formulation Normalizer - Main Export
 * 
 * Intelligent drug formulation parsing and indication suggestions
 */

// Types
export type {
  ParsedFormulation,
  Strength,
  StrengthUnit,
  DosageForm,
  Route,
  IndicationSuggestion,
  FormulationIndicationMap,
  NormalizationRule,
  INNExtraction,
} from './types'

// Main functions
export {
  normalizeFormulation,
  getIndicationSuggestions,
  validateFormulation,
  formatFormulation,
  needsEnrichment,
  getEnrichmentSuggestions,
} from './formulation_normalizer'

// Parser
export {
  parseFormulation,
} from './formulation_parser'

// Indication suggester
export {
  suggestIndications,
  filterIndicationsByFormulation,
  mergeIndicationSuggestions,
  getIndicationCategory,
} from './indication_suggester'

// Catalog utilities
export {
  getFormulationIndications,
  isLocalFormulation,
  DOSAGE_FORM_SYNONYMS,
  ROUTE_SYNONYMS,
  UNIT_NORMALIZATIONS,
  CHEMICAL_SALTS,
  FORMULATION_INDICATION_MAPS,
} from './formulation_catalog'
