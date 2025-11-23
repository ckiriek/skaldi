/**
 * Phase H.2-H.6: Clinical Knowledge Graph & Data Ingestion Layer
 * 
 * Main export file for Knowledge Engine
 */

// Types
export type * from './types'

// Ingestion
export * from './ingestion'

// Normalizers
export * from './normalizers'

// Knowledge Graph
export * from './graph'

// Main API
export { buildKnowledgeGraph } from './graph/builder'
