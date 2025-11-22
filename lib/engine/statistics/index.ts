/**
 * Skaldi Statistics Engine
 * 
 * Comprehensive statistical analysis capabilities for clinical trials:
 * - Sample size calculation
 * - Endpoint to statistical test mapping
 * - SAP generation
 * - Statistical validation
 * - Structured statistical JSON output
 * 
 * Regulatory compliant with ICH E9, ICH E3, FDA and EMA guidelines
 */

// Types
export * from './types'

// Distributions
export * from './distributions/normal'
export * from './distributions/binomial'

// Sample Size
export * from './sample_size/power_analysis'
export * from './sample_size/effect_size'
export * from './sample_size/calculators'

// Endpoint Mapping
export * from './endpoint_mapping/endpoint_types'
export * from './endpoint_mapping/test_selector'
export * from './endpoint_mapping/mapping_rules'

// SAP Generator
export * from './sap_generator'

// Validators
export * from './validators/parameter_validator'
export * from './validators/consistency_checker'

// Version
export const STATISTICS_ENGINE_VERSION = '1.0.0'
