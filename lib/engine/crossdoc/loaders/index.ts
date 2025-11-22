/**
 * Cross-Document Loaders
 * Export all document loaders
 */

export { loadIbForCrossDoc } from './ib_loader'
export { loadProtocolForCrossDoc } from './protocol_loader'

// Placeholder loaders for ICF, SAP, CSR
// These will be implemented as needed

import type { StructuredIcfDocument, StructuredSapDocument, StructuredCsrDocument } from '../types'

export async function loadIcfForCrossDoc(docId: string): Promise<StructuredIcfDocument | null> {
  // TODO: Implement ICF loader
  console.warn('ICF loader not yet implemented')
  return null
}

export async function loadSapForCrossDoc(docId: string): Promise<StructuredSapDocument | null> {
  // TODO: Implement SAP loader
  console.warn('SAP loader not yet implemented')
  return null
}

export async function loadCsrForCrossDoc(docId: string): Promise<StructuredCsrDocument | null> {
  // TODO: Implement CSR loader
  console.warn('CSR loader not yet implemented')
  return null
}
