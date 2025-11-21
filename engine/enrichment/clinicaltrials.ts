/**
 * Enhanced ClinicalTrials.gov Enrichment
 * 
 * Fetches detailed trial information including eligibility, interventions, outcomes
 */

import { ClinicalTrialsAdapter } from '@/lib/adapters/clinicaltrials'
import type { Trial } from '@/lib/types/regulatory-data'

export interface EnhancedTrial extends Trial {
  detailed_description?: string
  eligibility_criteria?: {
    inclusion?: string[]
    exclusion?: string[]
    age_range?: string
    gender?: string
    healthy_volunteers?: boolean
  }
  interventions?: Array<{
    type: string
    name: string
    description?: string
    arm_group_labels?: string[]
  }>
  primary_outcomes?: Array<{
    measure: string
    time_frame?: string
    description?: string
  }>
  secondary_outcomes?: Array<{
    measure: string
    time_frame?: string
    description?: string
  }>
  study_design?: {
    allocation?: string
    intervention_model?: string
    masking?: string
    primary_purpose?: string
  }
  enrollment?: {
    count: number
    type: string
  }
}

export class ClinicalTrialsEnrichment {
  private adapter: ClinicalTrialsAdapter

  constructor() {
    this.adapter = new ClinicalTrialsAdapter()
  }

  /**
   * Fetch enhanced trial details
   */
  async fetchEnhancedTrials(
    drugName: string,
    maxResults: number = 20
  ): Promise<EnhancedTrial[]> {
    console.log(`🔬 Fetching enhanced trials for: ${drugName}`)

    // Search for trials
    const nctIds = await this.adapter.searchByDrug(drugName, maxResults)
    
    if (nctIds.length === 0) {
      console.log(`⚠️ No trials found for ${drugName}`)
      return []
    }

    console.log(`📋 Found ${nctIds.length} trials, fetching details...`)

    // Fetch detailed information for each trial
    const trials: EnhancedTrial[] = []

    for (const nctId of nctIds) {
      try {
        const trial = await this.fetchTrialDetails(nctId)
        if (trial) {
          trials.push(trial)
        }
      } catch (error) {
        console.error(`Failed to fetch trial ${nctId}:`, error)
      }
    }

    console.log(`✅ Total enhanced trials: ${trials.length}`)
    return trials
  }

  /**
   * Fetch detailed trial information
   */
  private async fetchTrialDetails(nctId: string): Promise<EnhancedTrial | null> {
    try {
      // ClinicalTrials.gov API v2
      const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`Failed to fetch trial ${nctId}: ${response.status}`)
        return null
      }

      const data = await response.json()
      const study = data.protocolSection

      if (!study) {
        return null
      }

      // Extract identification
      const identification = study.identificationModule || {}
      const title = identification.officialTitle || identification.briefTitle || ''
      const nct_id = identification.nctId || nctId

      // Extract status
      const statusModule = study.statusModule || {}
      const status = statusModule.overallStatus || 'Unknown'
      const start_date = statusModule.startDateStruct?.date
      const completion_date = statusModule.completionDateStruct?.date

      // Extract sponsor
      const sponsorModule = study.sponsorCollaboratorsModule || {}
      const sponsor = sponsorModule.leadSponsor?.name || 'Unknown'

      // Extract phase
      const designModule = study.designModule || {}
      const phases = designModule.phases || []
      const phase = phases.length > 0 ? phases.join(', ') : 'N/A'

      // Extract enrollment
      const enrollment = designModule.enrollmentInfo || {}

      // Extract conditions
      const conditionsModule = study.conditionsModule || {}
      const conditions = conditionsModule.conditions || []

      // Extract interventions
      const armsModule = study.armsInterventionsModule || {}
      const interventions = (armsModule.interventions || []).map((int: any) => ({
        type: int.type || 'Unknown',
        name: int.name || '',
        description: int.description,
        arm_group_labels: int.armGroupLabels
      }))

      // Extract outcomes
      const outcomesModule = study.outcomesModule || {}
      const primary_outcomes = (outcomesModule.primaryOutcomes || []).map((outcome: any) => ({
        measure: outcome.measure || '',
        time_frame: outcome.timeFrame,
        description: outcome.description
      }))

      const secondary_outcomes = (outcomesModule.secondaryOutcomes || []).map((outcome: any) => ({
        measure: outcome.measure || '',
        time_frame: outcome.timeFrame,
        description: outcome.description
      }))

      // Extract eligibility
      const eligibilityModule = study.eligibilityModule || {}
      const eligibilityCriteria = eligibilityModule.eligibilityCriteria || ''
      
      const eligibility_criteria = this.parseEligibility(eligibilityCriteria)

      // Extract description
      const descriptionModule = study.descriptionModule || {}
      const detailed_description = descriptionModule.detailedDescription

      // Build enhanced trial
      const trial: EnhancedTrial = {
        nct_id,
        inchikey: '', // Will be linked later
        title,
        status,
        phase,
        conditions,
        interventions: interventions.map((i: any) => i.name).join(', '),
        sponsor,
        start_date,
        completion_date,
        enrollment_count: enrollment.count,
        locations: [], // Would need additional parsing
        source: 'ClinicalTrials.gov',
        source_url: `https://clinicaltrials.gov/study/${nct_id}`,
        retrieved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Enhanced fields
        detailed_description,
        eligibility_criteria,
        interventions: interventions,
        primary_outcomes,
        secondary_outcomes,
        study_design: {
          allocation: designModule.designInfo?.allocation,
          intervention_model: designModule.designInfo?.interventionModel,
          masking: designModule.designInfo?.maskingInfo?.masking,
          primary_purpose: designModule.designInfo?.primaryPurpose
        },
        enrollment: {
          count: enrollment.count || 0,
          type: enrollment.type || 'Unknown'
        }
      }

      return trial
    } catch (error) {
      console.error(`Error fetching trial details for ${nctId}:`, error)
      return null
    }
  }

  /**
   * Parse eligibility criteria into structured format
   */
  private parseEligibility(criteriaText: string): {
    inclusion?: string[]
    exclusion?: string[]
    age_range?: string
    gender?: string
    healthy_volunteers?: boolean
  } {
    const result: any = {}

    // Extract inclusion criteria
    const inclusionMatch = criteriaText.match(/Inclusion Criteria:(.*?)(?=Exclusion Criteria:|$)/is)
    if (inclusionMatch) {
      result.inclusion = this.extractCriteriaList(inclusionMatch[1])
    }

    // Extract exclusion criteria
    const exclusionMatch = criteriaText.match(/Exclusion Criteria:(.*?)$/is)
    if (exclusionMatch) {
      result.exclusion = this.extractCriteriaList(exclusionMatch[1])
    }

    // Extract age range
    const ageMatch = criteriaText.match(/(?:age|aged)[:\s]+(\d+)\s*(?:to|-)\s*(\d+)/i)
    if (ageMatch) {
      result.age_range = `${ageMatch[1]}-${ageMatch[2]} years`
    }

    // Extract gender
    if (criteriaText.toLowerCase().includes('male and female')) {
      result.gender = 'All'
    } else if (criteriaText.toLowerCase().includes('female')) {
      result.gender = 'Female'
    } else if (criteriaText.toLowerCase().includes('male')) {
      result.gender = 'Male'
    }

    // Healthy volunteers
    result.healthy_volunteers = criteriaText.toLowerCase().includes('healthy volunteer')

    return result
  }

  /**
   * Extract criteria list from text
   */
  private extractCriteriaList(text: string): string[] {
    const criteria: string[] = []
    
    // Split by bullet points or numbers
    const lines = text.split(/\n+/)
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Remove bullet points, numbers, dashes
      const cleaned = trimmed.replace(/^[-•*\d.)\s]+/, '').trim()
      if (cleaned.length > 10) { // Ignore very short lines
        criteria.push(cleaned)
      }
    }

    return criteria
  }

  /**
   * Calculate trial relevance score
   */
  calculateRelevance(trial: EnhancedTrial, drugName: string): number {
    let score = 0
    const drugLower = drugName.toLowerCase()

    // Title mentions drug
    if (trial.title.toLowerCase().includes(drugLower)) {
      score += 30
    }

    // Intervention mentions drug
    if (trial.interventions?.some(i => i.name.toLowerCase().includes(drugLower))) {
      score += 25
    }

    // Phase 3 or 4 (more relevant)
    if (trial.phase.includes('3') || trial.phase.includes('4')) {
      score += 20
    }

    // Completed status
    if (trial.status === 'Completed') {
      score += 15
    }

    // Has primary outcomes
    if (trial.primary_outcomes && trial.primary_outcomes.length > 0) {
      score += 10
    }

    return Math.min(score, 100)
  }
}

// Export singleton
export const clinicalTrialsEnrichment = new ClinicalTrialsEnrichment()
