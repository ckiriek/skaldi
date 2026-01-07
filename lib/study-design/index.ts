// Study Design Engine v2.3 - Public API
// Data-driven architecture per VP CRO spec

export * from './types'
export * from './config-loader'
export {
  generateStudyDesign,
  inferRegulatoryPathway,
  inferPrimaryObjective,
  selectDesignPattern,
  checkGuardrails,
  applyFallback,
  derivePhaseLabel,
  buildRegulatoryRationale
} from './engine'

// Component adapter for backward compatibility
export { generateStudyDesignForComponent } from './adapter'
export type { ComponentStudyDesignOutput } from './adapter'
