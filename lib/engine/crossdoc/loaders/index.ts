/**
 * Cross-Document Loaders
 * Export all document loaders
 */

import { createClient } from '@/lib/supabase/server'
import type { 
  StructuredIcfDocument, 
  StructuredSapDocument, 
  StructuredCsrDocument,
  ProcedureDescription,
  SapEndpoint,
  StatisticalTestSpec,
  AnalysisPopulation,
  CsrEndpoint
} from '../types'

export { loadIbForCrossDoc } from './ib_loader'
export { loadProtocolForCrossDoc } from './protocol_loader'

/**
 * Load ICF document for cross-document validation
 */
export async function loadIcfForCrossDoc(docId: string): Promise<StructuredIcfDocument | null> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('Failed to load ICF:', error)
    return null
  }

  const content = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)
  const metadata = doc.metadata || {}

  return {
    id: doc.id,
    version: doc.version || metadata.version,
    procedureDescriptions: extractProcedures(content),
    visitBurden: extractVisitBurden(content),
    risks: extractRisks(content),
    benefits: extractBenefits(content),
    treatmentDescriptions: extractTreatmentDescriptions(content),
    metadata,
  }
}

/**
 * Load SAP document for cross-document validation
 */
export async function loadSapForCrossDoc(docId: string): Promise<StructuredSapDocument | null> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('Failed to load SAP:', error)
    return null
  }

  const content = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)
  const metadata = doc.metadata || {}

  return {
    id: doc.id,
    version: doc.version || metadata.version,
    primaryEndpoints: extractSapEndpoints(content, 'primary'),
    secondaryEndpoints: extractSapEndpoints(content, 'secondary'),
    statisticalTests: extractStatisticalTests(content),
    sampleSizeDriverEndpoint: extractSampleSizeDriver(content),
    analysisPopulations: extractAnalysisPopulations(content),
    missingDataStrategy: extractMissingDataStrategy(content),
    multiplicityStrategy: extractMultiplicityStrategy(content),
    metadata,
  }
}

/**
 * Load CSR document for cross-document validation
 */
export async function loadCsrForCrossDoc(docId: string): Promise<StructuredCsrDocument | null> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('Failed to load CSR:', error)
    return null
  }

  const content = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)
  const metadata = doc.metadata || {}

  return {
    id: doc.id,
    version: doc.version || metadata.version,
    actualMethods: extractActualMethods(content),
    analysisSets: extractAnalysisPopulations(content),
    reportedPrimaryEndpoints: extractCsrEndpoints(content, 'primary'),
    reportedSecondaryEndpoints: extractCsrEndpoints(content, 'secondary'),
    deviationsOverview: extractDeviations(content),
    metadata,
  }
}

// ============================================================================
// ICF Extraction Helpers
// ============================================================================

function extractProcedures(content: string): ProcedureDescription[] {
  const procedures: ProcedureDescription[] = []
  
  const procedureMatch = content.match(/##?\s*(?:Study\s+)?Procedures?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  if (procedureMatch) {
    const text = procedureMatch[1]
    const items = text.split(/\n[-•*]\s+/).filter(Boolean)
    
    items.forEach((item, index) => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) {
        procedures.push({
          id: `icf_proc_${index}`,
          name: cleaned.substring(0, 50),
          description: cleaned,
          invasive: /blood|biopsy|injection|infusion|catheter/i.test(cleaned),
        })
      }
    })
  }
  
  return procedures
}

function extractVisitBurden(content: string): string | undefined {
  const match = content.match(/##?\s*(?:Visit|Time)\s*(?:Schedule|Commitment|Burden)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  return match ? match[1].trim().substring(0, 500) : undefined
}

function extractRisks(content: string): string[] {
  const risks: string[] = []
  const match = content.match(/##?\s*(?:Risks?|Side\s+Effects?)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) risks.push(cleaned)
    })
  }
  
  return risks
}

function extractBenefits(content: string): string[] {
  const benefits: string[] = []
  const match = content.match(/##?\s*Benefits?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) benefits.push(cleaned)
    })
  }
  
  return benefits
}

function extractTreatmentDescriptions(content: string): string[] {
  const treatments: string[] = []
  const match = content.match(/##?\s*(?:Study\s+)?Treatment\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) treatments.push(cleaned)
    })
  }
  
  return treatments
}

// ============================================================================
// SAP Extraction Helpers
// ============================================================================

function extractSapEndpoints(content: string, type: 'primary' | 'secondary'): SapEndpoint[] {
  const endpoints: SapEndpoint[] = []
  const pattern = type === 'primary' 
    ? /##?\s*Primary\s+Endpoint[s]?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i
    : /##?\s*Secondary\s+Endpoint[s]?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i
  
  const match = content.match(pattern)
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach((item, index) => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) {
        endpoints.push({
          id: `sap_${type}_${index}`,
          name: cleaned.substring(0, 100),
          description: cleaned,
        })
      }
    })
  }
  
  return endpoints
}

function extractStatisticalTests(content: string): StatisticalTestSpec[] {
  const tests: StatisticalTestSpec[] = []
  const match = content.match(/##?\s*Statistical\s+(?:Methods?|Analysis|Tests?)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const text = match[1]
    // Look for common statistical tests
    const testPatterns = [
      { pattern: /ANCOVA/gi, test: 'ANCOVA' },
      { pattern: /ANOVA/gi, test: 'ANOVA' },
      { pattern: /t-test/gi, test: 't-test' },
      { pattern: /chi-square/gi, test: 'Chi-square' },
      { pattern: /Fisher/gi, test: 'Fisher exact test' },
      { pattern: /Kaplan-Meier/gi, test: 'Kaplan-Meier' },
      { pattern: /Cox/gi, test: 'Cox regression' },
      { pattern: /logistic regression/gi, test: 'Logistic regression' },
      { pattern: /mixed model/gi, test: 'Mixed model' },
      { pattern: /MMRM/gi, test: 'MMRM' },
    ]
    
    testPatterns.forEach(({ pattern, test }) => {
      if (pattern.test(text)) {
        tests.push({
          endpointId: 'general',
          test,
          description: `${test} analysis`,
        })
      }
    })
  }
  
  return tests
}

function extractSampleSizeDriver(content: string): string | undefined {
  const match = content.match(/sample\s+size[^.]*?(?:based\s+on|driven\s+by|calculated\s+for)[^.]*?([^.]+)/i)
  return match ? match[1].trim() : undefined
}

function extractAnalysisPopulations(content: string): AnalysisPopulation[] {
  const populations: AnalysisPopulation[] = []
  
  // Look for common analysis populations
  const populationPatterns = [
    { abbr: 'ITT', name: 'Intent-to-Treat', pattern: /intent[- ]to[- ]treat|ITT/i },
    { abbr: 'mITT', name: 'Modified Intent-to-Treat', pattern: /modified\s+intent[- ]to[- ]treat|mITT/i },
    { abbr: 'PP', name: 'Per-Protocol', pattern: /per[- ]protocol|PP\s+population/i },
    { abbr: 'Safety', name: 'Safety Population', pattern: /safety\s+(?:population|analysis\s+set)/i },
  ]
  
  populationPatterns.forEach(({ abbr, name, pattern }, index) => {
    if (pattern.test(content)) {
      populations.push({
        id: `pop_${index}`,
        name,
        abbreviation: abbr,
        description: `${name} population`,
      })
    }
  })
  
  return populations
}

function extractMissingDataStrategy(content: string): string | undefined {
  const match = content.match(/##?\s*Missing\s+Data\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  return match ? match[1].trim().substring(0, 500) : undefined
}

function extractMultiplicityStrategy(content: string): string | undefined {
  const match = content.match(/##?\s*Multiplicity\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  return match ? match[1].trim().substring(0, 500) : undefined
}

// ============================================================================
// CSR Extraction Helpers
// ============================================================================

function extractActualMethods(content: string): string[] {
  const methods: string[] = []
  const match = content.match(/##?\s*(?:Statistical\s+)?Methods?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) methods.push(cleaned)
    })
  }
  
  return methods
}

function extractCsrEndpoints(content: string, type: 'primary' | 'secondary'): CsrEndpoint[] {
  const endpoints: CsrEndpoint[] = []
  const pattern = type === 'primary'
    ? /##?\s*Primary\s+(?:Endpoint|Efficacy)\s*(?:Results?)?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i
    : /##?\s*Secondary\s+(?:Endpoint|Efficacy)\s*(?:Results?)?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i
  
  const match = content.match(pattern)
  if (match) {
    const text = match[1]
    // Try to extract endpoint name and result
    const lines = text.split('\n').filter(l => l.trim().length > 10)
    
    lines.slice(0, 5).forEach((line, index) => {
      endpoints.push({
        id: `csr_${type}_${index}`,
        name: line.trim().substring(0, 100),
        result: line.trim(),
      })
    })
  }
  
  return endpoints
}

function extractDeviations(content: string): string[] {
  const deviations: string[] = []
  const match = content.match(/##?\s*(?:Protocol\s+)?Deviations?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (match) {
    const items = match[1].split(/\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) deviations.push(cleaned)
    })
  }
  
  return deviations
}
