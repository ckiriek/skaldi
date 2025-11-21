/**
 * Document Store Types
 * 
 * Structured document format for Clinical Engine
 * Enables block-level editing, validation, and highlighting
 */

// ============================================================================
// BLOCK TYPES
// ============================================================================

export type BlockType = 
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'table'
  | 'figure'
  | 'reference'

export interface DocumentBlock {
  block_id: string
  type: BlockType
  text: string
  metadata?: {
    level?: number // for headings
    style?: string
    order?: number
    [key: string]: any
  }
}

// ============================================================================
// SECTION TYPES
// ============================================================================

export interface DocumentSection {
  section_id: string
  title: string
  order_index: number
  blocks: DocumentBlock[]
  subsections?: DocumentSection[]
  metadata?: {
    required?: boolean
    word_count?: number
    [key: string]: any
  }
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType = 
  | 'Protocol'
  | 'IB'
  | 'ICF'
  | 'Synopsis'
  | 'CSR'
  | 'SAP'

export interface StructuredDocument {
  document_id: string
  project_id: string
  type: DocumentType
  version: number
  status: 'draft' | 'review' | 'approved' | 'outdated'
  sections: DocumentSection[]
  metadata: {
    title?: string
    created_at: string
    updated_at: string
    created_by?: string
    word_count?: number
    [key: string]: any
  }
}

// ============================================================================
// LOCATION TYPES (for validation)
// ============================================================================

export interface BlockLocation {
  section_id: string
  block_id: string
  start_offset?: number
  end_offset?: number
}

// ============================================================================
// UPDATE TYPES
// ============================================================================

export interface BlockUpdate {
  document_id: string
  block_id: string
  new_text: string
  metadata?: Record<string, any>
}

export interface BlockUpdateResult {
  success: boolean
  document: StructuredDocument
  updated_block: DocumentBlock
  timestamp: string
}
