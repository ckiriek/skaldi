/**
 * Validation Module
 * Export all validation rules
 */

export * from './protocol_icf_flow_rules'
export * from './protocol_sap_flow_rules'
export * from './global_flow_rules'

import { protocolIcfFlowRules } from './protocol_icf_flow_rules'
import { protocolSapFlowRules } from './protocol_sap_flow_rules'
import { globalFlowRules } from './global_flow_rules'

/**
 * All study flow validation rules
 */
export const allStudyFlowRules = [
  ...protocolIcfFlowRules,   // 3 rules
  ...protocolSapFlowRules,   // 3 rules
  ...globalFlowRules,        // 4 rules
]

// Total: 10 rules
