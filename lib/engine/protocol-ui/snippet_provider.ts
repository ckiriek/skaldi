/**
 * Phase H.UI v3: Snippet Provider
 * 
 * Provides snippets from reference protocols using RAG
 */

import { semanticSearch } from '../knowledge/rag/search'
import type { ProtocolSectionId } from './section_schema'

export interface ProtocolSnippet {
  id: string
  sectionId: ProtocolSectionId
  text: string
  source: string
  similarity: number
  referenceFile: string
}

/**
 * Get snippets from reference protocols
 */
export async function getProtocolSnippets(
  query: string,
  sectionId: ProtocolSectionId,
  limit: number = 5
): Promise<ProtocolSnippet[]> {
  try {
    // Search in clinical_reference using RAG
    const results = await semanticSearch(query, {
      limit,
      minSimilarity: 0.7,
      sourceTypes: ['reference_protocol']
    })
    
    // Map to protocol snippets
    return results.map((result, index) => ({
      id: `snippet-${sectionId}-${index}`,
      sectionId,
      text: result.text,
      source: result.sourceType,
      similarity: result.similarity,
      referenceFile: extractFileName(result.sourceId)
    }))
    
  } catch (error) {
    console.error('Failed to get protocol snippets:', error)
    return []
  }
}

/**
 * Get section-specific snippets
 */
export async function getSectionSnippets(
  sectionId: ProtocolSectionId,
  context: {
    indication?: string
    phase?: string
    compound?: string
  }
): Promise<ProtocolSnippet[]> {
  // Build query based on section and context
  const query = buildSectionQuery(sectionId, context)
  
  return await getProtocolSnippets(query, sectionId)
}

/**
 * Build query for section
 */
function buildSectionQuery(
  sectionId: ProtocolSectionId,
  context: {
    indication?: string
    phase?: string
    compound?: string
  }
): string {
  const parts: string[] = []
  
  // Add section-specific terms
  const sectionTerms = SECTION_QUERY_TERMS[sectionId]
  if (sectionTerms) {
    parts.push(sectionTerms)
  }
  
  // Add context
  if (context.indication) {
    parts.push(context.indication)
  }
  
  if (context.phase) {
    parts.push(context.phase)
  }
  
  return parts.join(' ')
}

/**
 * Extract file name from source ID
 */
function extractFileName(sourceId: string): string {
  const parts = sourceId.split('/')
  return parts[parts.length - 1] || sourceId
}

/**
 * Section-specific query terms
 */
const SECTION_QUERY_TERMS: Record<ProtocolSectionId, string> = {
  'objectives': 'primary objective secondary objective',
  'endpoints': 'primary endpoint secondary endpoint efficacy',
  'eligibility': 'inclusion criteria exclusion criteria',
  'safety_assessments': 'adverse events safety monitoring laboratory assessments',
  'statistics': 'sample size calculation statistical analysis',
  'study_design': 'randomization blinding study design',
  'study_flow': 'visit schedule study procedures',
  'treatments': 'dosing regimen treatment administration',
  'efficacy_assessments': 'efficacy evaluation measurements',
  'study_population': 'target population patient characteristics',
  'admin': 'monitoring data management regulatory',
  'ethics': 'informed consent IRB ethical considerations',
  'title': 'protocol title',
  'synopsis': 'study synopsis overview',
  'icf_summary': 'informed consent summary'
}
