/**
 * Clinical Prompts Index
 * 
 * Central export for all clinical document prompts
 * 
 * Version: 1.2.0
 * Date: 2025-12-02
 */

export { GOVERNING_SYSTEM_PROMPT_V3 } from './governing-prompt-v3'
export { IB_SECTION_PROMPTS } from './ib-prompts'
export { IB_SECTION_PROMPTS_V4, IB_TABLE_OF_CONTENTS, IB_FORBIDDEN_PATTERNS, IB_VALIDATION_RULES } from './ib-prompts-v4'
export { PROTOCOL_SECTION_PROMPTS } from './protocol-prompts'
export { CSR_SECTION_PROMPTS } from './csr-prompts'
export { ICF_SECTION_PROMPTS } from './icf-prompts'
export { SAP_SECTION_PROMPTS } from './sap-prompts'
export { CRF_SECTION_PROMPTS } from './crf-prompts'

// Re-export default
export { default as GoverningPrompt } from './governing-prompt-v3'
export { default as IBPrompts } from './ib-prompts'
export { default as IBPromptsV4 } from './ib-prompts-v4'
export { default as ProtocolPrompts } from './protocol-prompts'
export { default as CSRPrompts } from './csr-prompts'
export { default as ICFPrompts } from './icf-prompts'
export { default as SAPPrompts } from './sap-prompts'
export { default as CRFPrompts } from './crf-prompts'
