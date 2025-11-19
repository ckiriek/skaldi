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

  async fetchLabelBySetid(setid: string): Promise<any | null> {
    try {
      await this.rateLimit()
      const url = `${this.baseUrl}/services/v2/spls/${setid}.json`

      const response = await fetch(url)
      if (!response.ok) return null

      const data = await response.json()
      const spl = data.data?.[0]
      if (!spl) return null

      // Extract sections (simplified - full implementation would parse all sections)
      const sections: any = {}
      
      console.log(`✅ DailyMed: Fetched label ${setid}`)
      return {
        label_type: 'FDA_SPL',
        effective_date: spl.effective_time,
        version: spl.version_number,
        setid,
        sections,
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

  async fetchLatestLabelByApplicationNumber(applicationNumber: string): Promise<any | null> {
    const setids = await this.searchByApplicationNumber(applicationNumber)
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
}

// ============================================================================
// PUBMED ADAPTER
// ============================================================================

class PubMedAdapter {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  private email = 'asetria@example.com'
  private tool = 'asetria'
  private lastRequestTime = 0
  private minRequestInterval = 334 // 3 req/sec without API key

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
    // STEP 1: PUBCHEM - Resolve InChIKey
    // ========================================================================
    console.log(`\n📍 STEP 1: PubChem - Resolving InChIKey`)
    const pubchem = new PubChemAdapter()
    const inchikey = await pubchem.resolveToInChIKey(project.compound_name)

    if (!inchikey) {
      console.error(`❌ Failed to resolve InChIKey for: ${project.compound_name}`)
      metrics.errors.push({
        code: 'E301_IDENTITY_UNRESOLVED',
        message: `Could not resolve compound name "${project.compound_name}" to InChIKey`,
        source: 'PubChem',
        severity: 'error',
      })

      // Update project as failed
      await supabaseClient
        .from('projects')
        .update({
          enrichment_status: 'failed',
          enrichment_completed_at: new Date().toISOString(),
          enrichment_metadata: {
            ...metrics,
            started_at: project.enrichment_metadata?.started_at,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          },
        })
        .eq('id', project_id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to resolve compound identity',
          metrics 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    metrics.sources_used.push('PubChem')
    metrics.coverage.compound_identity = 1.0

    // Fetch full compound data
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
    // STEP 3: DAILYMED - Latest Label
    // ========================================================================
    console.log(`\n📍 STEP 3: DailyMed - Fetching latest label`)
    const dailymed = new DailyMedAdapter()
    let dailymedLabel = null
    
    if (project.rld_application_number) {
      dailymedLabel = await dailymed.fetchLatestLabelByApplicationNumber(project.rld_application_number)
      if (dailymedLabel) {
        metrics.sources_used.push('DailyMed')
        metrics.records_fetched.labels++
        
        // Store label
        await supabaseClient
          .from('labels')
          .upsert({
            inchikey,
            ...dailymedLabel,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'inchikey' })
        
        console.log(`✅ Stored DailyMed label`)
      }
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
        
        // Store label
        await supabaseClient
          .from('labels')
          .upsert({
            inchikey,
            ...openfdaLabel,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'inchikey' })
        
        console.log(`✅ Stored openFDA label`)
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
      
      const eventsToStore = faersEvents.map((evt: any) => ({
        inchikey,
        project_id,
        term: evt.term,
        frequency: evt.count.toString(), // Store as string frequency/count
        source: 'openFDA FAERS',
        retrieved_at: new Date().toISOString(),
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
    }

    // ========================================================================
    // STEP 5: CLINICALTRIALS.GOV - Trial Data
    // ========================================================================
    console.log(`\n📍 STEP 5: ClinicalTrials.gov - Fetching trials`)
    const clinicaltrials = new ClinicalTrialsAdapter()
    const nctIds = await clinicaltrials.searchTrialsByDrug(project.compound_name, 20)

    if (nctIds.length > 0) {
      metrics.sources_used.push('ClinicalTrials.gov')
      metrics.records_fetched.trials = nctIds.length
      metrics.coverage.clinical = Math.min(nctIds.length / 20, 1.0)
      
      // Store trial IDs for later use
      const trialsToStore = nctIds.map(nctId => ({
        nct_id: nctId,
        inchikey,
        project_id,
        title: `Clinical Trial ${nctId}`, // Will be updated with full data later
        phase: null,
        status: null,
        enrollment: null,
        design: {},
        outcomes: {},
        source: 'ClinicalTrials.gov',
        source_url: `https://clinicaltrials.gov/study/${nctId}`,
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
        console.log(`✅ Stored ${nctIds.length} trials`)
      }
    }

    // ========================================================================
    // STEP 6: PUBMED - Literature
    // ========================================================================
    console.log(`\n📍 STEP 6: PubMed - Fetching literature`)
    const pubmed = new PubMedAdapter()
    const pmids = await pubmed.searchByDrug(project.compound_name, 30)

    if (pmids.length > 0) {
      metrics.sources_used.push('PubMed')
      metrics.records_fetched.literature = pmids.length
      metrics.coverage.literature = Math.min(pmids.length / 30, 1.0)
      
      // Store publication IDs for later use
      const publicationsToStore = pmids.map(pmid => ({
        pmid,
        inchikey,
        project_id,
        title: `PubMed Article ${pmid}`, // Will be updated with full data later
        authors: [],
        journal: null,
        publication_date: null,
        abstract: null,
        keywords: [],
        mesh_terms: [],
        doi: null,
        source: 'PubMed',
        source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
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
        console.log(`✅ Stored ${pmids.length} publications`)
      }
    }

    // ========================================================================
    // FINALIZE: Update Project & Log
    // ========================================================================
    const duration = Date.now() - startTime
    
    await supabaseClient
      .from('projects')
      .update({
        inchikey,
        enrichment_status: 'completed',
        enrichment_completed_at: new Date().toISOString(),
        enrichment_metadata: {
          ...metrics,
          started_at: project.enrichment_metadata?.started_at,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
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
