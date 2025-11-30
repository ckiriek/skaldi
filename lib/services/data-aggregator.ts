/**
 * Data Aggregator Service - Part 1: Types & Core Class
 * 
 * Aggregates ALL available data from multiple sources for document generation
 */

import { createClient } from '@/lib/supabase/server'

// Types will be imported from separate file
export * from './data-aggregator.types'

import type {
  AggregatedData,
  ClinicalTrial,
  FAERSReport,
  FDALabel,
  PubMedArticle,
  KnowledgeGraphSnapshot
} from './data-aggregator.types'

export class DataAggregator {
  private supabase: any
  
  constructor() {
    // Initialize as null, will be set in async methods
    this.supabase = null
  }
  
  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }
  
  /**
   * Aggregate ALL data for a document
   */
  async aggregateForDocument(
    projectId: string,
    documentType: string
  ): Promise<AggregatedData> {
    console.log(`📊 Aggregating data for ${documentType} (project: ${projectId})`)
    
    const supabase = await this.getSupabase()
    
    // Fetch project
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (!project) throw new Error('Project not found')
    
    // Aggregate all sources in parallel
    const [kg, trials, safety, labels, lit, rag] = await Promise.all([
      this.fetchKnowledgeGraph(projectId),
      this.fetchClinicalTrials(project.compound_name),
      this.fetchSafetyData(project.compound_name),
      this.fetchFDALabels(project.compound_name),
      this.fetchLiterature(project.compound_name),
      this.fetchRAGReferences(documentType, null)
    ])
    
    return {
      knowledgeGraph: kg,
      clinicalTrials: trials,
      safetyData: safety,
      fdaLabels: labels,
      literature: lit,
      ragReferences: rag,
      studyDesign: project.design_json,
      metadata: {
        sources: ['KG', 'Trials', 'Safety', 'Labels', 'Lit', 'RAG'],
        lastUpdated: new Date().toISOString(),
        coverage: {},
        dataQuality: {
          knowledgeGraph: 100,
          clinicalTrials: 100,
          safetyData: 100,
          fdaLabels: 100,
          literature: 100
        }
      }
    }
  }
  
  /**
   * Aggregate data for specific section
   */
  async aggregateForSection(
    projectId: string,
    documentType: string,
    sectionId: string
  ): Promise<AggregatedData> {
    console.log(`📊 Aggregating data for ${documentType}/${sectionId}`)
    console.log(`   Project ID: ${projectId}`)
    
    const supabase = await this.getSupabase()
    
    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('❌ Error fetching project:', projectError)
      throw new Error(`Project fetch failed: ${projectError.message}`)
    }
    
    if (!project) {
      console.error('❌ Project not found in database')
      throw new Error('Project not found')
    }
    
    console.log(`✅ Project found: ${project.title}`)
    console.log(`   📦 FULL PROJECT DATA:`, JSON.stringify({
      id: project.id,
      title: project.title,
      compound_name: project.compound_name,
      indication: project.indication,
      phase: project.phase,
      sponsor: project.sponsor,
      inchikey: project.inchikey,
      design_json: project.design_json
    }, null, 2))
    
    // Get compound name and inchikey
    const compoundName = project.compound_name;
    const inchikey = project.inchikey;
    
    // Determine needed sources for this section
    const needed = this.getNeededSources(sectionId);
    
    // Fetch only needed sources - pass both compound name and inchikey
    const [kg, trials, safety, labels, lit, rag, studyFlow, relatedDocs] = await Promise.all([
      needed.includes('kg') ? this.fetchKnowledgeGraph(projectId) : Promise.resolve({ compound_name: compoundName || 'Unknown' }),
      needed.includes('trials') ? this.fetchClinicalTrials(compoundName, inchikey) : Promise.resolve(this.emptyTrials()),
      needed.includes('safety') ? this.fetchSafetyData(compoundName, inchikey) : Promise.resolve(this.emptySafety()),
      needed.includes('labels') ? this.fetchFDALabels(compoundName, inchikey) : Promise.resolve(this.emptyLabels()),
      needed.includes('lit') ? this.fetchLiterature(compoundName, inchikey) : Promise.resolve(this.emptyLit()),
      this.fetchRAGReferences(documentType, sectionId),
      this.fetchStudyFlow(projectId),
      this.fetchRelatedDocuments(projectId, documentType) // Cross-reference with other generated docs
    ]);
    
    // CRITICAL: Include ALL project data, not just design_json
    // The model needs compound_name, indication, phase, sponsor to generate proper content
    const enrichedStudyDesign = {
      // Core project fields - MUST be included
      compound: project.compound_name || project.design_json?.compound || 'Unknown',
      indication: project.indication || project.design_json?.indication || 'Unknown',
      phase: project.phase || project.design_json?.phase || 'Unknown',
      sponsor: project.sponsor || project.design_json?.sponsor || 'Unknown',
      title: project.title || 'Unknown',
      
      // Formulation details from project-level fields
      dosage_form: project.dosage_form || project.design_json?.dosage_form,
      route: project.route || project.design_json?.route,
      strength: project.strength || project.design_json?.strength,
      
      // Design parameters from design_json
      design_type: project.design_json?.design_type || 'Unknown',
      blinding: project.design_json?.blinding || 'Unknown',
      arms: project.design_json?.arms || project.design_json?.number_of_arms || 'Unknown',
      duration_weeks: project.design_json?.duration_weeks || project.design_json?.duration || 'Unknown',
      primary_endpoint: project.design_json?.primary_endpoint || 'Unknown',
      secondary_endpoints: project.design_json?.secondary_endpoints || [],
      
      // Sample size and population
      sample_size: project.design_json?.target_sample_size || project.design_json?.sample_size || project.design_json?.enrollment,
      population: project.design_json?.population,
      
      // Comparator details - CRITICAL for reducing placeholders
      comparator_type: project.design_json?.comparator_type || 'placebo',
      comparator_name: project.design_json?.comparator_name,
      comparator: project.design_json?.comparator || project.design_json?.comparator_name || 
        (project.design_json?.comparator_type === 'placebo' ? 'Placebo' : 
         project.design_json?.comparator_type === 'active' ? project.design_json?.comparator_name : 'None'),
      
      // Randomization
      randomization_ratio: project.design_json?.randomization_ratio || '1:1',
      number_of_arms: project.design_json?.number_of_arms || project.design_json?.arms,
      
      // Rescue therapy
      rescue_allowed: project.design_json?.rescue_allowed,
      rescue_criteria: project.design_json?.rescue_criteria,
      
      // Visit schedule and safety
      visit_schedule: project.design_json?.visit_schedule,
      safety_monitoring: project.design_json?.safety_monitoring,
      analysis_populations: project.design_json?.analysis_populations,
      
      // Raw design_json for any other fields
      ...project.design_json
    };
    
    console.log(`📋 Enriched Study Design:`, {
      compound: enrichedStudyDesign.compound,
      indication: enrichedStudyDesign.indication,
      phase: enrichedStudyDesign.phase,
      sponsor: enrichedStudyDesign.sponsor
    });
    
    return {
      knowledgeGraph: kg,
      clinicalTrials: trials,
      safetyData: safety,
      fdaLabels: labels,
      literature: lit,
      ragReferences: rag,
      studyDesign: enrichedStudyDesign,
      studyFlow: studyFlow,
      relatedDocuments: relatedDocs, // Cross-reference with Synopsis, IB, etc.
      metadata: {
        sources: this.getUsedSources(kg, trials, safety, labels, lit),
        lastUpdated: new Date().toISOString(),
        coverage: {},
        dataQuality: {
          knowledgeGraph: this.assessQuality(kg),
          clinicalTrials: this.assessQuality(trials),
          safetyData: this.assessQuality(safety),
          fdaLabels: this.assessQuality(labels),
          literature: this.assessQuality(lit)
        }
      }
    };
  }
  
  // ============================================================================
  // FETCH METHODS
  // ============================================================================
  
  private async fetchKnowledgeGraph(projectId: string): Promise<KnowledgeGraphSnapshot> {
    try {
      const supabase = await this.getSupabase();
      
      // First check if KG is stored directly in project (built by orchestrator)
      const { data: project } = await supabase
        .from('projects')
        .select('compound_name, knowledge_graph, design_json')
        .eq('id', projectId)
        .single();
      
      // Use KG from project if available (built before generation)
      if (project?.knowledge_graph) {
        console.log(`✅ Knowledge Graph loaded from project for ${project.compound_name}`);
        return project.knowledge_graph as KnowledgeGraphSnapshot;
      }
      
      const compound = project?.compound_name || project?.design_json?.compound;
      if (!compound) {
        console.warn('⚠️  No compound found in project');
        return { compound_name: 'Unknown' };
      }
      
      // Fallback: fetch from knowledge_snapshots table
      const { data } = await supabase
        .from('knowledge_snapshots')
        .select('snapshot_data')
        .eq('inn', compound)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.snapshot_data) {
        console.log(`✅ Knowledge Graph loaded from snapshots for ${compound}`);
        return data.snapshot_data as KnowledgeGraphSnapshot;
      }
    } catch (error) {
      console.warn('⚠️  No Knowledge Graph found:', error);
    }
    return { compound_name: 'Unknown' };
  }
  
  private async fetchClinicalTrials(compound?: string, inchikey?: string): Promise<AggregatedData['clinicalTrials']> {
    if (!compound && !inchikey) return this.emptyTrials();
    
    try {
      const supabase = await this.getSupabase();
      
      // Strategy: Try multiple approaches to find trials
      // 1. By inchikey (small molecules)
      // 2. By compound name in compounds table → inchikey
      // 3. By compound name directly in trials (biologics, peptides, biosimilars)
      // 4. Live fetch from ClinicalTrials.gov API (fallback)
      
      let data: any[] = [];
      
      // 1. Try by inchikey (from enrichment)
      if (inchikey) {
        const { data: trialsByInchikey } = await supabase
          .from('trials')
          .select('*')
          .eq('inchikey', inchikey)
          .limit(100);
        data = trialsByInchikey || [];
        if (data.length > 0) {
          console.log(`✅ Found ${data.length} trials by inchikey`);
        }
      }
      
      // 2. Try to find inchikey by compound name in compounds table
      if (data.length === 0 && compound) {
        const { data: compoundData } = await supabase
          .from('compounds')
          .select('inchikey')
          .ilike('name', `%${compound}%`)
          .limit(1)
          .single();
        
        if (compoundData?.inchikey) {
          const { data: trialsByCompound } = await supabase
            .from('trials')
            .select('*')
            .eq('inchikey', compoundData.inchikey)
            .limit(100);
          data = trialsByCompound || [];
          if (data.length > 0) {
            console.log(`✅ Found ${data.length} trials via compounds table`);
          }
        }
      }
      
      // 3. Try direct search by compound name in trials table
      // This works for biologics/peptides where inchikey doesn't exist
      if (data.length === 0 && compound) {
        const { data: trialsByName } = await supabase
          .from('trials')
          .select('*')
          .or(`title.ilike.%${compound}%,arms->interventions.cs.{"name":"${compound}"}`)
          .limit(100);
        data = trialsByName || [];
        if (data.length > 0) {
          console.log(`✅ Found ${data.length} trials by compound name in title/interventions`);
        }
      }
      
      // 4. If still no data, try live fetch from ClinicalTrials.gov
      if (data.length === 0 && compound) {
        console.log(`🔄 No cached trials, fetching live from ClinicalTrials.gov for ${compound}...`);
        data = await this.fetchTrialsLive(compound);
      }
      
      if (!data || data.length === 0) {
        console.log(`⚠️  No trials found for ${compound || inchikey} (tried all sources)`);
        return this.emptyTrials();
      }
      
      const studies: ClinicalTrial[] = data.map(r => this.parseTrialFromDB(r));
      const byPhase: Record<string, ClinicalTrial[]> = {};
      const endpoints: string[] = [];
      
      studies.forEach(s => {
        if (!byPhase[s.phase]) byPhase[s.phase] = [];
        byPhase[s.phase].push(s);
        if (s.primaryEndpoint) endpoints.push(s.primaryEndpoint);
        if (s.secondaryEndpoints) endpoints.push(...s.secondaryEndpoints);
      });
      
      // Also fetch detailed trial results from external_data_cache
      const trialResults = compound ? await this.fetchTrialResults(compound) : [];
      
      console.log(`✅ Clinical Trials: ${studies.length} studies, ${trialResults.length} with detailed results`);
      return {
        studies,
        totalStudies: studies.length,
        byPhase,
        endpoints: [...new Set(endpoints)],
        results: trialResults.length > 0 ? trialResults : studies.filter(s => s.results).map(s => s.results!)
      };
    } catch (error) {
      console.warn('⚠️  Error fetching trials:', error);
      return this.emptyTrials();
    }
  }
  
  // Parse trial from our DB schema (not external API)
  private parseTrialFromDB(row: any): ClinicalTrial {
    const primaryOutcomes = row.outcomes_primary || [];
    const secondaryOutcomes = row.outcomes_secondary || [];
    
    return {
      nctId: row.nct_id,
      title: row.title || 'Unknown',
      status: row.status || 'Unknown',
      phase: row.phase || 'Unknown',
      enrollment: row.enrollment || 0,
      startDate: row.start_date,
      completionDate: row.completion_date,
      primaryEndpoint: primaryOutcomes[0]?.measure || primaryOutcomes[0],
      secondaryEndpoints: secondaryOutcomes.map((o: any) => o?.measure || o),
      results: row.results,
      sponsor: row.design?.sponsor
    };
  }
  
  private async fetchSafetyData(compound?: string, inchikey?: string): Promise<AggregatedData['safetyData']> {
    if (!compound && !inchikey) return this.emptySafety();
    
    try {
      const supabase = await this.getSupabase();
      
      // First try to find by inchikey in adverse_events table
      let data: any[] = [];
      let foundInchikey = inchikey;
      
      // If no inchikey, try to find it by compound name
      if (!foundInchikey && compound) {
        const { data: compoundData } = await supabase
          .from('compounds')
          .select('inchikey')
          .ilike('name', `%${compound}%`)
          .limit(1)
          .single();
        foundInchikey = compoundData?.inchikey;
      }
      
      if (foundInchikey) {
        const { data: aeData } = await supabase
          .from('adverse_events')
          .select('*')
          .eq('inchikey', foundInchikey)
          .limit(500);
        data = aeData || [];
      }
      
      // If no cached data, try live fetch from openFDA FAERS
      if ((!data || data.length === 0) && compound) {
        console.log(`🔄 No cached safety data, fetching live from openFDA FAERS for ${compound}...`);
        data = await this.fetchSafetyLive(compound);
      }
      
      if (!data || data.length === 0) {
        console.log(`⚠️  No adverse events found for ${compound || inchikey} (tried all sources)`);
        return this.emptySafety();
      }
      
      // Group by preferred term (pt)
      const aeMap = new Map<string, { count: number, serious: number, total: number }>();
      let deaths = 0;
      
      data.forEach((row: any) => {
        const term = row.pt || 'Unknown';
        const existing = aeMap.get(term) || { count: 0, serious: 0, total: 0 };
        existing.count += row.incidence_n || 1;
        existing.total += row.n || 1;
        if (row.serious) existing.serious++;
        if (row.severity === 'fatal') deaths++;
        aeMap.set(term, existing);
      });
      
      const allAEs = Array.from(aeMap.entries()).map(([term, stats]) => ({
        term,
        frequency: stats.total > 0 ? (stats.count / stats.total) * 100 : 0,
        count: stats.count,
        total: stats.total,
        severity: (stats.serious > stats.count / 2 ? 'severe' : 'moderate') as 'severe' | 'moderate' | 'mild',
        seriousness: (stats.serious > 0 ? 'serious' : 'non-serious') as 'serious' | 'non-serious'
      }));
      
      allAEs.sort((a, b) => b.frequency - a.frequency);
      
      console.log(`✅ Safety Data: ${data.length} adverse event records, ${allAEs.length} unique AE terms`);
      return {
        faersReports: data, // Raw FAERS data for counting
        commonAdverseEvents: allAEs.filter(ae => ae.frequency >= 5) as any,
        seriousAdverseEvents: allAEs.filter(ae => ae.seriousness === 'serious') as any,
        deaths,
        labelWarnings: []
      };
    } catch (error) {
      console.warn('⚠️  Error fetching safety data:', error);
      return this.emptySafety();
    }
  }
  
  private async fetchFDALabels(compound?: string, inchikey?: string): Promise<AggregatedData['fdaLabels']> {
    if (!compound && !inchikey) return this.emptyLabels();
    
    try {
      const supabase = await this.getSupabase();
      
      // Strategy 1: Try by inchikey
      let data: any[] = [];
      
      if (inchikey) {
        const { data: labelsByInchikey } = await supabase
          .from('external_data_cache')
          .select('*')
          .eq('inchikey', inchikey)
          .eq('source', 'fda_label')
          .limit(20);
        data = labelsByInchikey || [];
      }
      
      // Strategy 2: Try by compound name (for biologics without inchikey)
      if (data.length === 0 && compound) {
        const { data: labelsByName } = await supabase
          .from('external_data_cache')
          .select('*')
          .ilike('compound_name', `%${compound}%`)
          .eq('source', 'fda_label')
          .limit(20);
        data = labelsByName || [];
        if (data.length > 0) {
          console.log(`✅ Found FDA labels by compound name for ${compound}`);
        }
      }
      
      // Strategy 3: Live fetch from DailyMed if no cached data
      if (data.length === 0 && compound) {
        console.log(`🔄 No cached FDA labels, fetching live from DailyMed for ${compound}...`);
        const liveLabel = await this.fetchFDALabelLive(compound);
        if (liveLabel) {
          return liveLabel;
        }
      }
      
      if (!data || data.length === 0) {
        console.log(`⚠️  No FDA labels found for ${compound || inchikey}`);
        return this.emptyLabels();
      }
      
      // Group sections into a label structure
      const sections: Record<string, string> = {};
      let indications: string[] = [];
      
      data.forEach((row: any) => {
        const sectionName = row.section_name || 'unknown';
        sections[sectionName] = row.normalized_content || row.raw_content || '';
        
        if (sectionName === 'indications_and_usage') {
          indications.push(sections[sectionName]);
        }
      });
      
      const label: FDALabel = {
        setId: data[0]?.source_id || inchikey || compound || 'unknown',
        version: '1',
        effectiveDate: data[0]?.retrieved_at || new Date().toISOString(),
        fullText: Object.values(sections).join('\n\n'),
        sections,
        indications
      };
      
      console.log(`✅ FDA Labels: ${data.length} sections from DB`);
      return {
        labels: [label],
        latestLabel: label,
        fullText: label.fullText,
        sections,
        approvalDate: label.effectiveDate,
        indications
      };
    } catch (error) {
      console.warn('⚠️  Error fetching FDA labels:', error);
      return this.emptyLabels();
    }
  }
  
  private async fetchLiterature(compound?: string, inchikey?: string): Promise<AggregatedData['literature']> {
    if (!compound && !inchikey) return this.emptyLit();
    
    try {
      const supabase = await this.getSupabase();
      
      // Find inchikey if not provided
      let foundInchikey = inchikey;
      if (!foundInchikey && compound) {
        const { data: compoundData } = await supabase
          .from('compounds')
          .select('inchikey')
          .ilike('name', `%${compound}%`)
          .limit(1)
          .single();
        foundInchikey = compoundData?.inchikey;
      }
      
      if (!foundInchikey) {
        console.log(`⚠️  No inchikey found for ${compound}`);
        return this.emptyLit();
      }
      
      // Fetch from literature table (where enrichment stores PubMed articles)
      const { data } = await supabase
        .from('literature')
        .select('*')
        .eq('inchikey', foundInchikey)
        .limit(50);
      
      if (!data || data.length === 0) {
        console.log(`⚠️  No literature found for ${compound || inchikey}`);
        return this.emptyLit();
      }
      
      const articles: PubMedArticle[] = data.map((row: any) => ({
        pmid: row.pmid,
        title: row.title || 'Unknown',
        authors: row.authors || [],
        journal: row.journal || 'Unknown',
        year: row.publication_date ? new Date(row.publication_date).getFullYear() : 2024,
        abstract: row.abstract
      }));
      
      const keyFindings = articles
        .filter(a => a.abstract)
        .map(a => a.abstract!.split('.')[0] + '.')
        .slice(0, 10);
      
      const citations = articles.map(a => ({
        authors: a.authors.join(', '),
        year: a.year,
        title: a.title,
        journal: a.journal,
        pmid: a.pmid
      }));
      
      console.log(`✅ Literature: ${articles.length} articles from DB`);
      return { pubmedArticles: articles, keyFindings, citations };
    } catch (error) {
      console.warn('⚠️  Error fetching literature:', error);
      return this.emptyLit();
    }
  }
  
  private async fetchRAGReferences(docType: string, sectionId: string | null): Promise<AggregatedData['ragReferences']> {
    try {
      const supabase = await this.getSupabase();
      const query = supabase
        .from('drug_reference_chunks')
        .select('*')
        .eq('compound_name', 'STRUCTURE_EXAMPLE')
        .eq('document_type', docType);
      
      if (sectionId) query.ilike('section_id', `%${sectionId}%`);
      
      const { data } = await query.limit(5);
      
      if (!data || data.length === 0) {
        console.warn(`⚠️  No RAG references for ${docType}/${sectionId}`);
        return { structuralExamples: [], similarSections: [] };
      }
      
      interface RAGChunk {
        id: string
        content: string
        source: string
        section_id?: string
        document_type?: string
      }
      
      const examples: RAGChunk[] = data.map((r: any) => ({
        id: r.id,
        content: r.content,
        source: r.source || 'Unknown',
        section_id: r.section_id,
        document_type: r.document_type
      }));
      
      console.log(`✅ RAG References: ${examples.length} examples`);
      return { structuralExamples: examples, similarSections: [] };
    } catch (error) {
      console.warn('⚠️  Error fetching RAG:', error);
      return { structuralExamples: [], similarSections: [] };
    }
  }
  
  private async fetchStudyFlow(projectId: string): Promise<AggregatedData['studyFlow']> {
    try {
      const supabase = await this.getSupabase();
      
      const { data } = await supabase
        .from('study_flows')
        .select('*')
        .eq('study_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!data) {
        console.log(`⚠️  No Study Flow found for project ${projectId}`);
        return undefined;
      }
      
      console.log(`✅ Study Flow loaded: ${data.visits?.length || 0} visits, ${data.procedures?.length || 0} procedures`);
      
      return {
        visits: data.visits || [],
        procedures: data.procedures || [],
        topMatrix: data.top_matrix,
        totalDuration: data.total_duration || 0
      };
    } catch (error) {
      console.warn('⚠️  Error fetching Study Flow:', error);
      return undefined;
    }
  }
  
  // ============================================================================
  // CROSS-DOCUMENT REFERENCE
  // ============================================================================
  
  /**
   * Fetch previously generated documents for cross-reference
   * - Protocol uses Synopsis for consistency
   * - ICF uses Protocol for procedures/risks
   * - CSR uses Protocol for design/endpoints
   */
  private async fetchRelatedDocuments(
    projectId: string, 
    currentDocType: string
  ): Promise<{ synopsis?: string; protocol?: string; ib?: string }> {
    try {
      const supabase = await this.getSupabase();
      
      // Determine which documents to fetch based on current document type
      const docsToFetch: string[] = [];
      
      if (currentDocType === 'Protocol') {
        docsToFetch.push('Synopsis', 'IB'); // Protocol needs Synopsis and IB for consistency
      } else if (currentDocType === 'ICF') {
        docsToFetch.push('Protocol', 'Synopsis'); // ICF needs Protocol for procedures
      } else if (currentDocType === 'CSR') {
        docsToFetch.push('Protocol', 'Synopsis'); // CSR needs Protocol for design
      } else if (currentDocType === 'SAP') {
        docsToFetch.push('Protocol', 'Synopsis'); // SAP needs Protocol for sample size, endpoints
      } else if (currentDocType === 'CRF') {
        docsToFetch.push('Protocol', 'Synopsis'); // CRF needs Protocol for visit schedule, assessments
      }
      
      if (docsToFetch.length === 0) {
        return {};
      }
      
      // Fetch the most recent version of each document type
      const { data: docs, error } = await supabase
        .from('documents')
        .select('type, content')
        .eq('project_id', projectId)
        .in('type', docsToFetch)
        .order('version', { ascending: false });
      
      if (error || !docs) {
        console.warn(`⚠️ Could not fetch related documents: ${error?.message}`);
        return {};
      }
      
      const result: { synopsis?: string; protocol?: string; ib?: string } = {};
      
      for (const doc of docs) {
        // Parse content - it may be JSON with sections or plain text
        let content = '';
        try {
          if (typeof doc.content === 'string') {
            const parsed = JSON.parse(doc.content);
            // If it's an object with sections, join them
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              content = Object.values(parsed).filter(v => typeof v === 'string').join('\n\n---\n\n');
            } else {
              content = doc.content;
            }
          } else if (typeof doc.content === 'object') {
            content = Object.values(doc.content).filter(v => typeof v === 'string').join('\n\n---\n\n');
          }
        } catch {
          content = String(doc.content);
        }
        
        // Truncate to avoid context overflow (keep first 8000 chars for reference)
        const truncated = content.length > 8000 
          ? content.substring(0, 8000) + '\n\n[... truncated for context limit ...]' 
          : content;
        
        if (doc.type === 'Synopsis') {
          result.synopsis = truncated;
          console.log(`✅ Loaded Synopsis (${truncated.length} chars) for cross-reference`);
        } else if (doc.type === 'Protocol') {
          result.protocol = truncated;
          console.log(`✅ Loaded Protocol (${truncated.length} chars) for cross-reference`);
        } else if (doc.type === 'IB') {
          result.ib = truncated;
          console.log(`✅ Loaded IB (${truncated.length} chars) for cross-reference`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching related documents:', error);
      return {};
    }
  }
  
  // ============================================================================
  // PARSERS
  // ============================================================================
  
  private parseTrial(data: any): ClinicalTrial {
    return {
      nctId: data.nct_id || data.NCTId || 'Unknown',
      title: data.title || data.BriefTitle || 'Unknown',
      status: data.status || data.OverallStatus || 'Unknown',
      phase: data.phase || data.Phase || 'Unknown',
      enrollment: parseInt(data.enrollment || data.EnrollmentCount || '0'),
      startDate: data.start_date || data.StartDate,
      completionDate: data.completion_date || data.CompletionDate,
      primaryEndpoint: data.primary_endpoint || data.PrimaryOutcome,
      secondaryEndpoints: data.secondary_endpoints || data.SecondaryOutcomes,
      results: data.results,
      sponsor: data.sponsor || data.LeadSponsorName
    };
  }
  
  private parseFAERS(data: any): FAERSReport {
    return {
      reportId: data.safetyreportid || 'Unknown',
      receiveDate: data.receivedate || new Date().toISOString(),
      seriousOutcome: data.serious || [],
      reactions: data.patient?.reaction?.map((r: any) => r.reactionmeddrapt) || [],
      drugNames: data.patient?.drug?.map((d: any) => d.medicinalproduct) || []
    };
  }
  
  private parseLabel(data: any): FDALabel {
    return {
      setId: data.set_id || data.id || 'Unknown',
      version: data.version || '1',
      effectiveDate: data.effective_time || new Date().toISOString(),
      fullText: data.full_text || JSON.stringify(data),
      sections: data.sections || {},
      indications: data.indications_and_usage || data.indications || []
    };
  }
  
  private parsePubMed(data: any): PubMedArticle {
    return {
      pmid: data.pmid || data.uid || 'Unknown',
      title: data.title || 'Unknown',
      authors: data.authors || [],
      journal: data.journal || data.source || 'Unknown',
      year: parseInt(data.pubdate?.substring(0, 4) || data.year || '2024'),
      abstract: data.abstract
    };
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private getNeededSources(sectionId: string): string[] {
    const map: Record<string, string[]> = {
      'ib_title_page': ['kg'],
      'ib_summary': ['kg', 'labels'],
      'ib_pharmacokinetics': ['kg', 'labels', 'lit'],
      'ib_clinical_studies': ['kg', 'trials', 'labels', 'lit'],
      'ib_safety': ['kg', 'safety', 'labels', 'trials'],
      'protocol_synopsis': ['kg', 'trials'],
      'protocol_procedures': ['kg', 'trials'],
      'protocol_safety': ['kg', 'safety', 'trials']
    };
    return map[sectionId] || ['kg'];
  }
  
  private getUsedSources(...data: any[]): string[] {
    const names = ['Knowledge Graph', 'Clinical Trials', 'Safety Data', 'FDA Labels', 'Literature'];
    return data.map((d, i) => d && Object.keys(d).length > 1 ? names[i] : null).filter(Boolean) as string[];
  }
  
  private assessQuality(data: any): number {
    if (!data) return 0;
    const keys = Object.keys(data);
    if (keys.length === 0) return 0;
    const filled = keys.filter(k => {
      const v = data[k];
      return v !== null && v !== undefined && v !== '' && 
        (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.keys(v).length > 0 : true);
    });
    return Math.round((filled.length / keys.length) * 100);
  }
  
  /**
   * Live fetch from openFDA FAERS API
   * Used as fallback when no cached safety data exists
   */
  private async fetchSafetyLive(compound: string): Promise<any[]> {
    try {
      // openFDA FAERS endpoint - search by drug name and count by reaction
      const url = `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(compound)}"&count=patient.reaction.reactionmeddrapt.exact&limit=50`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        // 404 is expected if no events found
        if (response.status !== 404) {
          console.warn(`⚠️  openFDA FAERS API returned ${response.status}`);
        }
        return [];
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      // Calculate total reports for frequency calculation
      const totalReports = results.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
      
      // Transform to our schema format with proper frequency calculation
      const transformed = results.map((r: any) => ({
        pt: r.term,
        incidence_n: r.count,
        n: totalReports, // Total reports for frequency calculation
        source: 'openFDA FAERS (live)',
        serious: false, // FAERS count endpoint doesn't give seriousness
        severity: 'unknown'
      }));
      
      console.log(`✅ Fetched ${transformed.length} adverse event terms live from openFDA FAERS (${totalReports} total reports)`);
      return transformed;
    } catch (error) {
      console.warn(`⚠️  Live fetch from openFDA FAERS failed:`, error);
      return [];
    }
  }
  
  /**
   * Live fetch from ClinicalTrials.gov API
   * Used as fallback when no cached data exists (biologics, new compounds)
   */
  private async fetchTrialsLive(compound: string): Promise<any[]> {
    try {
      const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(compound)}&pageSize=20&format=json`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        console.warn(`⚠️  ClinicalTrials.gov API returned ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      const studies = data.studies || [];
      
      // Transform to our DB schema format
      const transformed = studies.map((study: any) => {
        const protocol = study.protocolSection || {};
        const identification = protocol.identificationModule || {};
        const status = protocol.statusModule || {};
        const design = protocol.designModule || {};
        const outcomes = protocol.outcomesModule || {};
        const arms = protocol.armsInterventionsModule || {};
        const conditions = protocol.conditionsModule || {};
        const description = protocol.descriptionModule || {};
        
        return {
          nct_id: identification.nctId,
          title: identification.officialTitle || identification.briefTitle || 'Untitled',
          phase: design.phases?.join(', ') || null,
          status: status.overallStatus || null,
          enrollment: design.enrollmentInfo?.count || null,
          start_date: status.startDateStruct?.date || null,
          completion_date: status.completionDateStruct?.date || null,
          design: {
            study_type: design.studyType || null,
            intervention_model: design.designInfo?.interventionModel || null,
            masking: design.designInfo?.maskingInfo?.masking || null,
          },
          arms: {
            interventions: (arms.interventions || []).map((i: any) => ({
              type: i.type,
              name: i.name,
              description: i.description,
            })),
            conditions: conditions.conditions || [],
          },
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
          results: {
            brief_summary: description.briefSummary || null,
          },
          source: 'ClinicalTrials.gov (live)',
        };
      }).filter((t: any) => t.nct_id);
      
      console.log(`✅ Fetched ${transformed.length} trials live from ClinicalTrials.gov`);
      return transformed;
    } catch (error) {
      console.warn(`⚠️  Live fetch from ClinicalTrials.gov failed:`, error);
      return [];
    }
  }

  /**
   * Live fetch FDA label from DailyMed API
   * Used as fallback when no cached label exists
   */
  private async fetchFDALabelLive(compound: string): Promise<AggregatedData['fdaLabels'] | null> {
    try {
      // Search DailyMed by drug name
      const searchUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(compound)}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!searchResponse.ok) {
        console.warn(`⚠️  DailyMed search returned ${searchResponse.status}`);
        return null;
      }
      
      const searchData = await searchResponse.json();
      const setids = searchData.data?.map((item: any) => item.setid) || [];
      
      if (setids.length === 0) {
        console.warn(`⚠️  No DailyMed labels found for ${compound}`);
        return null;
      }
      
      // Fetch first (most recent) label
      const setid = setids[0];
      const labelUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.json`;
      
      const labelResponse = await fetch(labelUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!labelResponse.ok) {
        console.warn(`⚠️  DailyMed label fetch returned ${labelResponse.status}`);
        return null;
      }
      
      const labelData = await labelResponse.json();
      const spl = labelData.data;
      
      if (!spl) return null;
      
      // Map LOINC section codes to names
      const sectionCodeMap: Record<string, string> = {
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
        '34089-3': 'description',
        '34066-1': 'boxed_warning',
        '51945-4': 'overdosage',
      };
      
      // Parse sections
      const sections: Record<string, string> = {};
      let fullText = '';
      const indications: string[] = [];
      
      if (spl.spl_sections && Array.isArray(spl.spl_sections)) {
        for (const section of spl.spl_sections) {
          const sectionName = sectionCodeMap[section.section_code] || 
            section.section_title?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
          
          // Clean HTML
          const cleanText = (section.section_text || '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanText) {
            sections[sectionName] = cleanText;
            fullText += `## ${section.section_title || sectionName}\n${cleanText}\n\n`;
            
            if (sectionName === 'indications_and_usage') {
              indications.push(cleanText);
            }
          }
        }
      }
      
      const label: FDALabel = {
        setId: setid,
        version: spl.version_number || '1',
        effectiveDate: spl.effective_time || new Date().toISOString(),
        fullText: fullText.trim(),
        sections,
        indications
      };
      
      console.log(`✅ Fetched FDA label live from DailyMed: ${Object.keys(sections).length} sections`);
      
      return {
        labels: [label],
        latestLabel: label,
        fullText: label.fullText,
        sections,
        approvalDate: label.effectiveDate,
        indications
      };
    } catch (error) {
      console.warn(`⚠️  Live fetch from DailyMed failed:`, error);
      return null;
    }
  }

  /**
   * Fetch trial results from external_data_cache
   * These are stored by enrichment from ClinicalTrials.gov results API
   */
  private async fetchTrialResults(compound: string): Promise<any[]> {
    try {
      const supabase = await this.getSupabase();
      
      const { data } = await supabase
        .from('external_data_cache')
        .select('*')
        .ilike('compound_name', `%${compound}%`)
        .eq('source', 'ctgov_results')
        .limit(20);
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Parse stored results
      const results = data.map((row: any) => {
        try {
          return JSON.parse(row.raw_content);
        } catch {
          return row.payload;
        }
      }).filter(Boolean);
      
      console.log(`✅ Found ${results.length} trial results from cache`);
      return results;
    } catch (error) {
      console.warn(`⚠️  Error fetching trial results:`, error);
      return [];
    }
  }
  
  private emptyTrials(): AggregatedData['clinicalTrials'] {
    return { studies: [], totalStudies: 0, byPhase: {}, endpoints: [], results: [] };
  }
  
  private emptySafety(): AggregatedData['safetyData'] {
    return { faersReports: [], commonAdverseEvents: [], seriousAdverseEvents: [], deaths: 0, labelWarnings: [] };
  }
  
  private emptyLabels(): AggregatedData['fdaLabels'] {
    return { labels: [], fullText: '', sections: {}, indications: [] };
  }
  
  private emptyLit(): AggregatedData['literature'] {
    return { pubmedArticles: [], keyFindings: [], citations: [] };
  }
}
