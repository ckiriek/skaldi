/**
 * Clinical Prompts Index
 * 
 * Central export for all clinical document prompts
 * 
 * Version: 1.1.0
 * Date: 2025-11-29
 */

export { GOVERNING_SYSTEM_PROMPT_V3 } from './governing-prompt-v3'
export { IB_SECTION_PROMPTS } from './ib-prompts'
export { PROTOCOL_SECTION_PROMPTS } from './protocol-prompts'
export { CSR_SECTION_PROMPTS } from './csr-prompts'
export { ICF_SECTION_PROMPTS } from './icf-prompts'
export { SAP_SECTION_PROMPTS } from './sap-prompts'
export { CRF_SECTION_PROMPTS } from './crf-prompts'

// Re-export default
export { default as GoverningPrompt } from './governing-prompt-v3'
export { default as IBPrompts } from './ib-prompts'
export { default as ProtocolPrompts } from './protocol-prompts'
export { default as CSRPrompts } from './csr-prompts'
export { default as ICFPrompts } from './icf-prompts'
export { default as SAPPrompts } from './sap-prompts'
export { default as CRFPrompts } from './crf-prompts'
