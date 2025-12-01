import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClinicalTrialsClient } from '@/lib/integrations/clinicaltrials'
import { PubMedClient } from '@/lib/integrations/pubmed'
import { OpenFDAClient } from '@/lib/integrations/openfda'

/**
 * Unified Enrichment API v2.0
 * 
 * Fetches data from:
 * - ClinicalTrials.gov (100 trials, 2015+, Phase 2-4, with outcomes)
 * - PubMed (50 publications, 2015+, RCT/Meta/SR only)
 * - openFDA FAERS (safety summary + 100 serious events)
 * 
 * Uses upsert to avoid duplicates
 */

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

    console.log(`\n🚀 Starting enrichment for project: ${project.title} (${project.compound_name})`)

    const results = {
      clinicalTrials: [] as any[],
      publications: [] as any[],
      safetyData: [] as any[],
      safetySummary: null as any,
      errors: [] as string[]
    }

    // 1. Fetch from ClinicalTrials.gov (enhanced with filters)
    try {
      const ctClient = new ClinicalTrialsClient()
      
      // Use enhanced search with drug name and indication
      const trials = await ctClient.searchEnhanced(
        project.compound_name,
        project.indication,
        100, // Increased limit
        {
          minYear: 2015,
          phases: ['PHASE2', 'PHASE3', 'PHASE4'],
          statuses: ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING']
        }
      )
      results.clinicalTrials = trials

      // Upsert to evidence_sources (avoid duplicates)
      for (const trial of trials) {
        await supabase.from('evidence_sources').upsert({
          project_id: projectId,
          source: 'ClinicalTrials.gov',
          external_id: trial.nctId,
          title: trial.title,
          snippet: `${trial.phase?.join(', ') || 'N/A'} | ${trial.status} | N=${trial.enrollment || 'N/A'}`,
          payload_json: trial
        }, {
          onConflict: 'project_id,source,external_id'
        })
      }
      
      console.log(`✅ ClinicalTrials.gov: Saved ${trials.length} trials`)
    } catch (error: any) {
      console.error('ClinicalTrials.gov error:', error)
      results.errors.push(`ClinicalTrials.gov: ${error.message}`)
    }

    // 2. Fetch from PubMed (enhanced with filters)
    try {
      const pubmedClient = new PubMedClient(process.env.NCBI_API_KEY)
      
      // Use enhanced clinical evidence search
      const publications = await pubmedClient.searchClinicalEvidence(
        project.compound_name,
        project.indication,
        50 // Increased limit
      )
      results.publications = publications

      // Upsert to evidence_sources (avoid duplicates)
      for (const pub of publications) {
        await supabase.from('evidence_sources').upsert({
          project_id: projectId,
          source: 'PubMed',
          external_id: pub.pmid,
          title: pub.title,
          snippet: `${pub.journal} (${pub.year}) | ${pub.publicationType?.join(', ') || 'Article'}`,
          payload_json: pub
        }, {
          onConflict: 'project_id,source,external_id'
        })
      }
      
      console.log(`✅ PubMed: Saved ${publications.length} publications`)
    } catch (error: any) {
      console.error('PubMed error:', error)
      results.errors.push(`PubMed: ${error.message}`)
    }

    // 3. Fetch from openFDA (enhanced with safety summary)
    try {
      const fdaClient = new OpenFDAClient(process.env.OPENFDA_API_KEY)
      
      // Get comprehensive safety summary first
      const safetySummary = await fdaClient.getSafetySummary(project.compound_name)
      results.safetySummary = safetySummary
      
      // Get serious adverse events
      const seriousEvents = await fdaClient.getSeriousAdverseEvents(project.compound_name, 100)
      results.safetyData = seriousEvents

      // Save safety summary as a special evidence source
      if (safetySummary.totalReports > 0) {
        await supabase.from('evidence_sources').upsert({
          project_id: projectId,
          source: 'openFDA',
          external_id: `FAERS-SUMMARY-${project.compound_name}`,
          title: `FAERS Safety Summary: ${project.compound_name}`,
          snippet: `${safetySummary.totalReports} total reports | ${safetySummary.seriousReports} serious | ${safetySummary.deathReports} deaths`,
          payload_json: safetySummary
        }, {
          onConflict: 'project_id,source,external_id'
        })
      }

      // Save top reactions as individual evidence sources
      for (const reaction of safetySummary.topReactions.slice(0, 20)) {
        await supabase.from('evidence_sources').upsert({
          project_id: projectId,
          source: 'openFDA',
          external_id: `FAERS-${reaction.term.replace(/\s+/g, '-').toLowerCase()}`,
          title: reaction.term,
          snippet: `${reaction.count} reports (${reaction.percentage}%)`,
          payload_json: {
            term: reaction.term,
            count: reaction.count,
            percentage: reaction.percentage,
            drug: project.compound_name,
            source: 'FAERS'
          }
        }, {
          onConflict: 'project_id,source,external_id'
        })
      }
      
      console.log(`✅ openFDA: Saved safety summary + ${safetySummary.topReactions.length} reactions`)
    } catch (error: any) {
      console.error('openFDA error:', error)
      results.errors.push(`openFDA: ${error.message}`)
    }

    // Update project enrichment status
    await supabase.from('projects').update({
      enrichment_status: 'completed',
      updated_at: new Date().toISOString()
    }).eq('id', projectId)

    // Log audit trail
    await supabase.from('audit_log').insert({
      project_id: projectId,
      actor_user_id: user.id,
      action: 'enrichment_completed',
      diff_json: {
        clinicalTrials: results.clinicalTrials.length,
        publications: results.publications.length,
        safetyReports: results.safetySummary?.topReactions?.length || 0,
        safetySummary: results.safetySummary ? {
          totalReports: results.safetySummary.totalReports,
          seriousReports: results.safetySummary.seriousReports,
          deathReports: results.safetySummary.deathReports
        } : null,
        errors: results.errors
      }
    })

    console.log(`\n✅ Enrichment completed for ${project.title}`)
    console.log(`   - Clinical Trials: ${results.clinicalTrials.length}`)
    console.log(`   - Publications: ${results.publications.length}`)
    console.log(`   - Safety Reports: ${results.safetySummary?.topReactions?.length || 0}`)

    return NextResponse.json({
      success: true,
      data: {
        clinicalTrials: results.clinicalTrials.length,
        publications: results.publications.length,
        safetyData: results.safetySummary?.topReactions?.length || 0,
        safetySummary: results.safetySummary,
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
