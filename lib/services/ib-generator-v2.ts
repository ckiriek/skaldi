/**
 * Universal IB Generator v2
 * 
 * Compound-agnostic Investigator's Brochure generator.
 * Uses the Universal Project Model and IBInput for generation.
 * 
 * Key features:
 * - Compound-agnostic (no hardcoded drug names)
 * - Phase 2/3/4 only (Phase 1 excluded)
 * - Supports small molecules, biologics, biosimilars, ATMPs
 * - Class-level fallbacks when data unavailable
 * 
 * @version 2.0.0
 * @date 2025-12-02
 */

import { createClient } from '@/lib/supabase/server'
import type { IBInput } from '@/lib/core/ib-input'
import { buildIBInput } from '@/lib/enrichment'
import { getIBSections } from '@/lib/core/ib-input'
import { SectionGenerator } from './section-generator'
import { QCValidator } from './qc-validator'
import { IBValidator } from './ib-validator'
import { AzureOpenAIClient } from '@/lib/integrations/azure-openai'

// ============================================================================
// TYPES
// ============================================================================

export interface IBGenerationRequest {
  projectId: string
  userId: string
  /** Override default generation config */
  configOverrides?: Partial<IBInput['generation_config']>
}

export interface IBGenerationResult {
  success: boolean
  documentId?: string
  sections: Record<string, string>
  errors?: Array<{ section: string; error: string }>
  validation?: {
    passed: boolean
    issues: Array<{
      section_id?: string
      rule_id: string
      severity: 'error' | 'warning' | 'info'
      message: string
    }>
  }
  completeness: IBInput['completeness']
  enrichment_warnings: string[]
  duration_ms: number
}

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class UniversalIBGenerator {
  private sectionGenerator: SectionGenerator
  private qcValidator: QCValidator
  private ibValidator: IBValidator
  
  constructor() {
    this.sectionGenerator = new SectionGenerator()
    this.qcValidator = new QCValidator()
    this.ibValidator = new IBValidator()
  }
  
  /**
   * Generate IB document using Universal Project Model
   */
  async generate(request: IBGenerationRequest): Promise<IBGenerationResult> {
    const startTime = Date.now()
    console.log(`📋 [IB Generator v2] Starting generation for project ${request.projectId}`)
    
    try {
      const supabase = await createClient()
      
      // 1. Build IBInput (runs all enrichers)
      console.log(`🔬 Step 1: Building IBInput with universal enrichment...`)
      const ibInput = await buildIBInput(request.projectId, request.configOverrides)
      
      console.log(`✅ IBInput built:`)
      console.log(`   - Compound: ${ibInput.compound.inn_name} (${ibInput.compound.compound_type})`)
      console.log(`   - Phase: ${ibInput.project.study_phase}`)
      console.log(`   - Indication: ${ibInput.project.indication}`)
      console.log(`   - Clinical trials: ${ibInput.clinical_trials.trials_count}`)
      console.log(`   - Overall completeness: ${Math.round(ibInput.completeness.overall * 100)}%`)
      
      if (ibInput.enrichment_warnings.length > 0) {
        console.warn(`⚠️ Enrichment warnings:`, ibInput.enrichment_warnings)
      }
      
      // 2. Get IB sections based on compound type
      console.log(`📊 Step 2: Getting IB sections...`)
      const ibSections = getIBSections(ibInput.compound.compound_type)
      console.log(`   - ${ibSections.length} sections to generate`)
      
      // 3. Generate each section
      console.log(`🎨 Step 3: Generating sections...`)
      const sections: Record<string, string> = {}
      const errors: Array<{ section: string; error: string }> = []
      
      for (let i = 0; i < ibSections.length; i++) {
        const section = ibSections[i]
        
        // Skip non-applicable sections
        if (!section.applicable) {
          console.log(`⏭️ Skipping non-applicable section: ${section.id}`)
          continue
        }
        
        // Add delay between sections to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        try {
          console.log(`🎨 Generating ${i + 1}/${ibSections.length}: ${section.id} - ${section.title}`)
          
          // Generate section with IBInput context
          const content = await this.generateSection(section.id, ibInput)
          
          if (content) {
            sections[section.id] = content
            console.log(`✅ Generated ${section.id} (${content.length} chars)`)
          } else {
            throw new Error('Empty content returned')
          }
          
        } catch (error) {
          console.error(`❌ Error generating ${section.id}:`, error)
          
          // Handle special sections
          if (section.id === 'toc') {
            sections[section.id] = this.generateTOC(ibSections)
            console.log(`📋 Auto-generated TOC`)
          } else {
            errors.push({
              section: section.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            sections[section.id] = `[Generation Error]\n\n${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }
      
      // 4. Validate and auto-fix
      console.log(`🔍 Step 4: Validating and auto-fixing...`)
      for (const [sectionId, content] of Object.entries(sections)) {
        const validation = this.ibValidator.validate(content, sectionId)
        
        if (!validation.isValid || validation.summary.placeholders > 0) {
          console.log(`⚠️ ${sectionId}: ${validation.summary.errors} errors, ${validation.summary.placeholders} placeholders`)
          
          // Auto-fix
          const fixResult = this.ibValidator.autoFix(content, {
            compoundName: ibInput.compound.inn_name,
            indication: ibInput.project.indication,
            phase: String(ibInput.project.study_phase)
          })
          
          if (fixResult.fixesApplied.length > 0) {
            console.log(`🔧 Auto-fixed: ${fixResult.fixesApplied.join(', ')}`)
            sections[sectionId] = fixResult.fixedContent
          }
        }
      }
      
      // 5. Run QC validation
      console.log(`🔍 Step 5: Running QC validation...`)
      const validationResult = await this.qcValidator.validate('IB', sections)
      console.log(`   - ${validationResult.passed ? 'PASSED' : 'FAILED'} (${validationResult.issues.length} issues)`)
      
      // 6. Save document
      console.log(`💾 Step 6: Saving document...`)
      
      // Get next version
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('version')
        .eq('project_id', request.projectId)
        .eq('type', 'IB')
        .order('version', { ascending: false })
        .limit(1)
      
      const nextVersion = (existingDocs?.[0]?.version || 0) + 1
      
      // Create document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: request.projectId,
          type: 'IB',
          status: 'draft',
          version: nextVersion,
          content: JSON.stringify(sections),
          created_by: request.userId,
          metadata: {
            generator_version: '2.0.0',
            compound_type: ibInput.compound.compound_type,
            therapeutic_class: ibInput.compound.therapeutic_class,
            completeness: ibInput.completeness,
            enrichment_warnings: ibInput.enrichment_warnings
          }
        })
        .select()
        .single()
      
      if (docError) {
        throw new Error(`Failed to save document: ${docError.message}`)
      }
      
      // 7. Update project enrichment status
      await supabase
        .from('projects')
        .update({
          enrichment_status: 'completed',
          enrichment_completed_at: new Date().toISOString()
        })
        .eq('id', request.projectId)
      
      const duration = Date.now() - startTime
      console.log(`✅ [IB Generator v2] Completed in ${duration}ms`)
      
      return {
        success: errors.length === 0,
        documentId: document.id,
        sections,
        errors: errors.length > 0 ? errors : undefined,
        validation: validationResult,
        completeness: ibInput.completeness,
        enrichment_warnings: ibInput.enrichment_warnings,
        duration_ms: duration
      }
      
    } catch (error) {
      console.error(`❌ [IB Generator v2] Error:`, error)
      
      return {
        success: false,
        sections: {},
        errors: [{
          section: 'general',
          error: error instanceof Error ? error.message : String(error)
        }],
        completeness: {
          cmc: 0, nonclinical: 0, clinical: 0, pk: 0, pd: 0, safety: 0, overall: 0
        },
        enrichment_warnings: [],
        duration_ms: Date.now() - startTime
      }
    }
  }
  
  // ============================================================================
  // SECTION GENERATION
  // ============================================================================
  
  /**
   * Generate a single IB section using IBInput
   */
  private async generateSection(sectionId: string, ibInput: IBInput): Promise<string> {
    // Build section-specific prompt
    const prompt = this.buildSectionPrompt(sectionId, ibInput)
    
    // Call Azure OpenAI directly
    const client = new AzureOpenAIClient()
    const response = await client.generateCompletion(
      [
        { role: 'system', content: this.getSystemPrompt(ibInput) },
        { role: 'user', content: prompt }
      ],
      {
        // GPT-5.1: Use verbosity and reasoning_effort (no temperature/max_tokens)
        verbosity: 'medium',
        reasoningEffort: 'medium'
      }
    )
    
    return response.content
  }
  
  /**
   * Build section-specific prompt with IBInput data
   */
  private buildSectionPrompt(sectionId: string, ibInput: IBInput): string {
    const { compound, project, cmc, nonclinical, clinical_trials, pk, pd, safety, references } = ibInput
    
    // Base context for all sections
    const baseContext = `
## Compound Information
- INN Name: ${compound.inn_name}
- Compound Type: ${compound.compound_type}
- Therapeutic Class: ${compound.therapeutic_class}
${compound.compound_type === 'biologic' || compound.compound_type === 'biosimilar' ? `- Antibody Isotype: ${compound.antibody_isotype || 'IgG'}` : ''}

## Study Information
- Phase: ${project.study_phase}
- Indication: ${project.indication}
- Population: ${project.population_type} (${project.population_age_min}-${project.population_age_max} years)
- Route: ${project.route_of_administration}
- Dosage Form: ${project.dosage_form}
`
    
    // Section-specific prompts
    switch (sectionId) {
      case 'title_page':
        return this.buildTitlePagePrompt(ibInput)
      
      case 'toc':
        return 'Generate Table of Contents based on the IB structure.'
      
      case 'summary':
        return this.buildSummaryPrompt(ibInput, baseContext)
      
      case 'introduction':
        return this.buildIntroductionPrompt(ibInput, baseContext)
      
      case 'cmc':
        return this.buildCMCPrompt(ibInput, baseContext)
      
      case 'nonclinical':
        return this.buildNonclinicalPrompt(ibInput, baseContext)
      
      case 'immunogenicity':
        return this.buildImmunogenicityPrompt(ibInput, baseContext)
      
      case 'clinical':
        return this.buildClinicalPrompt(ibInput, baseContext)
      
      case 'investigator_guidance':
        return this.buildInvestigatorGuidancePrompt(ibInput, baseContext)
      
      case 'references':
        return this.buildReferencesPrompt(ibInput)
      
      default:
        return `Generate content for section: ${sectionId}\n\n${baseContext}`
    }
  }
  
  // ============================================================================
  // SECTION-SPECIFIC PROMPTS
  // ============================================================================
  
  private buildTitlePagePrompt(ibInput: IBInput): string {
    return `Generate the Title Page for the Investigator's Brochure.

## Required Elements
- Document Title: Investigator's Brochure
- Compound: ${ibInput.compound.inn_name}
- Sponsor: ${ibInput.project.sponsor_name}
- Version: ${ibInput.project.version}
- Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- Confidentiality Statement

Format as a professional title page with centered text.`
  }
  
  private buildSummaryPrompt(ibInput: IBInput, baseContext: string): string {
    return `Generate the Summary section for the Investigator's Brochure.

${baseContext}

## Key Points to Include
1. Brief description of ${ibInput.compound.inn_name}
2. Mechanism of action: ${ibInput.pd.mechanism || 'To be described'}
3. Key pharmacokinetic properties: T½ = ${ibInput.pk.t_half || 'TBD'}, Tmax = ${ibInput.pk.tmax || 'TBD'}
4. Main safety findings from nonclinical studies
5. Summary of clinical experience (${ibInput.clinical_trials.trials_count} Phase ${ibInput.project.study_phase}+ trials)
6. Proposed indication: ${ibInput.project.indication}

## Safety Highlights
- Boxed Warning: ${ibInput.safety.boxed_warning || 'None'}
- Key Warnings: ${ibInput.safety.warnings.slice(0, 3).join('; ') || 'See full safety section'}
- Common AEs: ${ibInput.safety.common_ae.slice(0, 5).map(ae => ae.term).join(', ') || 'See full safety section'}

Keep the summary concise (1-2 pages) but comprehensive.`
  }
  
  private buildIntroductionPrompt(ibInput: IBInput, baseContext: string): string {
    return `Generate the Introduction section for the Investigator's Brochure.

${baseContext}

## Content Requirements
1. General introduction to ${ibInput.compound.inn_name}
2. Compound type: ${ibInput.compound.compound_type}
3. Therapeutic class: ${ibInput.compound.therapeutic_class}
4. Rationale for development in ${ibInput.project.indication}
5. Brief overview of the development program
6. Purpose and scope of this IB

Do NOT include clinical study results in this section - those belong in Section 5 (Effects in Humans).`
  }
  
  private buildCMCPrompt(ibInput: IBInput, baseContext: string): string {
    const { cmc, compound } = ibInput
    const isBiologic = compound.compound_type === 'biologic' || compound.compound_type === 'biosimilar'
    
    let cmcData = `
## ${isBiologic ? 'Physical, Biological, and Pharmaceutical Properties' : 'Physical, Chemical, and Pharmaceutical Properties'}

### Identity
- INN: ${compound.inn_name}
${!isBiologic ? `- Molecular Formula: ${cmc.molecular_formula || 'Data not publicly available'}
- Molecular Weight: ${cmc.molecular_weight ? cmc.molecular_weight + ' g/mol' : 'Data not publicly available'}
- Chemical Name: ${cmc.chemical_name || compound.inn_name}` : ''}
${isBiologic ? `- Protein Structure: ${cmc.biologic_properties?.protein_structure || 'Monoclonal antibody'}
- Molecular Weight: ${cmc.biologic_properties?.molecular_weight_kda ? cmc.biologic_properties.molecular_weight_kda + ' kDa' : '~150 kDa'}
- Expression System: ${cmc.biologic_properties?.expression_system || 'CHO cells'}
- Glycosylation: ${cmc.biologic_properties?.glycosylation || 'N-linked at Fc region'}` : ''}

### Physical Properties
${cmc.physical_properties?.state ? `- Physical State: ${cmc.physical_properties.state}` : ''}
${cmc.physical_properties?.color ? `- Appearance: ${cmc.physical_properties.color}` : ''}
${!isBiologic && cmc.pKa ? `- pKa: ${cmc.pKa}` : ''}
${!isBiologic && cmc.logP ? `- LogP: ${cmc.logP}` : ''}

### Solubility
${cmc.solubility_profile?.water ? `- Water: ${cmc.solubility_profile.water}` : ''}
${cmc.solubility_profile?.organic ? `- Organic Solvents: ${cmc.solubility_profile.organic}` : ''}

### Formulation
- Dosage Form: ${cmc.formulation?.dosage_form || ibInput.project.dosage_form}
- Route: ${cmc.formulation?.route || ibInput.project.route_of_administration}
${cmc.formulation?.strength ? `- Strength: ${cmc.formulation.strength}` : ''}

### Storage and Stability
${cmc.storage_stability?.storage_conditions ? `- Storage: ${cmc.storage_stability.storage_conditions}` : ''}
${cmc.storage_stability?.shelf_life ? `- Shelf Life: ${cmc.storage_stability.shelf_life}` : ''}
`
    
    return `Generate the CMC section for the Investigator's Brochure.

${baseContext}

${cmcData}

Data Source: ${cmc.source}
Completeness: ${Math.round((ibInput.completeness.cmc || 0) * 100)}%

Write a professional CMC section following ICH E6 guidelines. Include all available data. For any missing data, write "Data not publicly available" - do NOT use "[To be provided by Sponsor]" placeholders.`
  }
  
  private buildNonclinicalPrompt(ibInput: IBInput, baseContext: string): string {
    const { nonclinical } = ibInput
    
    return `Generate the Nonclinical Studies section for the Investigator's Brochure.

${baseContext}

## Nonclinical Data

### Pharmacology
- Primary Pharmacodynamics: ${nonclinical.primary_pharmacodynamics || 'See Mechanism of Action section'}
- Secondary Pharmacodynamics: ${nonclinical.secondary_pharmacodynamics || 'Data not publicly available'}
- Safety Pharmacology: ${nonclinical.safety_pharmacology || 'No significant findings in standard safety pharmacology studies'}

### Toxicology
- Target Organs: ${nonclinical.target_organs?.join(', ') || '[To be determined]'}
- Single-Dose Toxicity: ${nonclinical.single_dose_toxicity || 'Completed in rodent and non-rodent species'}
- Repeat-Dose Toxicity: ${nonclinical.repeat_dose_toxicity || 'Completed in rodent and non-rodent species'}
${nonclinical.noael ? `- NOAEL: ${nonclinical.noael.value} (${nonclinical.noael.species}, ${nonclinical.noael.duration})` : ''}

### Genetic Toxicology
${nonclinical.genotoxicity || '[Standard battery to be conducted]'}

### Carcinogenicity
${nonclinical.carcinogenicity || '[Not required for Phase 2/3 or see class data]'}

### Reproductive Toxicity
${nonclinical.reproductive_toxicity || 'Standard reproductive toxicity studies completed'}

Data Source: ${nonclinical.source}
Completeness: ${Math.round((ibInput.completeness.nonclinical || 0) * 100)}%

Write a comprehensive nonclinical section following ICH S guidelines.`
  }
  
  private buildImmunogenicityPrompt(ibInput: IBInput, baseContext: string): string {
    // Only for biologics
    if (ibInput.compound.compound_type !== 'biologic' && ibInput.compound.compound_type !== 'biosimilar') {
      return ''
    }
    
    return `Generate the Immunogenicity section for the Investigator's Brochure.

${baseContext}

## Immunogenicity Data

${ibInput.safety.immunogenicity || `Anti-drug antibodies (ADA) may develop during treatment with ${ibInput.compound.inn_name}. The clinical significance of ADA development is being evaluated in ongoing clinical studies.

### Assessment Methods
- Screening assay: [To be specified]
- Confirmatory assay: [To be specified]
- Neutralizing antibody assay: [To be specified]

### Clinical Implications
- Impact on efficacy: [To be determined]
- Impact on safety: [To be determined]
- Impact on pharmacokinetics: [To be determined]`}

Write a professional immunogenicity section appropriate for a biologic product.`
  }
  
  private buildClinicalPrompt(ibInput: IBInput, baseContext: string): string {
    const { clinical_trials, pk, pd, safety } = ibInput
    
    // Build trials summary
    const trialsSummary = clinical_trials.filtered_trials.slice(0, 5).map(t => 
      `- ${t.nct_id}: ${t.title} (Phase ${t.phase}, n=${t.enrollment || 'TBD'}, ${t.status})`
    ).join('\n')
    
    return `Generate the Effects in Humans (Clinical) section for the Investigator's Brochure.

${baseContext}

## Pharmacokinetics in Humans
- Absorption: ${pk.absorption || 'Rapidly absorbed after oral administration'}
- Distribution: ${pk.distribution?.vd || 'Data not publicly available'}
- Protein Binding: ${pk.distribution?.protein_binding || 'Data not publicly available'}
- Metabolism: ${pk.metabolism?.primary_pathway || 'See metabolism section'}
- Elimination: ${pk.elimination?.route || 'See elimination section'}
- Half-life: ${pk.t_half || 'Data not publicly available'}
- Tmax: ${pk.tmax || 'Data not publicly available'}
- Bioavailability: ${pk.bioavailability || 'Data not publicly available'}

## Pharmacodynamics in Humans
- Mechanism: ${pd.mechanism || 'See Mechanism of Action section'}
- Onset of Action: ${pd.onset_of_action || 'Data not publicly available'}
- Duration of Effect: ${pd.duration_of_effect || 'Data not publicly available'}
${pd.qt_effect ? `- QT Effect: ${pd.qt_effect}` : ''}

## Clinical Trials Summary
Total Phase 2+ Trials: ${clinical_trials.trials_count}
- Phase 2: ${clinical_trials.count_by_phase.phase_2}
- Phase 3: ${clinical_trials.count_by_phase.phase_3}
- Phase 4: ${clinical_trials.count_by_phase.phase_4}
Trials with Results: ${clinical_trials.trials_with_results}

### Key Trials
${trialsSummary || 'No Phase 2+ trials available'}

## Safety in Humans

### Boxed Warning
${safety.boxed_warning || 'None'}

### Warnings and Precautions
${safety.warnings.slice(0, 5).map(w => `- ${w}`).join('\n') || '- See full prescribing information'}

### Contraindications
${safety.contraindications.slice(0, 5).map(c => `- ${c}`).join('\n') || '- Known hypersensitivity'}

### Common Adverse Events (≥5%)
${safety.common_ae.slice(0, 10).map(ae => `- ${ae.term}${ae.frequency ? ` (${Math.round(ae.frequency * 100)}%)` : ''}`).join('\n') || '- See clinical trial data'}

### Serious Adverse Events
${safety.serious_ae.slice(0, 5).map(ae => `- ${ae.term}`).join('\n') || '- See clinical trial data'}

### Drug Interactions
${safety.drug_interactions.slice(0, 5).map(i => `- ${i.drug}: ${i.mechanism} (${i.severity})`).join('\n') || '- See full prescribing information'}

### Special Populations
- Pregnancy: ${safety.special_populations.pregnancy || 'Use only if clearly needed; limited human data'}
- Lactation: ${safety.special_populations.lactation || 'Caution advised; excretion in milk unknown'}
- Pediatric: ${safety.special_populations.pediatric || 'Safety and efficacy not established'}
- Geriatric: ${safety.special_populations.geriatric || 'No dose adjustment required based on age alone'}
- Renal Impairment: ${safety.special_populations.renal_impairment || 'See dosing recommendations'}
- Hepatic Impairment: ${safety.special_populations.hepatic_impairment || 'See dosing recommendations'}

### Overdose
${safety.overdose?.treatment || 'Supportive care; no specific antidote'}

Write a comprehensive clinical section following ICH E6 guidelines. Focus on Phase 2+ data only.`
  }
  
  private buildInvestigatorGuidancePrompt(ibInput: IBInput, baseContext: string): string {
    return `Generate the Summary of Data and Guidance for the Investigator section.

${baseContext}

## Key Information for Investigators

### Compound Overview
${ibInput.compound.inn_name} is a ${ibInput.compound.compound_type} ${ibInput.compound.therapeutic_class} being developed for ${ibInput.project.indication}.

### Dosing Recommendations
- Route: ${ibInput.project.route_of_administration}
- Dosage Form: ${ibInput.project.dosage_form}
- Recommended monitoring: [Based on safety profile]

### Safety Monitoring
${ibInput.safety.boxed_warning ? `⚠️ BOXED WARNING: ${ibInput.safety.boxed_warning}` : ''}

Key safety concerns to monitor:
${ibInput.safety.warnings.slice(0, 5).map(w => `- ${w}`).join('\n')}

### Contraindications
${ibInput.safety.contraindications.slice(0, 5).map(c => `- ${c}`).join('\n')}

### Drug Interactions to Avoid
${ibInput.safety.drug_interactions.filter(i => i.severity === 'major').slice(0, 3).map(i => `- ${i.drug}: ${i.recommendation}`).join('\n') || '- See full drug interactions section'}

### Special Populations
- Pregnancy: ${ibInput.safety.special_populations.pregnancy ? 'See Section 5' : 'Use with caution'}
- Renal Impairment: ${ibInput.pk.special_populations?.renal_impairment || 'See Section 5'}
- Hepatic Impairment: ${ibInput.pk.special_populations?.hepatic_impairment || 'See Section 5'}

### Overdose Management
${ibInput.safety.overdose?.treatment || 'Symptomatic and supportive care'}

Write practical guidance for investigators conducting clinical trials with this compound.`
  }
  
  private buildReferencesPrompt(ibInput: IBInput): string {
    const { references } = ibInput
    
    // Use pre-formatted list if available
    if (references.formatted_list && references.formatted_list.length > 0) {
      return `Generate the References section using the following formatted references:

${references.formatted_list.join('\n\n')}

Format as a numbered reference list following Vancouver style.`
    }
    
    // Build from individual references
    let refList = ''
    let refNum = 1
    
    for (const label of references.labels) {
      refList += `${refNum}. ${label.product_name}. Prescribing Information. ${label.source}. ${label.url || ''}\n`
      refNum++
    }
    
    for (const trial of references.clinical_trials.slice(0, 10)) {
      refList += `${refNum}. ${trial.nct_id}. ${trial.title}. ClinicalTrials.gov. ${trial.url}\n`
      refNum++
    }
    
    for (const pub of references.publications.slice(0, 10)) {
      refList += `${refNum}. ${pub.authors}. ${pub.title}. ${pub.journal}. ${pub.year}.\n`
      refNum++
    }
    
    return `Generate the References section for the Investigator's Brochure.

${refList || 'No references available - generate placeholder reference list.'}

Format as a numbered reference list following Vancouver style.`
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private getSystemPrompt(ibInput: IBInput): string {
    return `You are an expert medical writer generating an Investigator's Brochure (IB) for ${ibInput.compound.inn_name}.

CRITICAL RULES:
1. This is a ${ibInput.compound.compound_type} compound - use appropriate terminology
2. Only include Phase 2, 3, and 4 clinical data - NO Phase 1 data
3. Do NOT invent or fabricate any clinical data, study results, or safety information
4. For missing data, write "Data not publicly available" - NEVER use "[To be provided by Sponsor]" placeholders
5. Follow ICH E6(R2) and ICH M4 guidelines for IB structure
6. Use professional, regulatory-appropriate language
7. Be concise but comprehensive
8. Use actual data from the enrichment context provided above

COMPOUND TYPE: ${ibInput.compound.compound_type}
${ibInput.compound.compound_type === 'biologic' || ibInput.compound.compound_type === 'biosimilar' ? 
  '- Include immunogenicity considerations\n- Use biologic-appropriate CMC terminology\n- No pKa/logP (not applicable to biologics)' : 
  '- Include standard small molecule CMC data\n- Include pKa, logP if available'}

TARGET LENGTH: ${ibInput.generation_config.target_length}
- abbreviated: ~30-50 pages
- standard: ~80-120 pages
- extended: ~150-200 pages`
  }
  
  private getMaxTokensForSection(sectionId: string, targetLength: IBInput['generation_config']['target_length']): number {
    const baseTokens: Record<string, number> = {
      title_page: 500,
      toc: 1000,
      summary: 2000,
      introduction: 1500,
      cmc: 3000,
      nonclinical: 4000,
      immunogenicity: 2000,
      clinical: 6000,
      investigator_guidance: 2000,
      references: 1500
    }
    
    const multiplier = targetLength === 'abbreviated' ? 0.6 : targetLength === 'extended' ? 1.5 : 1
    
    return Math.round((baseTokens[sectionId] || 2000) * multiplier)
  }
  
  private generateTOC(sections: Array<{ id: string; title: string; required: boolean }>): string {
    let toc = '# TABLE OF CONTENTS\n\n'
    
    sections.forEach((section, index) => {
      toc += `${index + 1}. ${section.title}\n`
    })
    
    return toc
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const universalIBGenerator = new UniversalIBGenerator()
