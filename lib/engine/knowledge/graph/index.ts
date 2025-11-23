/**
 * Phase H.4: Knowledge Graph
 * 
 * Export all graph modules
 */

export { KnowledgeGraphBuilder, buildKnowledgeGraph } from './builder'
export {
  calculateConfidence,
  mergeEntities,
  filterByConfidence,
  sortByConfidence,
  createEmptySnapshot,
  validateSnapshot
} from './schema'

export type {
  KgEntity,
  SourceMetadata
} from './schema'
