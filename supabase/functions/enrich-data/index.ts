/**
 * Enrich Data Edge Function - COMPLETE INTEGRATION v2.0
 * 
 * Regulatory Data Agent - Multi-Source Data Enrichment
 * 
 * Integrates 6 data sources:
 * 1. PubChem - InChIKey resolution & chemical data
 * 2. Orange Book - RLD & TE codes (Generic only)
 * 3. DailyMed - Current FDA labels
 * 4. openFDA - FDA labels & FAERS (fallback)
 * 5. ClinicalTrials.gov - Clinical trial data
 * 6. PubMed - Scientific literature
 * 
 * Version: 2.0.0
 * Date: 2025-11-11
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { DataNormalizer } from './normalizer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrichRequest {
  project_id: string
}

interface EnrichmentError {
  code: string
  message: string
  source: string
  severity: 'error' | 'warning' | 'info'
}

interface EnrichmentMetrics {
  sources_used: string[]
  coverage: {
    compound_identity: number
    rld_info: number
    labels: number
    clinical: number
    literature: number
  }
  records_fetched: {
    labels: number
    trials: number
    literature: number
    adverse_events: number
  }
  errors: EnrichmentError[]
}

// ============================================================================
// PUBCHEM ADAPTER
// ============================================================================

class PubChemAdapter {
  private baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
  private lastRequestTime = 0
  private minRequestInterval = 200 // 5 req/sec

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async resolveToInChIKey(name: string): Promise<string | null> {
    try {
      await this.rateLimit()
      const searchUrl = `${this.baseUrl}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      const searchResponse = await fetch(searchUrl)

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          console.warn(`PubChem: Compound "${name}" not found`)
          return null
        }
        throw new Error(`PubChem search failed: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      const cid = searchData.IdentifierList?.CID?.[0]
      if (!cid) return null

      await this.rateLimit()
      const inchikeyUrl = `${this.baseUrl}/compound/cid/${cid}/property/InChIKey/JSON`
      const inchikeyResponse = await fetch(inchikeyUrl)

      if (!inchikeyResponse.ok) {
        throw new Error(`PubChem InChIKey fetch failed: ${inchikeyResponse.status}`)
      }

      const inchikeyData = await inchikeyResponse.json()
      const inchikey = inchikeyData.PropertyTable?.Properties?.[0]?.InChIKey

      console.log(`✅ PubChem: Resolved "${name}" → ${inchikey} (CID: ${cid})`)
      return inchikey || null
    } catch (error) {
      console.error(`PubChem resolveToInChIKey error:`, error)
      return null
    }
  }

  async fetchCompound(name: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const searchUrl = `${this.baseUrl}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      const searchResponse = await fetch(searchUrl)

      if (!searchResponse.ok) return null

      const searchData = await searchResponse.json()
      const cid = searchData.IdentifierList?.CID?.[0]
      if (!cid) return null

      await this.rateLimit()
      const compoundUrl = `${this.baseUrl}/compound/cid/${cid}/JSON`
      const compoundResponse = await fetch(compoundUrl)

      if (!compoundResponse.ok) {
        throw new Error(`PubChem compound fetch failed: ${compoundResponse.status}`)
      }

      const compoundData = await compoundResponse.json()
      const pcCompound = compoundData.PC_Compounds?.[0]
      if (!pcCompound) return null

      const props = pcCompound.props || []
      const getProp = (label: string): string | number | undefined => {
        const prop = props.find((p: any) => p.urn.label === label || p.urn.name === label)
        return prop?.value?.sval || prop?.value?.fval || prop?.value?.ival
      }

      const inchikey = getProp('InChIKey') as string
      const iupacName = getProp('IUPAC Name') as string
      const molecularFormula = getProp('Molecular Formula') as string
      const molecularWeight = getProp('Molecular Weight') as number
      const smiles = getProp('SMILES') as string
      const synonyms = (getProp('Synonym') as string)?.split('\n') || []

      if (!inchikey) return null

      return {
        inchikey,
        name: iupacName || name,
        synonyms: synonyms.slice(0, 10),
        molecular_weight: molecularWeight,
        molecular_formula: molecularFormula,
        smiles,
        chemical_structure_url: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`,
        source: 'PubChem',
        source_id: cid.toString(),
        source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
      }
    } catch (error) {
      console.error(`PubChem fetchCompound error:`, error)
      return null
    }
  }
}

// ============================================================================
// ORANGE BOOK ADAPTER
// ============================================================================

class OrangeBookAdapter {
  private baseUrl = 'https://api.fda.gov/drug/drugsfda.json'
  private lastRequestTime = 0
  private minRequestInterval = 250 // 240 req/min

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async getRLDByApplicationNumber(applicationNumber: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const cleanAppNum = applicationNumber.replace(/^(NDA|ANDA|BLA)/i, '')
      const url = `${this.baseUrl}?search=application_number:${cleanAppNum}&limit=1`

      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Orange Book: Application ${applicationNumber} not found`)
        return null
      }

      const data = await response.json()
      const results = data.results?.[0]
      if (!results) return null

      const products = results.products || []
      const rldProduct = products.find((p: any) => p.reference_listed_drug === 'Yes')

      if (!rldProduct) {
        console.warn(`Orange Book: No RLD found for ${applicationNumber}`)
        return null
      }

      console.log(`✅ Orange Book: Found RLD for ${applicationNumber}`)
      return {
        application_number: results.application_number,
        brand_name: rldProduct.brand_name,
        active_ingredients: rldProduct.active_ingredients?.map((ai: any) => ai.name) || [],
        dosage_form: rldProduct.dosage_form,
        route: rldProduct.route,
        te_code: rldProduct.te_code,
        approval_date: rldProduct.approval_date,
        reference_listed_drug: true,
        source: 'FDA Orange Book',
        source_url: `https://www.accessdata.fda.gov/scripts/cder/ob/results_product.cfm?Appl_Type=N&Appl_No=${cleanAppNum}`,
        retrieved_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`Orange Book getRLDByApplicationNumber error:`, error)
      return null
    }
  }
}

// ============================================================================
// DAILYMED ADAPTER
// ============================================================================

class DailyMedAdapter {
  private baseUrl = 'https://dailymed.nlm.nih.gov/dailymed'
  private lastRequestTime = 0
  private minRequestInterval = 200 // 5 req/sec

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  private cleanHTML(html: string): string {
    if (!html) return ''
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  async searchByApplicationNumber(applicationNumber: string): Promise<string[]> {
    try {
      await this.rateLimit()
      const cleanAppNum = applicationNumber.replace(/^(NDA|ANDA|BLA)/i, '')
      const url = `${this.baseUrl}/services/v2/spls.json?application_number=${cleanAppNum}`

      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const setids = data.data?.map((item: any) => item.setid) || []

      console.log(`✅ DailyMed: Found ${setids.length} label(s) for ${applicationNumber}`)
      return setids
    } catch (error) {
      console.error(`DailyMed searchByApplicationNumber error:`, error)
      return []
    }
  }

  /**
   * Map LOINC section codes to human-readable section names
   */
  private sectionCodeMap: Record<string, string> = {
    '34067-9': 'indications_and_usage',
    '34068-7': 'dosage_and_administration',
    '34070-3': 'contraindications',
    '43685-7': 'warnings_and_precautions',
    '34084-4': 'adverse_reactions',
    '34073-7': 'drug_interactions',
    '43684-0': 'use_in_specific_populations',
    '34090-1': 'clinical_pharmacology',
    '34092-7': 'nonclinical_toxicology',
    '34091-9': 'clinical_studies',
    '34069-5': 'how_supplied',
    '34076-0': 'patient_counseling',
    '34089-3': 'description',
    '34066-1': 'boxed_warning',
    '42229-5': 'spl_unclassified_section',
    '51945-4': 'overdosage',
    '34088-5': 'mechanism_of_action',
    '43682-4': 'pharmacokinetics',
    '43681-6': 'pharmacodynamics',
  }

  async fetchLabelBySetid(setid: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/services/v2/spls/${setid}.json`

      const response = await fetch(url)
      if (!response.ok) return null

      const data = await response.json()
      const spl = data.data
      if (!spl) return null

      // Parse all sections with full text
      const sections: Record<string, string> = {}
      let fullText = ''
      
      if (spl.spl_sections && Array.isArray(spl.spl_sections)) {
        for (const section of spl.spl_sections) {
          const sectionName = this.sectionCodeMap[section.section_code] || section.section_title?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
          const cleanText = this.cleanHTML(section.section_text || '')
          if (cleanText) {
            sections[sectionName] = cleanText
            fullText += `## ${section.section_title || sectionName}\n${cleanText}\n\n`
          }
        }
      }
      
      console.log(`✅ DailyMed: Fetched label ${setid} with ${Object.keys(sections).length} sections`)
      return {
        label_type: 'FDA_SPL',
        effective_date: spl.effective_time,
        version: spl.version_number,
        setid,
        title: spl.title,
        author: spl.author,
        sections,
        full_text: fullText.trim(),
        source: 'DailyMed',
        source_url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
      }
    } catch (error) {
      console.error(`DailyMed fetchLabelBySetid error:`, error)
      return null
    }
  }

  /**
   * Search by drug name (for biologics/innovators without application number)
   */
  async searchByDrugName(drugName: string): Promise<string[]> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/services/v2/spls.json?drug_name=${encodeURIComponent(drugName)}`

      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const setids = data.data?.map((item: any) => item.setid) || []

      console.log(`✅ DailyMed: Found ${setids.length} label(s) for drug name "${drugName}"`)
      return setids
    } catch (error) {
      console.error(`DailyMed searchByDrugName error:`, error)
      return []
    }
  }

  async fetchLatestLabelByApplicationNumber(applicationNumber: string): Promise<any | null> {
    const setids = await this.searchByApplicationNumber(applicationNumber)
    if (setids.length === 0) return null

    // Fetch first setid (most recent)
    return await this.fetchLabelBySetid(setids[0])
  }

  /**
   * Fetch latest label by drug name (fallback for biologics)
   */
  async fetchLatestLabelByDrugName(drugName: string): Promise<any | null> {
    const setids = await this.searchByDrugName(drugName)
    if (setids.length === 0) return null

    // Fetch first setid (most recent)
    return await this.fetchLabelBySetid(setids[0])
  }
}

// ============================================================================
// OPENFDA ADAPTER
// ============================================================================

class OpenFDAAdapter {
  private baseUrl = 'https://api.fda.gov'
  private lastRequestTime = 0
  private minRequestInterval = 250 // 240 req/min

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async fetchLabelByApplicationNumber(applicationNumber: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const cleanAppNum = applicationNumber.replace(/^(NDA|ANDA|BLA)/i, '')
      const url = `${this.baseUrl}/drug/label.json?search=openfda.application_number:${cleanAppNum}&limit=1`

      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`openFDA: Label not found for ${applicationNumber}`)
        return null
      }

      const data = await response.json()
      const result = data.results?.[0]
      if (!result) return null

      const sections: any = {
        indications_and_usage: result.indications_and_usage?.join('\n\n'),
        dosage_and_administration: result.dosage_and_administration?.join('\n\n'),
        contraindications: result.contraindications?.join('\n\n'),
        warnings_and_precautions: result.warnings_and_precautions?.join('\n\n') || result.warnings?.join('\n\n'),
        adverse_reactions_label: result.adverse_reactions?.join('\n\n'),
        drug_interactions: result.drug_interactions?.join('\n\n'),
      }

      console.log(`✅ openFDA: Fetched label for ${applicationNumber}`)
      return {
        label_type: 'FDA_SPL',
        effective_date: result.effective_time,
        setid: result.set_id,
        sections,
        source: 'openFDA',
        source_url: `https://api.fda.gov/drug/label.json?search=openfda.application_number:${cleanAppNum}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
      }
    } catch (error) {
      console.error(`openFDA fetchLabelByApplicationNumber error:`, error)
      return null
    }
  }

  /**
   * Fetch FDA label by generic drug name (for biologics/innovators)
   */
  async fetchLabelByDrugName(drugName: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`

      const response = await fetch(url)
      if (!response.ok) return null

      const data = await response.json()
      const result = data.results?.[0]
      if (!result) return null

      const sections: any = {
        indications_and_usage: result.indications_and_usage?.join('\n\n'),
        dosage_and_administration: result.dosage_and_administration?.join('\n\n'),
        contraindications: result.contraindications?.join('\n\n'),
        warnings_and_precautions: result.warnings_and_precautions?.join('\n\n') || result.warnings?.join('\n\n'),
        adverse_reactions: result.adverse_reactions?.join('\n\n'),
        drug_interactions: result.drug_interactions?.join('\n\n'),
        clinical_pharmacology: result.clinical_pharmacology?.join('\n\n'),
        clinical_studies: result.clinical_studies?.join('\n\n'),
        mechanism_of_action: result.mechanism_of_action?.join('\n\n'),
        pharmacokinetics: result.pharmacokinetics?.join('\n\n'),
        pharmacodynamics: result.pharmacodynamics?.join('\n\n'),
        nonclinical_toxicology: result.nonclinical_toxicology?.join('\n\n'),
        use_in_specific_populations: result.use_in_specific_populations?.join('\n\n'),
        overdosage: result.overdosage?.join('\n\n'),
        description: result.description?.join('\n\n'),
        boxed_warning: result.boxed_warning?.join('\n\n'),
      }

      // Remove empty sections
      Object.keys(sections).forEach(key => {
        if (!sections[key]) delete sections[key]
      })

      console.log(`✅ openFDA: Fetched label for "${drugName}" with ${Object.keys(sections).length} sections`)
      return {
        label_type: 'FDA_SPL',
        effective_date: result.effective_time,
        setid: result.set_id,
        title: result.openfda?.brand_name?.[0] || drugName,
        sections,
        source: 'openFDA',
        source_url: `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encodeURIComponent(drugName)}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
      }
    } catch (error) {
      console.error(`openFDA fetchLabelByDrugName error:`, error)
      return null
    }
  }

  async searchAdverseEvents(drugName: string, limit: number = 5): Promise<any[]> {
    try {
      await this.rateLimit()
      // Search FAERS for patient.drug.medicinalproduct and count by reaction
      const url = `${this.baseUrl}/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`
      
      const response = await fetch(url)
      if (!response.ok) {
        // 404 is expected if no events found
        if (response.status !== 404) {
          console.warn(`openFDA FAERS error ${response.status} for ${drugName}`)
        }
        return []
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error(`openFDA searchAdverseEvents error:`, error)
      return []
    }
  }
}

// ============================================================================
// CLINICALTRIALS.GOV ADAPTER
// ============================================================================

interface TrialData {
  nct_id: string
  title: string
  phase: string | null
  status: string | null
  enrollment: number | null
  start_date: string | null
  completion_date: string | null
  study_type: string | null
  intervention_model: string | null
  masking: string | null
  primary_purpose: string | null
  conditions: string[]
  interventions: any[]
  outcomes_primary: any[]
  outcomes_secondary: any[]
  eligibility: any
  sponsor: string | null
  collaborators: string[]
  locations_count: number
  brief_summary: string | null
}

class ClinicalTrialsAdapter {
  private baseUrl = 'https://clinicaltrials.gov/api/v2'
  private lastRequestTime = 0
  private minRequestInterval = 1200 // 50 req/min

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async searchTrialsByDrug(drugName: string, maxResults: number = 5): Promise<string[]> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/studies?query.term=${encodeURIComponent(drugName)}&pageSize=${maxResults}&format=json`

      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const nctIds = data.studies?.map((study: any) => 
        study.protocolSection?.identificationModule?.nctId
      ).filter(Boolean) || []

      console.log(`✅ ClinicalTrials.gov: Found ${nctIds.length} trials for ${drugName}`)
      return nctIds
    } catch (error) {
      console.error(`ClinicalTrials.gov searchTrialsByDrug error:`, error)
      return []
    }
  }

  /**
   * Search trials and return FULL data (not just NCT IDs)
   */
  async searchTrialsWithFullData(drugName: string, maxResults: number = 20): Promise<TrialData[]> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/studies?query.term=${encodeURIComponent(drugName)}&pageSize=${maxResults}&format=json`

      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const studies = data.studies || []

      const trials: TrialData[] = studies.map((study: any) => {
        const protocol = study.protocolSection || {}
        const identification = protocol.identificationModule || {}
        const status = protocol.statusModule || {}
        const description = protocol.descriptionModule || {}
        const design = protocol.designModule || {}
        const eligibility = protocol.eligibilityModule || {}
        const contacts = protocol.contactsLocationsModule || {}
        const sponsor = protocol.sponsorCollaboratorsModule || {}
        const outcomes = protocol.outcomesModule || {}
        const arms = protocol.armsInterventionsModule || {}
        const conditions = protocol.conditionsModule || {}

        return {
          nct_id: identification.nctId,
          title: identification.officialTitle || identification.briefTitle || 'Untitled',
          phase: design.phases?.join(', ') || null,
          status: status.overallStatus || null,
          enrollment: design.enrollmentInfo?.count || null,
          start_date: status.startDateStruct?.date || null,
          completion_date: status.completionDateStruct?.date || null,
          study_type: design.studyType || null,
          intervention_model: design.designInfo?.interventionModel || null,
          masking: design.designInfo?.maskingInfo?.masking || null,
          primary_purpose: design.designInfo?.primaryPurpose || null,
          conditions: conditions.conditions || [],
          interventions: (arms.interventions || []).map((i: any) => ({
            type: i.type,
            name: i.name,
            description: i.description,
          })),
          outcomes_primary: (outcomes.primaryOutcomes || []).map((o: any) => ({
            measure: o.measure,
            description: o.description,
            timeFrame: o.timeFrame,
          })),
          outcomes_secondary: (outcomes.secondaryOutcomes || []).map((o: any) => ({
            measure: o.measure,
            description: o.description,
            timeFrame: o.timeFrame,
          })),
          eligibility: {
            criteria: eligibility.eligibilityCriteria,
            sex: eligibility.sex,
            minAge: eligibility.minimumAge,
            maxAge: eligibility.maximumAge,
            healthyVolunteers: eligibility.healthyVolunteers,
          },
          sponsor: sponsor.leadSponsor?.name || null,
          collaborators: (sponsor.collaborators || []).map((c: any) => c.name),
          locations_count: contacts.locations?.length || 0,
          brief_summary: description.briefSummary || null,
        }
      }).filter((t: TrialData) => t.nct_id)

      console.log(`✅ ClinicalTrials.gov: Fetched full data for ${trials.length} trials`)
      return trials
    } catch (error) {
      console.error(`ClinicalTrials.gov searchTrialsWithFullData error:`, error)
      return []
    }
  }

  /**
   * Fetch study results for trials that have posted results
   * ClinicalTrials.gov v2 API includes resultsSection when available
   */
  async fetchTrialResults(nctId: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/studies/${nctId}?format=json`

      const response = await fetch(url)
      if (!response.ok) return null

      const data = await response.json()
      const study = data
      
      // Check if results are posted
      const resultsSection = study.resultsSection
      if (!resultsSection) {
        return null // No results posted yet
      }

      const participantFlow = resultsSection.participantFlowModule || {}
      const baselineCharacteristics = resultsSection.baselineCharacteristicsModule || {}
      const outcomeMeasures = resultsSection.outcomeMeasuresModule || {}
      const adverseEvents = resultsSection.adverseEventsModule || {}
      const moreInfoModule = resultsSection.moreInfoModule || {}

      return {
        nct_id: nctId,
        has_results: true,
        participant_flow: {
          recruitment_details: participantFlow.recruitmentDetails,
          pre_assignment_details: participantFlow.preAssignmentDetails,
          groups: participantFlow.groups?.map((g: any) => ({
            id: g.id,
            title: g.title,
            description: g.description,
          })),
          periods: participantFlow.periods?.map((p: any) => ({
            title: p.title,
            milestones: p.milestones,
            dropWithdraws: p.dropWithdraws,
          })),
        },
        baseline: {
          population_description: baselineCharacteristics.populationDescription,
          groups: baselineCharacteristics.groups?.map((g: any) => ({
            id: g.id,
            title: g.title,
            description: g.description,
          })),
          measures: baselineCharacteristics.measures?.slice(0, 20).map((m: any) => ({
            title: m.title,
            description: m.description,
            units: m.unitOfMeasure,
            param_type: m.paramType,
            classes: m.classes?.slice(0, 5),
          })),
        },
        outcomes: {
          measures: outcomeMeasures.outcomeMeasures?.map((om: any) => ({
            type: om.type, // PRIMARY, SECONDARY, OTHER
            title: om.title,
            description: om.description,
            time_frame: om.timeFrame,
            population: om.populationDescription,
            units: om.unitOfMeasure,
            param_type: om.paramType,
            dispersion_type: om.dispersionType,
            groups: om.groups?.map((g: any) => ({
              id: g.id,
              title: g.title,
            })),
            classes: om.classes?.slice(0, 10).map((c: any) => ({
              title: c.title,
              categories: c.categories?.map((cat: any) => ({
                title: cat.title,
                measurements: cat.measurements,
              })),
            })),
            analyses: om.analyses?.slice(0, 5).map((a: any) => ({
              groups: a.groupIds,
              non_inferiority_type: a.nonInferiorityType,
              p_value: a.pValue,
              statistical_method: a.statisticalMethod,
              ci_percent: a.ciPctValue,
              ci_lower: a.ciLowerLimit,
              ci_upper: a.ciUpperLimit,
              estimate_comment: a.estimateComment,
            })),
          })),
        },
        adverse_events: {
          frequency_threshold: adverseEvents.frequencyThreshold,
          time_frame: adverseEvents.timeFrame,
          description: adverseEvents.description,
          all_cause_mortality_comment: adverseEvents.allCauseMortalityComment,
          serious_events: adverseEvents.seriousEvents?.slice(0, 30).map((e: any) => ({
            term: e.term,
            organ_system: e.organSystem,
            assessment_type: e.assessmentType,
            stats: e.stats?.map((s: any) => ({
              group_id: s.groupId,
              num_events: s.numEvents,
              num_affected: s.numAffected,
              num_at_risk: s.numAtRisk,
            })),
          })),
          other_events: adverseEvents.otherEvents?.slice(0, 50).map((e: any) => ({
            term: e.term,
            organ_system: e.organSystem,
            stats: e.stats?.map((s: any) => ({
              group_id: s.groupId,
              num_events: s.numEvents,
              num_affected: s.numAffected,
              num_at_risk: s.numAtRisk,
            })),
          })),
        },
        limitations: moreInfoModule.limitationsAndCaveats,
        certain_agreement: moreInfoModule.certainAgreement,
        point_of_contact: moreInfoModule.pointOfContact,
      }
    } catch (error) {
      console.error(`ClinicalTrials.gov fetchTrialResults error for ${nctId}:`, error)
      return null
    }
  }

  /**
   * Search trials with results and fetch their full results data
   */
  async searchTrialsWithResults(drugName: string, maxResults: number = 10): Promise<any[]> {
    try {
      await this.rateLimit()
      // Filter for studies with results
      const url = `${this.baseUrl}/studies?query.term=${encodeURIComponent(drugName)}&filter.resultsFirstSubmitDate=MIN,MAX&pageSize=${maxResults}&format=json`

      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const studies = data.studies || []
      
      const resultsPromises = studies.map(async (study: any) => {
        const nctId = study.protocolSection?.identificationModule?.nctId
        if (!nctId) return null
        
        // Check if has results section
        if (study.hasResults) {
          return await this.fetchTrialResults(nctId)
        }
        return null
      })

      const results = await Promise.all(resultsPromises)
      const validResults = results.filter(r => r !== null)
      
      console.log(`✅ ClinicalTrials.gov: Fetched results for ${validResults.length} trials`)
      return validResults
    } catch (error) {
      console.error(`ClinicalTrials.gov searchTrialsWithResults error:`, error)
      return []
    }
  }
}

// ============================================================================
// PUBMED ADAPTER
// ============================================================================

interface PublicationData {
  pmid: string
  title: string
  authors: string[]
  journal: string | null
  publication_date: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  doi: string | null
  abstract: string | null
  keywords: string[]
  mesh_terms: string[]
  publication_types: string[]
}

class PubMedAdapter {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  private email = 'skaldi@asetria.com'
  private tool = 'skaldi'
  private apiKey = Deno.env.get('NCBI_API_KEY') || ''
  private lastRequestTime = 0
  private minRequestInterval = this.apiKey ? 100 : 334 // 10 req/sec with API key, 3 without

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async searchByDrug(drugName: string, maxResults: number = 10): Promise<string[]> {
    try {
      await this.rateLimit()
      const query = `${drugName}[Title/Abstract] AND (clinical trial[Publication Type] OR randomized controlled trial[Publication Type])`
      const params = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retmax: maxResults.toString(),
        retmode: 'json',
        email: this.email,
        tool: this.tool,
      })
      if (this.apiKey) params.append('api_key', this.apiKey)

      const url = `${this.baseUrl}/esearch.fcgi?${params}`
      const response = await fetch(url)

      if (!response.ok) return []

      const data = await response.json()
      const pmids = data.esearchresult?.idlist || []

      console.log(`✅ PubMed: Found ${pmids.length} articles for ${drugName}`)
      return pmids
    } catch (error) {
      console.error(`PubMed searchByDrug error:`, error)
      return []
    }
  }

  /**
   * Search and fetch FULL publication data (title, abstract, authors, etc.)
   */
  async searchWithFullData(drugName: string, maxResults: number = 30): Promise<PublicationData[]> {
    try {
      // Step 1: Search for PMIDs
      const pmids = await this.searchByDrug(drugName, maxResults)
      if (pmids.length === 0) return []

      // Step 2: Fetch full data using efetch
      await this.rateLimit()
      const params = new URLSearchParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        email: this.email,
        tool: this.tool,
      })
      if (this.apiKey) params.append('api_key', this.apiKey)

      const url = `${this.baseUrl}/efetch.fcgi?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`PubMed efetch failed: ${response.status}`)
        return []
      }

      const xmlText = await response.text()
      const publications = this.parseXMLResponse(xmlText)

      console.log(`✅ PubMed: Fetched full data for ${publications.length} publications`)
      return publications
    } catch (error) {
      console.error(`PubMed searchWithFullData error:`, error)
      return []
    }
  }

  /**
   * Parse PubMed XML response to extract publication data
   */
  private parseXMLResponse(xml: string): PublicationData[] {
    const publications: PublicationData[] = []
    
    // Simple XML parsing using regex (Deno doesn't have DOMParser by default)
    const articleMatches = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || []
    
    for (const articleXml of articleMatches) {
      try {
        const pmid = this.extractTag(articleXml, 'PMID') || ''
        if (!pmid) continue

        const title = this.extractTag(articleXml, 'ArticleTitle') || 'Untitled'
        const abstract = this.extractTag(articleXml, 'AbstractText') || null
        const journal = this.extractTag(articleXml, 'Title') || null
        const volume = this.extractTag(articleXml, 'Volume') || null
        const issue = this.extractTag(articleXml, 'Issue') || null
        const pages = this.extractTag(articleXml, 'MedlinePgn') || null

        // Extract DOI
        const doiMatch = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)
        const doi = doiMatch ? doiMatch[1] : null

        // Extract publication date
        const year = this.extractTag(articleXml, 'Year')
        const month = this.extractTag(articleXml, 'Month')
        const day = this.extractTag(articleXml, 'Day')
        const publication_date = year ? `${year}${month ? '-' + month.padStart(2, '0') : ''}${day ? '-' + day.padStart(2, '0') : ''}` : null

        // Extract authors
        const authorMatches = articleXml.match(/<Author[^>]*>[\s\S]*?<\/Author>/g) || []
        const authors = authorMatches.map(authorXml => {
          const lastName = this.extractTag(authorXml, 'LastName') || ''
          const foreName = this.extractTag(authorXml, 'ForeName') || ''
          return `${lastName} ${foreName}`.trim()
        }).filter(a => a)

        // Extract keywords
        const keywordMatches = articleXml.match(/<Keyword[^>]*>([^<]+)<\/Keyword>/g) || []
        const keywords = keywordMatches.map(k => k.replace(/<[^>]+>/g, '').trim())

        // Extract MeSH terms
        const meshMatches = articleXml.match(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g) || []
        const mesh_terms = meshMatches.map(m => m.replace(/<[^>]+>/g, '').trim())

        // Extract publication types
        const pubTypeMatches = articleXml.match(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g) || []
        const publication_types = pubTypeMatches.map(p => p.replace(/<[^>]+>/g, '').trim())

        publications.push({
          pmid,
          title,
          authors,
          journal,
          publication_date,
          volume,
          issue,
          pages,
          doi,
          abstract,
          keywords,
          mesh_terms,
          publication_types,
        })
      } catch (error) {
        console.error(`Error parsing article:`, error)
      }
    }

    return publications
  }

  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
  }
}

// ============================================================================
// KNOWLEDGE GRAPH BUILDER (from enriched data)
// ============================================================================

interface KnowledgeGraphSnapshot {
  compound_name: string
  inchikey?: string
  sourcesUsed: string[]
  indications: Array<{
    id: string
    inn: string
    indication: string
    sources: string[]
    confidence: number
  }>
  endpoints: Array<{
    id: string
    inn: string
    normalized: string
    sources: string[]
    confidence: number
  }>
  safety: {
    common_aes: Array<{ term: string; frequency: string; source: string }>
    warnings: Array<{ text: string; source: string; severity: string }>
    contraindications: Array<{ text: string; source: string }>
  }
  rescueTherapy?: {
    allowed: boolean
    medications: string[]
    criteria: string
    source: string
  }
  trials: {
    total: number
    by_phase: Record<string, number>
    by_status: Record<string, number>
  }
  created_at: string
}

async function buildKnowledgeGraphFromEnrichedData(
  supabase: any,
  projectId: string,
  compoundName: string,
  inchikey: string | null,
  trials: any[],
  adverseEvents: any[],
  fdaLabel: any
): Promise<KnowledgeGraphSnapshot> {
  console.log(`🔨 Building Knowledge Graph for ${compoundName}`)
  
  const snapshot: KnowledgeGraphSnapshot = {
    compound_name: compoundName,
    inchikey: inchikey || undefined,
    sourcesUsed: [],
    indications: [],
    endpoints: [],
    safety: {
      common_aes: [],
      warnings: [],
      contraindications: []
    },
    trials: {
      total: trials.length,
      by_phase: {},
      by_status: {}
    },
    created_at: new Date().toISOString()
  }
  
  // Process trials
  if (trials.length > 0) {
    snapshot.sourcesUsed.push('ClinicalTrials.gov')
    
    const indicationMap = new Map<string, { count: number, sources: string[] }>()
    
    for (const trial of trials) {
      // Count by phase
      if (trial.phase) {
        snapshot.trials.by_phase[trial.phase] = (snapshot.trials.by_phase[trial.phase] || 0) + 1
      }
      
      // Count by status
      if (trial.status) {
        snapshot.trials.by_status[trial.status] = (snapshot.trials.by_status[trial.status] || 0) + 1
      }
      
      // Extract conditions/indications
      const conditions = trial.conditions || trial.indication_candidates || []
      for (const condition of conditions) {
        if (typeof condition === 'string' && condition.length > 3) {
          const key = condition.toLowerCase().trim()
          if (!indicationMap.has(key)) {
            indicationMap.set(key, { count: 0, sources: [] })
          }
          const entry = indicationMap.get(key)!
          entry.count++
          if (!entry.sources.includes('ctgov')) {
            entry.sources.push('ctgov')
          }
        }
      }
      
      // Extract endpoints
      const primaryOutcomes = trial.outcomes_primary || []
      const secondaryOutcomes = trial.outcomes_secondary || []
      
      for (const outcome of [...primaryOutcomes, ...secondaryOutcomes]) {
        if (outcome && typeof outcome === 'object') {
          const title = outcome.measure || outcome.title || ''
          if (title.length > 5) {
            snapshot.endpoints.push({
              id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              inn: compoundName,
              normalized: title,
              sources: ['ctgov'],
              confidence: primaryOutcomes.includes(outcome) ? 0.9 : 0.7
            })
          }
        }
      }
    }
    
    // Convert indication map to array
    for (const [indication, data] of indicationMap) {
      snapshot.indications.push({
        id: `ind-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        inn: compoundName,
        indication: indication,
        sources: data.sources,
        confidence: Math.min(0.5 + (data.count * 0.1), 0.95)
      })
    }
  }
  
  // Process adverse events
  if (adverseEvents.length > 0) {
    snapshot.sourcesUsed.push('openFDA FAERS')
    
    const sortedAEs = adverseEvents
      .filter((ae: any) => ae.term && ae.count)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 20)
    
    snapshot.safety.common_aes = sortedAEs.map((ae: any) => ({
      term: ae.term,
      frequency: String(ae.count),
      source: 'FAERS'
    }))
  }
  
  // Process FDA label
  if (fdaLabel && fdaLabel.sections) {
    snapshot.sourcesUsed.push('FDA Label')
    
    // Extract indications
    const indicationText = fdaLabel.sections.indications_and_usage || 
                          fdaLabel.sections.indications || ''
    if (indicationText) {
      snapshot.indications.unshift({
        id: `ind-fda-${Date.now()}`,
        inn: compoundName,
        indication: indicationText.substring(0, 500),
        sources: ['fda_label'],
        confidence: 1.0
      })
    }
    
    // Extract warnings
    const warningsText = fdaLabel.sections.warnings_and_precautions ||
                        fdaLabel.sections.warnings || ''
    if (warningsText) {
      snapshot.safety.warnings.push({
        text: warningsText.substring(0, 1000),
        source: 'FDA Label',
        severity: fdaLabel.sections.boxed_warning ? 'high' : 'medium'
      })
    }
    
    // Extract contraindications
    const contraText = fdaLabel.sections.contraindications || ''
    if (contraText) {
      snapshot.safety.contraindications.push({
        text: contraText.substring(0, 500),
        source: 'FDA Label'
      })
    }
    
    // Extract rescue therapy information from dosage/administration section
    const dosageText = fdaLabel.sections.dosage_and_administration || 
                      fdaLabel.sections.dosage || ''
    if (dosageText) {
      // Look for rescue/breakthrough/supplemental therapy mentions
      const rescueKeywords = ['rescue', 'breakthrough', 'supplemental', 'additional therapy', 
                             'inadequate response', 'treatment failure', 'add-on']
      const hasRescueInfo = rescueKeywords.some(kw => 
        dosageText.toLowerCase().includes(kw)
      )
      
      if (hasRescueInfo) {
        // Extract potential rescue medications from text
        const commonRescueMeds = [
          'insulin', 'metformin', 'sulfonylurea', 'glipizide', 'glyburide',
          'sitagliptin', 'linagliptin', 'empagliflozin', 'dapagliflozin',
          'acetaminophen', 'ibuprofen', 'morphine', 'hydrocodone',
          'albuterol', 'prednisone', 'hydrocortisone'
        ]
        
        const foundMeds = commonRescueMeds.filter(med => 
          dosageText.toLowerCase().includes(med)
        )
        
        snapshot.rescueTherapy = {
          allowed: true,
          medications: foundMeds.length > 0 ? foundMeds : ['Per investigator discretion'],
          criteria: 'As specified in FDA label dosage section',
          source: 'FDA Label'
        }
      }
    }
  }
  
  // Deduplicate indications
  const uniqueIndications = new Map<string, typeof snapshot.indications[0]>()
  for (const ind of snapshot.indications) {
    const key = ind.indication.toLowerCase().substring(0, 50)
    if (!uniqueIndications.has(key) || uniqueIndications.get(key)!.confidence < ind.confidence) {
      uniqueIndications.set(key, ind)
    }
  }
  snapshot.indications = Array.from(uniqueIndications.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20)
  
  // Deduplicate endpoints
  const uniqueEndpoints = new Map<string, typeof snapshot.endpoints[0]>()
  for (const ep of snapshot.endpoints) {
    const key = ep.normalized.toLowerCase().substring(0, 50)
    if (!uniqueEndpoints.has(key)) {
      uniqueEndpoints.set(key, ep)
    }
  }
  snapshot.endpoints = Array.from(uniqueEndpoints.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 30)
  
  console.log(`✅ KG: ${snapshot.indications.length} indications, ${snapshot.endpoints.length} endpoints, ${snapshot.safety.common_aes.length} AEs`)
  
  return snapshot
}

// ============================================================================
// MAIN EDGE FUNCTION
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { project_id }: EnrichRequest = await req.json()

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🚀 Starting FULL enrichment for project: ${project_id}`)

    // Fetch project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      console.error('Project not found:', projectError)
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()
    const metrics: EnrichmentMetrics = {
      sources_used: [],
      coverage: {
        compound_identity: 0,
        rld_info: 0,
        labels: 0,
        clinical: 0,
        literature: 0,
      },
      records_fetched: {
        labels: 0,
        trials: 0,
        literature: 0,
        adverse_events: 0,
      },
      errors: [],
    }

    // ========================================================================
    // STEP 1: PUBCHEM - Resolve InChIKey (optional for biologics)
    // ========================================================================
    console.log(`\n📍 STEP 1: PubChem - Resolving InChIKey`)
    const pubchem = new PubChemAdapter()
    let inchikey = await pubchem.resolveToInChIKey(project.compound_name)

    // For biologics, peptides, biosimilars - InChIKey may not exist
    // This is NOT a failure - we continue with compound name as identifier
    if (!inchikey) {
      console.warn(`⚠️  No InChIKey found for: ${project.compound_name}`)
      console.log(`   This is expected for biologics, peptides, and biosimilars`)
      console.log(`   Continuing enrichment using compound name as identifier...`)
      
      metrics.errors.push({
        code: 'W301_IDENTITY_UNRESOLVED',
        message: `No InChIKey for "${project.compound_name}" (expected for biologics/peptides)`,
        source: 'PubChem',
        severity: 'warning', // Changed from 'error' to 'warning'
      })
      
      // Generate a pseudo-identifier for biologics based on compound name
      // Format: BIOLOGIC-<normalized_name_hash>
      const normalizedName = project.compound_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      inchikey = `BIOLOGIC-${normalizedName.substring(0, 20)}`
      console.log(`   Using pseudo-identifier: ${inchikey}`)
    } else {
      metrics.sources_used.push('PubChem')
      metrics.coverage.compound_identity = 1.0
    }

    // Fetch full compound data (may fail for biologics, that's OK)
    const compoundData = await pubchem.fetchCompound(project.compound_name)
    if (compoundData) {
      await supabaseClient
        .from('compounds')
        .upsert({
          ...compoundData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'inchikey' })
      console.log(`✅ Stored compound data`)
    }

    // ========================================================================
    // STEP 2: ORANGE BOOK - RLD Info (Generic only)
    // ========================================================================
    if (project.product_type === 'generic' && project.rld_application_number) {
      console.log(`\n📍 STEP 2: Orange Book - Fetching RLD info`)
      const orangeBook = new OrangeBookAdapter()
      const rldInfo = await orangeBook.getRLDByApplicationNumber(project.rld_application_number)

      if (rldInfo) {
        metrics.sources_used.push('Orange Book')
        metrics.coverage.rld_info = 1.0
        console.log(`✅ Retrieved RLD information`)
      } else {
        metrics.errors.push({
          code: 'E302_RLD_NOT_FOUND',
          message: `RLD not found for application ${project.rld_application_number}`,
          source: 'Orange Book',
          severity: 'warning',
        })
      }
    }

    // ========================================================================
    // STEP 3: DAILYMED - Latest Label (with drug name fallback for biologics)
    // ========================================================================
    console.log(`\n📍 STEP 3: DailyMed - Fetching latest label`)
    const dailymed = new DailyMedAdapter()
    let dailymedLabel = null
    
    // Strategy 1: By application number (for generics with RLD)
    if (project.rld_application_number) {
      dailymedLabel = await dailymed.fetchLatestLabelByApplicationNumber(project.rld_application_number)
    }
    
    // Strategy 2: By drug name (for biologics, innovators, or when app number fails)
    if (!dailymedLabel && project.compound_name) {
      console.log(`📍 DailyMed: Trying drug name fallback for "${project.compound_name}"`)
      dailymedLabel = await dailymed.fetchLatestLabelByDrugName(project.compound_name)
    }
    
    // Strategy 3: Try brand name if available
    if (!dailymedLabel && project.rld_brand_name) {
      console.log(`📍 DailyMed: Trying brand name fallback for "${project.rld_brand_name}"`)
      dailymedLabel = await dailymed.fetchLatestLabelByDrugName(project.rld_brand_name)
    }
    
    if (dailymedLabel) {
        metrics.sources_used.push('DailyMed')
        metrics.records_fetched.labels++
        
        // Store label sections in external_data_cache (labels table uses product_id, not inchikey)
        if (dailymedLabel.sections) {
          const normalizer = new DataNormalizer()
          
          for (const [sectionName, content] of Object.entries(dailymedLabel.sections)) {
            if (!content || typeof content !== 'string') continue
            
            const normalized = normalizer.normalize(content, 'label_section')
            
            try {
              await supabaseClient
                .from('external_data_cache')
                .upsert({
                  compound_name: project.compound_name,
                  inchikey,
                  source: 'fda_label',
                  source_id: dailymedLabel.setid,
                  source_url: dailymedLabel.source_url,
                  content_type: 'label_section',
                  section_name: sectionName,
                  raw_content: content,
                  normalized_content: normalized.normalized_content,
                  payload: {
                    label_type: dailymedLabel.label_type,
                    effective_date: dailymedLabel.effective_date,
                    version: dailymedLabel.version,
                    ...normalized.metadata
                  },
                  confidence: 'high',
                }, {
                  onConflict: 'compound_name,source,source_id,content_type,section_name',
                  ignoreDuplicates: false
                })
              
              console.log(`✅ Cached label section: ${sectionName}`)
            } catch (error) {
              console.error(`❌ Error caching label section ${sectionName}:`, error)
            }
          }
        }
        
        console.log(`✅ Stored DailyMed label in cache`)
    }

    // ========================================================================
    // STEP 4: OPENFDA - FDA Label (fallback)
    // ========================================================================
    if (!dailymedLabel && project.rld_application_number) {
      console.log(`\n📍 STEP 4: openFDA - Fetching FDA label (fallback)`)
      const openfda = new OpenFDAAdapter()
      const openfdaLabel = await openfda.fetchLabelByApplicationNumber(project.rld_application_number)

      if (openfdaLabel) {
        metrics.sources_used.push('openFDA')
        metrics.records_fetched.labels++
        
        // Store label sections in external_data_cache
        if (openfdaLabel.sections) {
          const normalizer = new DataNormalizer()
          
          for (const [sectionName, content] of Object.entries(openfdaLabel.sections)) {
            if (!content || typeof content !== 'string') continue
            
            const normalized = normalizer.normalize(content, 'label_section')
            
            try {
              await supabaseClient
                .from('external_data_cache')
                .upsert({
                  compound_name: project.compound_name,
                  inchikey,
                  source: 'fda_label',
                  source_id: openfdaLabel.setid,
                  source_url: openfdaLabel.source_url,
                  content_type: 'label_section',
                  section_name: sectionName,
                  raw_content: content,
                  normalized_content: normalized.normalized_content,
                  payload: {
                    label_type: openfdaLabel.label_type,
                    effective_date: openfdaLabel.effective_date,
                    ...normalized.metadata
                  },
                  confidence: 'high',
                }, {
                  onConflict: 'compound_name,source,source_id,content_type,section_name',
                  ignoreDuplicates: false
                })
              
              console.log(`✅ Cached label section: ${sectionName}`)
            } catch (error) {
              console.error(`❌ Error caching label section ${sectionName}:`, error)
            }
          }
        }
        
        console.log(`✅ Stored openFDA label in cache`)
      }
    }

    // ========================================================================
    // STEP 4.1: OPENFDA - FDA Label by drug name (fallback for biologics)
    // ========================================================================
    if (!dailymedLabel && metrics.records_fetched.labels === 0 && project.compound_name) {
      console.log(`\n📍 STEP 4.1: openFDA - Fetching FDA label by drug name "${project.compound_name}"`)
      const openfda = new OpenFDAAdapter()
      const openfdaLabel = await openfda.fetchLabelByDrugName(project.compound_name)

      if (openfdaLabel) {
        metrics.sources_used.push('openFDA Labels')
        metrics.records_fetched.labels++
        
        // Store label sections in external_data_cache
        if (openfdaLabel.sections) {
          const normalizer = new DataNormalizer()
          
          for (const [sectionName, content] of Object.entries(openfdaLabel.sections)) {
            if (!content || typeof content !== 'string') continue
            
            const normalized = normalizer.normalize(content, 'label_section')
            
            try {
              await supabaseClient
                .from('external_data_cache')
                .upsert({
                  compound_name: project.compound_name,
                  inchikey,
                  source: 'fda_label',
                  source_id: openfdaLabel.setid || project.compound_name,
                  source_url: openfdaLabel.source_url,
                  content_type: 'label_section',
                  section_name: sectionName,
                  raw_content: content,
                  normalized_content: normalized.normalized_content,
                  payload: {
                    label_type: openfdaLabel.label_type,
                    effective_date: openfdaLabel.effective_date,
                    title: openfdaLabel.title,
                    ...normalized.metadata
                  },
                  confidence: 'high',
                }, {
                  onConflict: 'compound_name,source,source_id,content_type,section_name',
                  ignoreDuplicates: false
                })
              
              console.log(`✅ Cached label section: ${sectionName}`)
            } catch (error) {
              console.error(`❌ Error caching label section ${sectionName}:`, error)
            }
          }
        }
        
        console.log(`✅ Stored openFDA label by drug name in cache`)
      }
    }

    if (metrics.records_fetched.labels > 0) {
      metrics.coverage.labels = 1.0
    }

    // ========================================================================
    // STEP 4.5: OPENFDA - FAERS (Safety Data)
    // ========================================================================
    console.log(`\n📍 STEP 4.5: openFDA - Fetching Adverse Events`)
    const openfdaSafety = new OpenFDAAdapter()
    const faersEvents = await openfdaSafety.searchAdverseEvents(project.compound_name, 10)

    if (faersEvents.length > 0) {
      metrics.sources_used.push('openFDA FAERS')
      metrics.records_fetched.adverse_events = faersEvents.length
      
      // Map FAERS data to adverse_events table schema
      const eventsToStore = faersEvents.map((evt: any) => ({
        inchikey,
        pt: evt.term, // Preferred Term (MedDRA)
        incidence_n: evt.count, // Number of reports
        source: 'openFDA FAERS',
        source_url: 'https://open.fda.gov/apis/drug/event/',
        retrieved_at: new Date().toISOString(),
        confidence: 'medium', // FAERS is spontaneous reporting
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      
      // Try to store
      const { error: aeError } = await supabaseClient
        .from('adverse_events')
        .insert(eventsToStore)
      
      if (aeError) {
        console.error('Error storing adverse events:', aeError)
        // Don't fail the whole process, just log warning
        metrics.errors.push({
          code: 'E450_AE_STORAGE_FAILED',
          message: `Failed to store adverse events: ${aeError.message}`,
          source: 'openFDA',
          severity: 'warning'
        })
      } else {
        console.log(`✅ Stored ${faersEvents.length} adverse event terms`)
      }
      
      // Also store in evidence_sources for UI display
      const evidenceToStore = faersEvents.map((evt: any) => ({
        project_id,
        source: 'openFDA',
        external_id: `FAERS-${evt.term.replace(/\s+/g, '-').toLowerCase()}`,
        title: evt.term,
        snippet: `${evt.count} reports in FDA Adverse Event Reporting System (FAERS)`,
        payload_json: {
          term: evt.term,
          count: evt.count,
          source: 'FAERS',
          drug: project.compound_name
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      
      const { error: evidenceError } = await supabaseClient
        .from('evidence_sources')
        .insert(evidenceToStore)
      
      if (evidenceError) {
        console.error('Error storing FAERS evidence:', evidenceError)
      } else {
        console.log(`✅ Stored ${faersEvents.length} FAERS evidence sources`)
      }
    }

    // ========================================================================
    // STEP 5: CLINICALTRIALS.GOV - Trial Data (FULL DATA)
    // ========================================================================
    console.log(`\n📍 STEP 5: ClinicalTrials.gov - Fetching trials with FULL data`)
    const clinicaltrials = new ClinicalTrialsAdapter()
    const trialsData = await clinicaltrials.searchTrialsWithFullData(project.compound_name, 20)

    if (trialsData.length > 0) {
      metrics.sources_used.push('ClinicalTrials.gov')
      metrics.records_fetched.trials = trialsData.length
      metrics.coverage.clinical = Math.min(trialsData.length / 20, 1.0)
      
      // Store trials with FULL data
      const trialsToStore = trialsData.map(trial => ({
        nct_id: trial.nct_id,
        inchikey,
        title: trial.title,
        phase: trial.phase,
        status: trial.status,
        enrollment: trial.enrollment,
        design: {
          study_type: trial.study_type,
          intervention_model: trial.intervention_model,
          masking: trial.masking,
          primary_purpose: trial.primary_purpose,
          start_date: trial.start_date,
          completion_date: trial.completion_date,
        },
        arms: {
          interventions: trial.interventions,
          conditions: trial.conditions,
        },
        outcomes_primary: trial.outcomes_primary,
        outcomes_secondary: trial.outcomes_secondary,
        results: {
          eligibility: trial.eligibility,
          sponsor: trial.sponsor,
          collaborators: trial.collaborators,
          locations_count: trial.locations_count,
          brief_summary: trial.brief_summary,
        },
        source: 'ClinicalTrials.gov',
        source_url: `https://clinicaltrials.gov/study/${trial.nct_id}`,
        retrieved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      
      // Upsert trials
      const { error: trialsError } = await supabaseClient
        .from('trials')
        .upsert(trialsToStore, { onConflict: 'nct_id', ignoreDuplicates: false })
      
      if (trialsError) {
        console.error('Error storing trials:', trialsError)
        metrics.errors.push({
          code: 'E501_TRIALS_STORAGE_FAILED',
          message: `Failed to store trials: ${trialsError.message}`,
          source: 'ClinicalTrials.gov',
          severity: 'warning',
        })
      } else {
        console.log(`✅ Stored ${trialsData.length} trials with FULL data`)
        // Log sample of what we stored
        if (trialsData.length > 0) {
          const sample = trialsData[0]
          console.log(`   Sample: ${sample.nct_id} - ${sample.title?.substring(0, 50)}...`)
          console.log(`   Phase: ${sample.phase}, Status: ${sample.status}, N=${sample.enrollment}`)
          console.log(`   Primary outcomes: ${sample.outcomes_primary?.length || 0}`)
        }
      }
    }

    // ========================================================================
    // STEP 5.5: CLINICALTRIALS.GOV - Trial RESULTS (Statistical Data)
    // ========================================================================
    console.log(`\n📍 STEP 5.5: ClinicalTrials.gov - Fetching trial RESULTS (statistical data)`)
    const trialsWithResults = await clinicaltrials.searchTrialsWithResults(project.compound_name, 10)
    
    if (trialsWithResults.length > 0) {
      console.log(`✅ Found ${trialsWithResults.length} trials with posted results`)
      
      // Store results in external_data_cache for each trial
      for (const result of trialsWithResults) {
        try {
          await supabaseClient
            .from('external_data_cache')
            .upsert({
              compound_name: project.compound_name,
              inchikey,
              source: 'ctgov_results',
              source_id: result.nct_id,
              source_url: `https://clinicaltrials.gov/study/${result.nct_id}?tab=results`,
              content_type: 'trial_results',
              section_name: 'full_results',
              raw_content: JSON.stringify(result),
              normalized_content: JSON.stringify({
                nct_id: result.nct_id,
                has_results: true,
                outcome_count: result.outcomes?.measures?.length || 0,
                serious_ae_count: result.adverse_events?.serious_events?.length || 0,
                other_ae_count: result.adverse_events?.other_events?.length || 0,
                baseline_measures: result.baseline?.measures?.length || 0,
              }),
              payload: {
                participant_flow: result.participant_flow,
                baseline: result.baseline,
                outcomes: result.outcomes,
                adverse_events: result.adverse_events,
                limitations: result.limitations,
              },
              confidence: 'high',
            }, {
              onConflict: 'compound_name,source,source_id,content_type,section_name',
              ignoreDuplicates: false
            })
          
          console.log(`   ✅ Stored results for ${result.nct_id}: ${result.outcomes?.measures?.length || 0} outcomes, ${result.adverse_events?.serious_events?.length || 0} SAEs`)
        } catch (error) {
          console.error(`   ❌ Error storing results for ${result.nct_id}:`, error)
        }
      }
    } else {
      console.log(`   ⚠️  No trials with posted results found`)
    }

    // ========================================================================
    // STEP 6: PUBMED - Literature (FULL DATA)
    // ========================================================================
    console.log(`\n📍 STEP 6: PubMed - Fetching literature with FULL data`)
    const pubmed = new PubMedAdapter()
    const publicationsData = await pubmed.searchWithFullData(project.compound_name, 30)

    if (publicationsData.length > 0) {
      metrics.sources_used.push('PubMed')
      metrics.records_fetched.literature = publicationsData.length
      metrics.coverage.literature = Math.min(publicationsData.length / 30, 1.0)
      
      // Store publications with FULL data
      const publicationsToStore = publicationsData.map(pub => ({
        pmid: pub.pmid,
        inchikey,
        title: pub.title,
        authors: pub.authors,
        journal: pub.journal,
        publication_date: pub.publication_date,
        volume: pub.volume,
        issue: pub.issue,
        pages: pub.pages,
        doi: pub.doi,
        abstract: pub.abstract,
        keywords: pub.keywords,
        mesh_terms: pub.mesh_terms,
        relevance_score: null, // Could calculate based on title/abstract match
        source: 'PubMed',
        source_url: `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`,
        retrieved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      
      // Upsert publications
      const { error: pubsError } = await supabaseClient
        .from('literature')
        .upsert(publicationsToStore, { onConflict: 'pmid', ignoreDuplicates: false })
      
      if (pubsError) {
        console.error('Error storing publications:', pubsError)
        metrics.errors.push({
          code: 'E601_LITERATURE_STORAGE_FAILED',
          message: `Failed to store publications: ${pubsError.message}`,
          source: 'PubMed',
          severity: 'warning',
        })
      } else {
        console.log(`✅ Stored ${publicationsData.length} publications with FULL data`)
        // Log sample of what we stored
        if (publicationsData.length > 0) {
          const sample = publicationsData[0]
          console.log(`   Sample: PMID ${sample.pmid} - ${sample.title?.substring(0, 50)}...`)
          console.log(`   Journal: ${sample.journal}, Authors: ${sample.authors?.length || 0}`)
          console.log(`   Abstract: ${sample.abstract ? 'Yes' : 'No'}, MeSH: ${sample.mesh_terms?.length || 0}`)
        }
      }
    }

    // ========================================================================
    // STEP 7: BUILD KNOWLEDGE GRAPH FROM ENRICHED DATA
    // ========================================================================
    console.log(`\n📍 STEP 7: Building Knowledge Graph from enriched data`)
    
    const knowledgeGraph = await buildKnowledgeGraphFromEnrichedData(
      supabaseClient,
      project_id,
      project.compound_name,
      inchikey,
      trialsData,
      faersEvents,
      dailymedLabel
    )
    
    console.log(`✅ Knowledge Graph built: ${knowledgeGraph.sourcesUsed?.length || 0} sources`)

    // ========================================================================
    // FINALIZE: Update Project & Log
    // ========================================================================
    const duration = Date.now() - startTime
    
    await supabaseClient
      .from('projects')
      .update({
        inchikey,
        knowledge_graph: knowledgeGraph,
        kg_built_at: new Date().toISOString(),
        enrichment_status: 'completed',
        enrichment_completed_at: new Date().toISOString(),
        enrichment_metadata: {
          ...metrics,
          started_at: project.enrichment_metadata?.started_at,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          kg_sources: knowledgeGraph.sourcesUsed,
        },
      })
      .eq('id', project_id)

    // Log ingestion
    await supabaseClient
      .from('ingestion_logs')
      .insert({
        operation_type: 'enrich',
        inchikey,
        source_adapter: metrics.sources_used.join(', '),
        status: 'completed',
        records_fetched: Object.values(metrics.records_fetched).reduce((a, b) => a + b, 0),
        records_inserted: metrics.records_fetched.labels + (compoundData ? 1 : 0),
        duration_ms: duration,
        triggered_by: 'api',
        project_id,
      })

    console.log(`\n✅ ENRICHMENT COMPLETED in ${duration}ms`)
    console.log(`📊 Sources used: ${metrics.sources_used.join(', ')}`)
    console.log(`📈 Coverage: ${JSON.stringify(metrics.coverage)}`)

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        inchikey,
        duration_ms: duration,
        metrics,
        message: 'Full enrichment completed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enrich Data Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
