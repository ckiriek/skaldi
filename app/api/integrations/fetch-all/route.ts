import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClinicalTrialsClient } from '@/lib/integrations/clinicaltrials'
import { PubMedClient } from '@/lib/integrations/pubmed'
import { OpenFDAClient } from '@/lib/integrations/openfda'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const results = {
      clinicalTrials: [] as any[],
      publications: [] as any[],
      safetyData: [] as any[],
      errors: [] as string[]
    }

    // 1. Fetch from ClinicalTrials.gov
    try {
      const ctClient = new ClinicalTrialsClient()
      
      // Search by indication (increased from 10 to 50 for better coverage)
      const trials = await ctClient.searchByCondition(project.indication, 50)
      results.clinicalTrials = trials

      // Save to evidence_sources
      for (const trial of trials) {
        await supabase.from('evidence_sources').insert({
          project_id: projectId,
          source: 'ClinicalTrials.gov',
          external_id: trial.nctId,
          payload_json: trial
        })
      }
    } catch (error: any) {
      console.error('ClinicalTrials.gov error:', error)
      results.errors.push(`ClinicalTrials.gov: ${error.message}`)
    }

    // 2. Fetch from PubMed
    try {
      const pubmedClient = new PubMedClient(process.env.NCBI_API_KEY)
      
      // Search by INN (compound_name) + indication for better results
      const searchTerm = `${project.compound_name || project.title} ${project.indication}`
      const publications = await pubmedClient.search(searchTerm, 30)
      results.publications = publications

      // Save to evidence_sources
      for (const pub of publications) {
        await supabase.from('evidence_sources').insert({
          project_id: projectId,
          source: 'PubMed',
          external_id: pub.pmid,
          payload_json: pub
        })
      }
    } catch (error: any) {
      console.error('PubMed error:', error)
      results.errors.push(`PubMed: ${error.message}`)
    }

    // 3. Fetch from openFDA
    try {
      const fdaClient = new OpenFDAClient()
      
      // Try to find safety data for similar approved drugs
      // Priority: drug_class > compound name > indication-based fallback
      
      let adverseEvents: any[] = []
      let searchStrategy = ''
      
      // Strategy 1: Use drug_class if provided (best option, increased from 10 to 100)
      if (project.drug_class) {
        adverseEvents = await fdaClient.searchAdverseEvents(project.drug_class, 100)
        searchStrategy = `drug_class: ${project.drug_class}`
      }
      
      // Strategy 2: Try exact compound name from title (for approved drugs)
      if (adverseEvents.length === 0) {
        adverseEvents = await fdaClient.searchAdverseEvents(project.title.split(' ')[0], 100)
        searchStrategy = `compound: ${project.title.split(' ')[0]}`
      }
      
      // Strategy 3: Fallback to indication-based drug class mapping
      if (adverseEvents.length === 0 && project.indication) {
        // Map indication to common drug classes
        const drugClassMap: Record<string, string[]> = {
          'diabetes': ['metformin', 'insulin', 'glipizide'],
          'hypertension': ['lisinopril', 'amlodipine', 'losartan'],
          'depression': ['sertraline', 'fluoxetine', 'escitalopram'],
          'pain': ['ibuprofen', 'acetaminophen', 'naproxen'],
        }
        
        // Find matching drug class
        const indicationLower = project.indication.toLowerCase()
        for (const [condition, drugs] of Object.entries(drugClassMap)) {
          if (indicationLower.includes(condition)) {
            // Try first drug in class
            adverseEvents = await fdaClient.searchAdverseEvents(drugs[0], 100)
            if (adverseEvents.length > 0) {
              searchStrategy = `indication fallback: ${drugs[0]} (${condition})`
              // Add note that this is class-based data
              adverseEvents = adverseEvents.map(event => ({
                ...event,
                note: `Data from ${drugs[0]} (similar drug class for ${project.indication})`
              }))
              break
            }
          }
        }
      }
      
      // Add search strategy to results for transparency
      if (adverseEvents.length > 0 && searchStrategy) {
        console.log(`openFDA search strategy: ${searchStrategy}`)
      }
      
      results.safetyData = adverseEvents

      // Save to evidence_sources
      for (const event of adverseEvents) {
        await supabase.from('evidence_sources').insert({
          project_id: projectId,
          source: 'openFDA',
          external_id: `${event.drugName}-${event.receiptDate}`,
          payload_json: event
        })
      }
    } catch (error: any) {
      console.error('openFDA error:', error)
      results.errors.push(`openFDA: ${error.message}`)
    }

    // Log audit trail
    await supabase.from('audit_log').insert({
      project_id: projectId,
      actor_user_id: user.id,
      action: 'external_data_fetched',
      diff_json: {
        clinicalTrials: results.clinicalTrials.length,
        publications: results.publications.length,
        safetyData: results.safetyData.length,
        errors: results.errors
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        clinicalTrials: results.clinicalTrials.length,
        publications: results.publications.length,
        safetyData: results.safetyData.length,
        errors: results.errors
      }
    })

  } catch (error: any) {
    console.error('Error fetching external data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch external data' },
      { status: 500 }
    )
  }
}
