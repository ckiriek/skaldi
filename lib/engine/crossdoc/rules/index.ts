/**
 * Cross-Document Rules
 * Export all validation rules
 */

export * from './ib_protocol_rules'
export * from './protocol_sap_rules'
export * from './protocol_icf_rules'
export * from './protocol_csr_rules'
export * from './global_rules'
export * from './studyflow_rules'

import { ibProtocolRules } from './ib_protocol_rules'
import { protocolSapRules } from './protocol_sap_rules'
import { protocolIcfRules } from './protocol_icf_rules'
import { protocolCsrRules } from './protocol_csr_rules'
import { globalRules } from './global_rules'

/**
 * All cross-document validation rules
 */
export const allCrossDocRules = [
  ...ibProtocolRules,        // 5 rules
  ...protocolSapRules,       // 5 rules
  ...protocolIcfRules,       // 3 rules
  ...protocolCsrRules,       // 3 rules
  ...globalRules,            // 3 rules
  // Study Flow rules are added dynamically via createStudyFlowRule()
]

// Total: 19 rules + Study Flow rules
