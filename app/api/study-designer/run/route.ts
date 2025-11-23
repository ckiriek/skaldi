/**
 * Phase H.UI v4: Study Designer API
 * 
 * POST /api/study-designer/run
 * Orchestrates full study design generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'
import { normalizeFormulation } from '@/lib/engine/formulation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      compound,
      indication,
      phase,
      primaryObjectiveType,
      comparatorStrategy,
      blinding,
      maxDuration,
      budgetLevel,
      regulatoryFocus,
      generateProtocol,
      generateIB,
      generateSAP,
      generateICF,
      detailLevel
    } = body
    
    if (!compound || !indication || !phase) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Compound, indication, and phase are required' } },
        { status: 400 }
      )
    }
    
    console.log(`🎨 Designing study for ${compound} - ${indication}`)
    
    // Step 1: Normalize formulation
    const formulation = normalizeFormulation(compound)
    const inn = formulation.apiName
    
    // Step 2: Build Knowledge Graph
    const kg = await buildKnowledgeGraph(inn)
    
    // Step 3: Select endpoints (simplified - would use ML ranking)
    const primaryEndpoint = kg.endpoints.length > 0 
      ? kg.endpoints[0].normalized.cleanedTitle
      : 'Change from baseline'
    
    const secondaryEndpoints = kg.endpoints.slice(1, 3).map(ep => ep.normalized.cleanedTitle)
    
    // Step 4: Calculate sample size (simplified)
    const sampleSize = calculateSampleSize({
      phase,
      primaryObjectiveType,
      budgetLevel
    })
    
    // Step 5: Generate study flow (simplified)
    const studyFlow = generateStudyFlow({
      phase,
      maxDuration,
      budgetLevel
    })
    
    // Step 6: Create project (simplified - would create in DB)
    const projectId = `proj-${Date.now()}`
    
    // Step 7: Generate documents (simplified)
    const generated: any = {
      projectId
    }
    
    if (generateProtocol) {
      generated.protocol = {
        documentId: `doc-protocol-${Date.now()}`,
        quality: detailLevel
      }
    }
    
    if (generateIB) {
      generated.ib = {
        documentId: `doc-ib-${Date.now()}`,
        quality: 'skeleton'
      }
    }
    
    if (generateSAP) {
      generated.sap = {
        documentId: `doc-sap-${Date.now()}`,
        quality: detailLevel
      }
    }
    
    generated.studyflow = studyFlow
    generated.stats = {
      sampleSize,
      primaryEndpoint,
      secondaryEndpoints
    }
    
    // Warnings
    const warnings = []
    if (kg.indications.length === 0) {
      warnings.push({
        code: 'NO_KG_INDICATIONS',
        message: `No Knowledge Graph data found for ${indication}`
      })
    }
    
    return NextResponse.json({
      success: true,
      projectId,
      generated,
      warnings,
      meta: {
        compound,
        indication,
        phase,
        inn,
        kgSources: kg.sourcesUsed.length
      }
    })
    
  } catch (error) {
    console.error('Study design generation error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate study design'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate sample size (simplified)
 */
function calculateSampleSize(params: {
  phase: string
  primaryObjectiveType: string
  budgetLevel: string
}): { total: number; perArm: number; assumptions: any } {
  // Simplified calculation
  let baseSize = 100
  
  if (params.phase === 'Phase 1') baseSize = 40
  if (params.phase === 'Phase 2') baseSize = 100
  if (params.phase === 'Phase 3') baseSize = 300
  
  if (params.budgetLevel === 'low') baseSize = Math.floor(baseSize * 0.7)
  if (params.budgetLevel === 'high') baseSize = Math.floor(baseSize * 1.3)
  
  return {
    total: baseSize,
    perArm: Math.floor(baseSize / 2),
    assumptions: {
      alpha: 0.05,
      power: 0.80,
      dropout: 0.15
    }
  }
}

/**
 * Generate study flow (simplified)
 */
function generateStudyFlow(params: {
  phase: string
  maxDuration: number
  budgetLevel: string
}): any {
  const visits = []
  const weeks = params.maxDuration || 24
  
  // Screening
  visits.push({ name: 'Screening', week: -2 })
  
  // Baseline
  visits.push({ name: 'Baseline', week: 0 })
  
  // Follow-up visits
  const visitInterval = params.budgetLevel === 'low' ? 8 : 4
  for (let week = visitInterval; week <= weeks; week += visitInterval) {
    visits.push({ name: `Week ${week}`, week })
  }
  
  // End of study
  if (visits[visits.length - 1].week !== weeks) {
    visits.push({ name: 'End of Study', week: weeks })
  }
  
  return {
    id: `flow-${Date.now()}`,
    visits,
    totalDuration: weeks
  }
}
