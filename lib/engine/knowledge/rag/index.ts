/**
 * Phase H.5: RAG Layer
 * 
 * Export all RAG modules
 */

export { chunkText, chunkDocuments, getChunkStats } from './chunker'
export { embedChunks, embedText, cosineSimilarity } from './embeddings'
export { indexChunks, deleteChunksBySource, deleteChunksByType, getChunkCount, isSourceIndexed } from './indexer'
export { semanticSearch, findSimilarChunks, getChunksBySource } from './search'

export type { ChunkOptions } from './chunker'
export type { SearchResult, SearchOptions } from './search'
export type { TextChunk, EmbeddedChunk } from '../types'
