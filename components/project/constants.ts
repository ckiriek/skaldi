import { FileText, Database, CheckCircle2 } from 'lucide-react'

// Predefined tab configurations
export const PROJECT_TAB_IDS = {
  DOCUMENTS: 'documents',  // Pipeline (main tab)
  EVIDENCE: 'evidence',
  CROSS_DOC: 'crossdoc',   // Validation tab
} as const

export const PROJECT_TAB_ICONS = {
  [PROJECT_TAB_IDS.DOCUMENTS]: FileText,
  [PROJECT_TAB_IDS.EVIDENCE]: Database,
  [PROJECT_TAB_IDS.CROSS_DOC]: CheckCircle2,
}
