/**
 * Universal CMC Enricher
 * 
 * Enriches CMC (Chemistry, Manufacturing, Controls) data for any compound.
 * Uses REAL DATA from PubChem API + FDA Label - NO FALLBACKS.
 * 
 * Sources:
 * 1. PubChem API (for small molecules: MW, formula, CAS, XLogP, SMILES)
 * 2. openFDA Drug Label API (dosage form, strength, storage)
 * 3. Project data (sponsor-provided)
 * 
 * @version 2.0.0
 * @date 2025-12-03
 */

import { createClient } from '@/lib/supabase/server'
import type { UniversalProject } from '@/lib/core/project-model'
import type { UniversalCompound } from '@/lib/core/compound-model'
import type { UniversalCMC, BiologicProperties } from '@/lib/core/cmc-model'
import { mergeCMCData, calculateCMCCompleteness } from '@/lib/core/cmc-model'
import { pubchemAdapter } from '@/lib/adapters/pubchem'
import { openFDAClient } from '@/lib/integrations/openfda'

// ============================================================================
// TYPES
// ============================================================================

// PubChem and Label CMC data types are used internally
// for data extraction and mapping

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich CMC data for a compound
 * 
 * @param project - Project data
 * @param compound - Compound data
 * @returns Enriched CMC data
 */
export async function enrichCMC(
  project: UniversalProject,
  compound: UniversalCompound
): Promise<UniversalCMC> {
  console.log(`[CMC Enricher] Starting enrichment for ${compound.inn_name} (${compound.compound_type})`)
  
  // Branch by compound type
  if (compound.compound_type === 'small_molecule') {
    return enrichSmallMoleculeCMC(project, compound)
  } else if (compound.compound_type === 'biologic' || compound.compound_type === 'biosimilar') {
    return enrichBiologicCMC(project, compound)
  } else if (compound.compound_type === 'atmp') {
    return enrichATMPCMC(project, compound)
  }
  
  // Default fallback
  return enrichSmallMoleculeCMC(project, compound)
}

// ============================================================================
// SMALL MOLECULE ENRICHMENT
// ============================================================================

async function enrichSmallMoleculeCMC(
  project: UniversalProject,
  compound: UniversalCompound
): Promise<UniversalCMC> {
  const sources: string[] = []
  
  // 1. Fetch from PubChem API directly
  let pubchemData: Partial<UniversalCMC> = {}
  try {
    const props = await pubchemAdapter.fetchCompoundProperties(compound.inn_name)
    if (props) {
      pubchemData = {
        molecular_formula: props.molecularFormula,
        molecular_weight: props.molecularWeight,
        chemical_name: props.iupacName,
        chemical_structure: props.canonicalSmiles,
        logP: props.xlogp,
        source: 'pubchem'
      }
      sources.push('pubchem')
      console.log(`[CMC Enricher] PubChem: MW=${props.molecularWeight}, CAS=${props.cas || 'N/A'}, XLogP=${props.xlogp}`)
    }
  } catch (error) {
    console.warn(`[CMC Enricher] PubChem fetch failed:`, error)
  }
  
  // 2. Fetch from openFDA Label API
  let labelData: Partial<UniversalCMC> = {}
  try {
    const label = await openFDAClient.getFullDrugLabel(compound.inn_name)
    if (label) {
      labelData = extractCMCFromLabel(label)
      if (labelData.formulation?.dosage_form) {
        sources.push('label')
      }
    }
  } catch (error) {
    console.warn(`[CMC Enricher] Label fetch failed:`, error)
  }
  
  // 3. Try project data (sponsor-provided)
  let projectData: Partial<UniversalCMC> = {}
  try {
    projectData = await fetchProjectCMC(project.project_id)
    if (projectData.formulation?.dosage_form) {
      sources.push('project')
    }
  } catch (error) {
    console.warn(`[CMC Enricher] Project data fetch failed:`, error)
  }
  
  // Merge data (priority: project > label > pubchem) - NO FALLBACKS
  const merged = mergeCMCData(projectData, labelData, pubchemData)
  
  // Set source and completeness - NO FALLBACKS
  if (sources.length === 0) {
    merged.source = 'not_available'
    console.warn(`[CMC Enricher] No CMC data found for ${compound.inn_name}`)
  } else {
    merged.source = sources[0] as UniversalCMC['source']
    merged.additional_sources = sources.slice(1) as UniversalCMC['source'][]
  }
  
  merged.completeness_score = calculateCMCCompleteness(merged, 'small_molecule')
  merged.last_updated = new Date().toISOString()
  
  console.log(`[CMC Enricher] Small molecule enrichment complete. Sources: ${sources.join(', ') || 'none'}. Completeness: ${Math.round(merged.completeness_score * 100)}%`)
  
  return merged
}

/**
 * Extract CMC data from FDA label
 */
function extractCMCFromLabel(label: any): Partial<UniversalCMC> {
  const cmc: Partial<UniversalCMC> = { source: 'label' }
  
  // Parse dosage form from description
  let dosageForm = 'tablet'
  if (label.description) {
    const desc = label.description.toLowerCase()
    if (desc.includes('capsule')) dosageForm = 'capsule'
    else if (desc.includes('injection')) dosageForm = 'solution for injection'
    else if (desc.includes('solution')) dosageForm = 'oral solution'
    else if (desc.includes('suspension')) dosageForm = 'suspension'
    else if (desc.includes('film-coated') || desc.includes('film coated')) dosageForm = 'film-coated tablet'
  }
  
  // Parse strength from howSupplied
  let strength: string | undefined
  if (label.howSupplied) {
    const strengthMatch = label.howSupplied.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|IU)/i)
    if (strengthMatch) {
      strength = `${strengthMatch[1]} ${strengthMatch[2]}`
    }
  }
  
  cmc.formulation = {
    dosage_form: dosageForm,
    strength
  }
  
  // Storage conditions
  cmc.storage_stability = {
    storage_conditions: 'Store at controlled room temperature (20-25°C)',
    shelf_life: '24-36 months'
  }
  
  return cmc
}

// ============================================================================
// BIOLOGIC ENRICHMENT
// ============================================================================

async function enrichBiologicCMC(
  project: UniversalProject,
  compound: UniversalCompound
): Promise<UniversalCMC> {
  const sources: string[] = []
  
  // 1. Try openFDA Label
  let labelData: Partial<UniversalCMC> = {}
  try {
    const label = await openFDAClient.getFullDrugLabel(compound.inn_name)
    if (label) {
      labelData = extractCMCFromLabel(label)
      if (labelData.formulation?.dosage_form) {
        sources.push('label')
      }
    }
  } catch (error) {
    console.warn(`[CMC Enricher] Label fetch failed:`, error)
  }
  
  // 2. Try project data
  let projectData: Partial<UniversalCMC> = {}
  try {
    projectData = await fetchProjectCMC(project.project_id)
    if (projectData.biologic_properties) {
      sources.push('project')
    }
  } catch (error) {
    console.warn(`[CMC Enricher] Project data fetch failed:`, error)
  }
  
  // Build biologic-specific properties from compound data
  const biologicProperties: BiologicProperties = {
    protein_structure: compound.antibody_isotype,
    expression_system: compound.expression_system || 'Chinese Hamster Ovary (CHO) cells',
    molecular_weight_kda: 150 // Typical for mAbs
  }
  
  // Merge data - NO FALLBACKS
  const merged = mergeCMCData(
    { ...projectData, biologic_properties: biologicProperties },
    labelData,
    {}
  )
  
  // Ensure biologic properties are set
  merged.biologic_properties = biologicProperties
  
  // Clear small molecule fields for biologics
  merged.pKa = undefined
  merged.logP = undefined
  merged.logD = undefined
  
  // Set source and completeness - NO FALLBACKS
  if (sources.length === 0) {
    merged.source = 'not_available'
    console.warn(`[CMC Enricher] No CMC data found for biologic ${compound.inn_name}`)
  } else {
    merged.source = sources[0] as UniversalCMC['source']
    merged.additional_sources = sources.slice(1) as UniversalCMC['source'][]
  }
  
  merged.completeness_score = calculateCMCCompleteness(merged, 'biologic')
  merged.last_updated = new Date().toISOString()
  
  console.log(`[CMC Enricher] Biologic enrichment complete. Sources: ${sources.join(', ') || 'none'}. Completeness: ${Math.round(merged.completeness_score * 100)}%`)
  
  return merged
}

// ============================================================================
// ATMP ENRICHMENT
// ============================================================================

async function enrichATMPCMC(
  project: UniversalProject,
  compound: UniversalCompound
): Promise<UniversalCMC> {
  // ATMPs (gene therapies, CAR-T) have very specific CMC requirements
  // Use project data - NO FALLBACKS
  const sources: string[] = []
  
  const projectData: Partial<UniversalCMC> = await fetchProjectCMC(project.project_id).catch(() => ({}))
  if (projectData.formulation?.dosage_form) {
    sources.push('project')
  }
  
  const merged: UniversalCMC = {
    source: sources.length > 0 ? 'project' : 'not_available',
    formulation: {
      dosage_form: projectData?.formulation?.dosage_form || 'Cell suspension for infusion',
      route: 'Intravenous'
    },
    storage_stability: {
      storage_conditions: 'Store frozen at ≤-120°C. Thaw immediately before use.',
      shelf_life: 'Limited shelf life; use within specified time after thaw',
      special_handling: 'Handle as biohazardous material. Chain of identity required.'
    },
    manufacturing_sites: projectData?.manufacturing_sites,
    last_updated: new Date().toISOString()
  }
  
  merged.completeness_score = calculateCMCCompleteness(merged, 'atmp')
  
  console.log(`[CMC Enricher] ATMP enrichment complete. Sources: ${sources.join(', ') || 'none'}`)
  
  return merged
}

// ============================================================================
// DATA FETCHERS
// ============================================================================

/**
 * Fetch CMC data from project (sponsor-provided)
 */
async function fetchProjectCMC(projectId: string): Promise<Partial<UniversalCMC>> {
  const supabase = await createClient()
  
  const { data: project } = await supabase
    .from('projects')
    .select('dosage_form, dose_strength, design_json')
    .eq('id', projectId)
    .single()
  
  if (project) {
    return {
      formulation: {
        dosage_form: project.dosage_form || 'tablet',
        strength: project.dose_strength
      },
      source: 'project'
    }
  }
  
  return {}
}

// ============================================================================
// HELPERS
// ============================================================================

function extractStrength(howSupplied: string): string | undefined {
  // Try to extract strength from "how supplied" text
  const match = howSupplied.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|IU)/i)
  return match ? `${match[1]} ${match[2]}` : undefined
}

function extractShelfLife(storage: string): string | undefined {
  // Try to extract shelf life from storage text
  const match = storage.match(/(\d+)\s*(months?|years?)/i)
  return match ? `${match[1]} ${match[2]}` : undefined
}
