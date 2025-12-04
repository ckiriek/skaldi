/**
 * IB Enrichment Service
 * 
 * Specialized enrichment for Investigator's Brochure generation
 * Uses REAL DATA from public APIs - NO FALLBACKS
 * 
 * Data Sources:
 * - openFDA Drug Label API (primary)
 * - PubChem API (CMC data)
 * - ClinicalTrials.gov (trials)
 * 
 * Version: 2.0.0
 * Date: 2025-12-03
 */

import { createClient } from '@/lib/supabase/server'
import { openFDAClient } from '@/lib/integrations/openfda'
import { pubchemAdapter } from '@/lib/adapters/pubchem'

// ============================================================================
// TYPES
// ============================================================================

export interface LabelData {
  mechanism: string | null
  approved_indications: string[]
  dose: {
    recommended: string | null
    range: string | null
    adjustments: string | null
  }
  pk: {
    absorption: string | null
    distribution: string | null
    metabolism: string | null
    excretion: string | null
    half_life: string | null
    bioavailability: string | null
  }
  pd: {
    mechanism_of_action: string | null
    pharmacodynamic_effects: string | null
  }
  warnings: string[]
  precautions: string[]
  contraindications: string[]
  drug_interactions: string[]
  adverse_events: {
    common: string[]
    serious: string[]
    frequencies: Record<string, number>
  }
  overdose: string | null
  storage: string | null
  shelf_life: string | null
  formulation: string | null
  boxed_warning: string | null
}

export interface ToxicologyProfile {
  species: string[]
  noael: {
    value: string | null
    species: string | null
    duration: string | null
  }
  target_organs: string[]
  single_dose_toxicity: string | null
  repeat_dose_toxicity: string | null
  genotoxicity: string | null
  carcinogenicity: string | null
  reproductive_toxicity: string | null
  developmental_toxicity: string | null
  local_tolerance: string | null
  safety_pharmacology: string | null
  source: 'label' | 'class_based' | 'unknown'
}

export interface CMCData {
  molecular_formula: string | null
  molecular_weight: number | null
  chemical_name: string | null
  iupac_name: string | null
  cas_number: string | null
  physical_state: string | null
  appearance: string | null
  pKa: string | null
  logP: number | null
  solubility: {
    water: string | null
    organic: string | null
  }
  dosage_form: string | null
  strength: string | null
  excipients: string[]
  manufacturing_notes: string | null
  stability: string | null
  storage: string | null
  shelf_life: string | null
  packaging: string | null
  source: 'pubchem' | 'label' | 'project' | 'class_based'
}

export interface PKPDData {
  tmax: string | null
  cmax: string | null
  t_half: string | null
  auc: string | null
  bioavailability: string | null
  absorption: string | null
  distribution: {
    vd: string | null
    protein_binding: string | null
    tissue_distribution: string | null
  }
  metabolism: {
    primary_pathway: string | null
    enzymes: string[]
    metabolites: string[]
  }
  elimination: {
    route: string | null
    clearance: string | null
  }
  steady_state: string | null
  food_effect: string | null
  special_populations: {
    renal_impairment: string | null
    hepatic_impairment: string | null
    elderly: string | null
    pediatric: string | null
  }
  source: 'label' | 'trials' | 'class_based'
}

export interface IBEnrichmentData {
  drug_name: string
  indication: string
  phase: string
  label_data: LabelData
  trials: any[]
  tox: ToxicologyProfile
  cmc: CMCData
  pkpd: PKPDData
}

// ============================================================================
// DRUG CLASS DEFINITIONS (for fallback)
// ============================================================================

const DRUG_CLASS_DATA: Record<string, {
  tox: Partial<ToxicologyProfile>
  pkpd: Partial<PKPDData>
  cmc: Partial<CMCData>
}> = {
  'SSRI': {
    tox: {
      target_organs: ['Central Nervous System', 'Liver', 'Cardiovascular System'],
      genotoxicity: 'SSRIs as a class have generally shown negative results in standard genotoxicity assays including bacterial mutagenicity tests (Ames test), in vitro chromosomal aberration tests, and in vivo micronucleus tests.',
      carcinogenicity: 'Long-term carcinogenicity studies in rodents have not shown evidence of carcinogenic potential for SSRIs at clinically relevant doses.',
      reproductive_toxicity: 'SSRIs may cause reproductive toxicity including decreased fertility in animal studies at high doses. Effects on sexual function and fertility have been observed in clinical use.',
      developmental_toxicity: 'SSRIs cross the placenta and have been associated with neonatal complications when used in the third trimester, including persistent pulmonary hypertension of the newborn (PPHN) and neonatal adaptation syndrome.',
      safety_pharmacology: 'SSRIs have been evaluated for effects on cardiovascular, respiratory, and central nervous systems. QT prolongation has been observed with some SSRIs at supratherapeutic doses.'
    },
    pkpd: {
      absorption: 'Well absorbed after oral administration with peak plasma concentrations typically reached within 4-8 hours.',
      distribution: {
        vd: 'Large volume of distribution (12-43 L/kg) indicating extensive tissue distribution',
        protein_binding: 'Highly protein bound (94-99%)',
        tissue_distribution: 'Widely distributed including CNS penetration'
      },
      metabolism: {
        primary_pathway: 'Hepatic metabolism via cytochrome P450 enzymes',
        enzymes: ['CYP2D6', 'CYP2C19', 'CYP3A4'],
        metabolites: ['Active metabolites may contribute to pharmacological effect']
      },
      elimination: {
        route: 'Primarily renal excretion of metabolites',
        clearance: 'Hepatic clearance with long elimination half-life'
      },
      t_half: '1-6 days (varies by specific SSRI)',
      steady_state: 'Achieved within 1-2 weeks of daily dosing',
      food_effect: 'Generally minimal effect on absorption; may be taken with or without food'
    },
    cmc: {
      physical_state: 'White to off-white crystalline powder',
      solubility: {
        water: 'Slightly soluble to freely soluble depending on salt form',
        organic: 'Soluble in methanol and ethanol'
      }
    }
  },
  'SNRI': {
    tox: {
      target_organs: ['Central Nervous System', 'Liver', 'Cardiovascular System', 'Kidney'],
      genotoxicity: 'SNRIs have generally shown negative results in standard genotoxicity battery.',
      carcinogenicity: 'No evidence of carcinogenic potential in standard rodent studies.',
      reproductive_toxicity: 'May affect fertility at high doses in animal studies.',
      developmental_toxicity: 'Similar to SSRIs, third trimester use associated with neonatal complications.',
      safety_pharmacology: 'Cardiovascular effects including blood pressure elevation observed.'
    },
    pkpd: {
      absorption: 'Well absorbed orally with bioavailability of 40-90%.',
      t_half: '5-12 hours',
      metabolism: {
        primary_pathway: 'Hepatic metabolism',
        enzymes: ['CYP2D6', 'CYP3A4'],
        metabolites: ['Active metabolites may be present']
      }
    },
    cmc: {
      physical_state: 'White to off-white powder'
    }
  },
  'PPI': {
    tox: {
      target_organs: ['Gastrointestinal Tract', 'Liver', 'Bone'],
      genotoxicity: 'Negative in standard genotoxicity assays.',
      carcinogenicity: 'Gastric carcinoid tumors observed in long-term rodent studies due to hypergastrinemia.',
      reproductive_toxicity: 'No significant effects on fertility in animal studies.',
      developmental_toxicity: 'Generally considered safe in pregnancy (Category B/C).'
    },
    pkpd: {
      absorption: 'Rapidly absorbed, acid-labile requiring enteric coating.',
      t_half: '1-2 hours (but prolonged effect due to irreversible binding)',
      bioavailability: '30-90% depending on formulation'
    },
    cmc: {
      physical_state: 'White to off-white powder',
      stability: 'Acid-labile, requires protection from moisture'
    }
  },
  'STATIN': {
    tox: {
      target_organs: ['Liver', 'Skeletal Muscle', 'Kidney'],
      genotoxicity: 'Negative in standard assays.',
      carcinogenicity: 'No carcinogenic potential at therapeutic doses.',
      reproductive_toxicity: 'Contraindicated in pregnancy due to potential fetal harm.',
      safety_pharmacology: 'Myopathy and rhabdomyolysis are class effects.'
    },
    pkpd: {
      absorption: 'Variable absorption (5-60% bioavailability).',
      metabolism: {
        primary_pathway: 'Hepatic metabolism',
        enzymes: ['CYP3A4', 'CYP2C9'],
        metabolites: ['Active metabolites for some statins']
      },
      t_half: '1-20 hours depending on specific statin'
    },
    cmc: {
      physical_state: 'White crystalline powder'
    }
  },
  'NSAID': {
    tox: {
      target_organs: ['Gastrointestinal Tract', 'Kidney', 'Cardiovascular System', 'Liver'],
      genotoxicity: 'Generally negative in standard assays.',
      carcinogenicity: 'No carcinogenic potential demonstrated.',
      reproductive_toxicity: 'May affect fertility; avoid in third trimester.',
      safety_pharmacology: 'GI bleeding, renal effects, cardiovascular risk are class effects.'
    },
    pkpd: {
      absorption: 'Well absorbed orally.',
      distribution: {
        protein_binding: 'Highly protein bound (>95%)',
        vd: 'Low volume of distribution',
        tissue_distribution: null
      },
      t_half: '2-15 hours depending on specific NSAID'
    },
    cmc: {
      physical_state: 'White to off-white crystalline powder',
      solubility: {
        water: 'Poorly soluble in water',
        organic: 'Soluble in organic solvents'
      }
    }
  },
  'ANTIBIOTIC': {
    tox: {
      target_organs: ['Gastrointestinal Tract', 'Liver', 'Kidney', 'Bone Marrow'],
      genotoxicity: 'Variable by class; most show negative results.',
      carcinogenicity: 'Generally no carcinogenic potential.',
      reproductive_toxicity: 'Variable by class; some contraindicated in pregnancy.',
      safety_pharmacology: 'QT prolongation with some classes (fluoroquinolones, macrolides).'
    },
    pkpd: {
      absorption: 'Variable by class and formulation.',
      elimination: {
        route: 'Renal or hepatic depending on class',
        clearance: 'Variable'
      }
    },
    cmc: {
      stability: 'Variable; some require refrigeration'
    }
  },
  'DEFAULT': {
    tox: {
      target_organs: ['To be determined based on specific compound'],
      genotoxicity: 'Standard genotoxicity battery (Ames test, chromosomal aberration, micronucleus) should be conducted.',
      carcinogenicity: 'Long-term carcinogenicity studies may be required depending on indication and duration of use.',
      reproductive_toxicity: 'Fertility and early embryonic development studies should be conducted.',
      developmental_toxicity: 'Embryo-fetal development studies in two species recommended.',
      safety_pharmacology: 'Core battery (CNS, cardiovascular, respiratory) should be evaluated.'
    },
    pkpd: {
      absorption: 'To be characterized in Phase 1 studies.',
      metabolism: {
        primary_pathway: 'To be determined',
        enzymes: [],
        metabolites: []
      }
    },
    cmc: {
      physical_state: 'To be characterized'
    }
  }
}

// ============================================================================
// IB ENRICHMENT SERVICE CLASS
// ============================================================================

export class IBEnrichmentService {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Main enrichment function - aggregates all IB-specific data
   */
  async enrichForIB(
    projectId: string,
    drugName: string,
    indication: string,
    phase: string
  ): Promise<IBEnrichmentData> {
    console.log(`🔬 IB Enrichment starting for ${drugName} (${indication}, ${phase})`)

    // Fetch all data in parallel
    const [labelData, toxProfile, cmcData, pkpdData, trials] = await Promise.all([
      this.getLabelData(drugName),
      this.getToxicologyProfile(drugName),
      this.getBasicCMC(drugName, projectId),
      this.getPKPDEnrich(drugName),
      this.getRelevantTrials(drugName, indication)
    ])

    console.log(`✅ IB Enrichment complete:`)
    console.log(`   - Label data: ${labelData.approved_indications.length} indications, ${labelData.warnings.length} warnings`)
    console.log(`   - Tox profile: ${toxProfile.target_organs.length} target organs (source: ${toxProfile.source})`)
    console.log(`   - CMC data: ${cmcData.molecular_formula || 'N/A'} (source: ${cmcData.source})`)
    console.log(`   - PKPD data: t½=${pkpdData.t_half || 'N/A'} (source: ${pkpdData.source})`)
    console.log(`   - Trials: ${trials.length} relevant studies`)

    return {
      drug_name: drugName,
      indication,
      phase,
      label_data: labelData,
      trials,
      tox: toxProfile,
      cmc: cmcData,
      pkpd: pkpdData
    }
  }

  // ============================================================================
  // 3.1 getLabelData - Uses openFDA API directly
  // ============================================================================

  async getLabelData(drugName: string): Promise<LabelData> {
    console.log(`📋 Fetching label data for ${drugName} via openFDA`)

    const emptyLabel: LabelData = {
      mechanism: null,
      approved_indications: [],
      dose: { recommended: null, range: null, adjustments: null },
      pk: { absorption: null, distribution: null, metabolism: null, excretion: null, half_life: null, bioavailability: null },
      pd: { mechanism_of_action: null, pharmacodynamic_effects: null },
      warnings: [],
      precautions: [],
      contraindications: [],
      drug_interactions: [],
      adverse_events: { common: [], serious: [], frequencies: {} },
      overdose: null,
      storage: null,
      shelf_life: null,
      formulation: null,
      boxed_warning: null
    }

    try {
      // Use openFDA API directly
      const label = await openFDAClient.getFullDrugLabel(drugName)

      if (!label) {
        console.log(`⚠️ No FDA label found for ${drugName}`)
        return emptyLabel
      }

      // Extract mechanism of action
      if (label.mechanismOfAction) {
        emptyLabel.mechanism = label.mechanismOfAction
        emptyLabel.pd.mechanism_of_action = label.mechanismOfAction
      }

      // Extract indications
      if (label.indications) {
        emptyLabel.approved_indications = [label.indications]
      }

      // Extract dosing
      if (label.dosage) {
        emptyLabel.dose.recommended = label.dosage
      }

      // Extract PK from label.pkData
      if (label.pkData) {
        emptyLabel.pk.half_life = label.pkData.tHalf || null
        emptyLabel.pk.bioavailability = label.pkData.bioavailability || null
        emptyLabel.pk.distribution = label.pkData.proteinBinding || null
        emptyLabel.pk.metabolism = label.pkData.metabolism || null
        emptyLabel.pk.excretion = label.pkData.elimination || null
      }

      // Extract warnings
      if (label.warnings) {
        emptyLabel.warnings = label.warnings.split(/[.;]/).filter(w => w.trim().length > 10).slice(0, 20)
      }

      // Extract boxed warning
      if (label.boxedWarning) {
        emptyLabel.boxed_warning = label.boxedWarning
      }

      // Extract contraindications
      if (label.contraindications) {
        emptyLabel.contraindications = label.contraindications.split(/[.;]/).filter(c => c.trim().length > 10).slice(0, 10)
      }

      // Extract drug interactions
      if (label.drugInteractions) {
        emptyLabel.drug_interactions = label.drugInteractions.split(/[.;]/).filter(i => i.trim().length > 10).slice(0, 15)
      }

      // Extract adverse reactions
      if (label.adverseReactions) {
        const aeText = label.adverseReactions
        // Parse frequencies from text
        const freqMatches = aeText.matchAll(/([a-zA-Z\s]+)\s*\((\d+(?:\.\d+)?)\s*%\)/g)
        const frequencies: Record<string, number> = {}
        const common: string[] = []
        for (const match of freqMatches) {
          const term = match[1].trim()
          const freq = parseFloat(match[2])
          if (term.length > 2 && freq > 0) {
            frequencies[term] = freq
            common.push(term)
          }
        }
        emptyLabel.adverse_events = {
          common: common.slice(0, 20),
          serious: [],
          frequencies
        }
      }

      // Extract overdose (if available in label)
      // Note: overdosage field may not exist in all labels

      console.log(`✅ Label data extracted via openFDA: ${emptyLabel.approved_indications.length} indications, t½=${emptyLabel.pk.half_life}`)
      return emptyLabel

    } catch (error) {
      console.error(`❌ Error fetching label data:`, error)
      return emptyLabel
    }
  }

  // ============================================================================
  // 3.2 getRelevantTrials
  // ============================================================================

  async getRelevantTrials(drugName: string, indication: string): Promise<any[]> {
    console.log(`🔍 Fetching relevant trials for ${drugName} + ${indication}`)

    try {
      const supabase = await this.getSupabase()

      // Strategy: Filter by BOTH drug name AND indication
      // This eliminates irrelevant trials that just happen to mention the drug

      // First, try evidence_sources table (from enrichment)
      const { data: evidenceTrials } = await supabase
        .from('evidence_sources')
        .select('*')
        .eq('source', 'clinicaltrials')
        .limit(200)

      let relevantTrials: any[] = []

      if (evidenceTrials && evidenceTrials.length > 0) {
        // Filter by drug name in interventions AND indication in conditions
        relevantTrials = evidenceTrials.filter((trial: any) => {
          const payload = trial.payload_json || {}
          const title = (trial.title || '').toLowerCase()
          const snippet = (trial.snippet || '').toLowerCase()
          
          // Check if drug is in interventions
          const interventions = payload.interventions || []
          const hasDrug = interventions.some((i: any) => 
            (i.name || '').toLowerCase().includes(drugName.toLowerCase())
          ) || title.includes(drugName.toLowerCase()) || snippet.includes(drugName.toLowerCase())

          // Check if indication matches
          const conditions = payload.conditions || []
          const hasIndication = conditions.some((c: string) =>
            c.toLowerCase().includes(indication.toLowerCase()) ||
            indication.toLowerCase().includes(c.toLowerCase())
          ) || title.includes(indication.toLowerCase()) || snippet.includes(indication.toLowerCase())

          return hasDrug && hasIndication
        })
      }

      // If not enough from evidence_sources, try trials table
      if (relevantTrials.length < 10) {
        const { data: dbTrials } = await supabase
          .from('trials')
          .select('*')
          .or(`title.ilike.%${drugName}%,title.ilike.%${indication}%`)
          .limit(100)

        if (dbTrials) {
          const filteredDbTrials = dbTrials.filter((trial: any) => {
            const title = (trial.title || '').toLowerCase()
            return title.includes(drugName.toLowerCase()) && 
                   title.includes(indication.toLowerCase())
          })
          relevantTrials = [...relevantTrials, ...filteredDbTrials]
        }
      }

      // Deduplicate by NCT ID
      const seen = new Set<string>()
      relevantTrials = relevantTrials.filter((trial: any) => {
        const nctId = trial.external_id || trial.nct_id
        if (!nctId || seen.has(nctId)) return false
        seen.add(nctId)
        return true
      })

      // Sort by phase (Phase 3 first) and results availability
      relevantTrials.sort((a, b) => {
        const phaseA = this.getPhaseNumber(a.payload_json?.phase || a.phase)
        const phaseB = this.getPhaseNumber(b.payload_json?.phase || b.phase)
        if (phaseB !== phaseA) return phaseB - phaseA
        
        // Prefer trials with results
        const hasResultsA = a.payload_json?.hasResults || a.results ? 1 : 0
        const hasResultsB = b.payload_json?.hasResults || b.results ? 1 : 0
        return hasResultsB - hasResultsA
      })

      // Limit to top 50 most relevant
      relevantTrials = relevantTrials.slice(0, 50)

      console.log(`✅ Found ${relevantTrials.length} relevant trials for ${drugName} + ${indication}`)
      return relevantTrials

    } catch (error) {
      console.error(`❌ Error fetching trials:`, error)
      return []
    }
  }

  // ============================================================================
  // 3.3 getToxicologyProfile - Uses openFDA API directly
  // ============================================================================

  async getToxicologyProfile(drugName: string): Promise<ToxicologyProfile> {
    console.log(`🧪 Fetching toxicology profile for ${drugName} via openFDA`)

    const emptyTox: ToxicologyProfile = {
      species: [],
      noael: { value: null, species: null, duration: null },
      target_organs: [],
      single_dose_toxicity: null,
      repeat_dose_toxicity: null,
      genotoxicity: null,
      carcinogenicity: null,
      reproductive_toxicity: null,
      developmental_toxicity: null,
      local_tolerance: null,
      safety_pharmacology: null,
      source: 'unknown'
    }

    try {
      // Use openFDA API directly
      const label = await openFDAClient.getFullDrugLabel(drugName)

      if (label?.nonclinicalToxicology) {
        const toxText = label.nonclinicalToxicology
        
        // Parse toxicology section - extract full paragraphs
        emptyTox.source = 'label'
        emptyTox.target_organs = this.extractTargetOrgans(toxText)
        
        // Extract carcinogenicity - full paragraph about carcinogenesis studies
        const carcinoMatch = toxText.match(/(?:carcinogen[^]*?)(?=(?:mutagen|genotox|fertility|impairment|$))/i)
        if (carcinoMatch) {
          emptyTox.carcinogenicity = carcinoMatch[0].trim().slice(0, 1500)
        }
        
        // Extract genotoxicity/mutagenicity
        const geneMatch = toxText.match(/(?:mutagen|genotox)[^]*?(?=(?:fertility|impairment|carcinogen|$))/i)
        if (geneMatch) {
          emptyTox.genotoxicity = geneMatch[0].trim().slice(0, 1000)
        }
        
        // Extract reproductive/fertility toxicity
        const reproMatch = toxText.match(/(?:fertility|impairment of fertility)[^]*/i)
        if (reproMatch) {
          emptyTox.reproductive_toxicity = reproMatch[0].trim().slice(0, 1500)
        }
        
        // Extract NOAEL with exposure multiples
        const noaelPatterns = [
          /(\d+)\s*(?:mg\/kg)[^.]*?(?:approximately\s+)?(\d+)\s*times[^.]*human[^.]*/gi,
          /NOAEL[:\s]+(\d+[\s]*(?:mg\/kg|mg\/m2)[^.]*)/i,
          /no adverse effect[^.]*?(\d+)\s*(?:mg\/kg)[^.]*/i
        ]
        for (const pattern of noaelPatterns) {
          const match = toxText.match(pattern)
          if (match) {
            emptyTox.noael.value = match[0].slice(0, 200)
            break
          }
        }

        // Extract species
        const speciesMatches = toxText.match(/(?:rat|mouse|mice|dog|monkey|rabbit)s?/gi)
        if (speciesMatches) {
          emptyTox.species = [...new Set(speciesMatches.map((s: string) => 
            s.toLowerCase().replace('mice', 'mouse')
          ))]
        }
        
        // Extract study durations
        const durationMatch = toxText.match(/(\d+)[\s-]*(?:year|week|month)/gi)
        if (durationMatch && durationMatch.length > 0) {
          emptyTox.noael.duration = durationMatch[0]
        }

        console.log(`✅ Toxicology extracted from openFDA label:`)
        console.log(`   - Species: ${emptyTox.species.join(', ')}`)
        console.log(`   - Target organs: ${emptyTox.target_organs.join(', ')}`)
        console.log(`   - Carcinogenicity: ${emptyTox.carcinogenicity ? 'Yes' : 'No'}`)
        console.log(`   - Genotoxicity: ${emptyTox.genotoxicity ? 'Yes' : 'No'}`)
        console.log(`   - Reproductive tox: ${emptyTox.reproductive_toxicity ? 'Yes' : 'No'}`)
        return emptyTox
      }

      // NO FALLBACKS - return empty with 'unknown' source
      console.log(`⚠️ No nonclinical toxicology data found for ${drugName}`)
      return emptyTox

    } catch (error) {
      console.error(`❌ Error fetching toxicology:`, error)
      return emptyTox
    }
  }

  // ============================================================================
  // 3.4 getBasicCMC - Uses PubChem API directly
  // ============================================================================

  async getBasicCMC(drugName: string, projectId?: string): Promise<CMCData> {
    console.log(`⚗️ Fetching CMC data for ${drugName} via PubChem`)

    const emptyCMC: CMCData = {
      molecular_formula: null,
      molecular_weight: null,
      chemical_name: null,
      iupac_name: null,
      cas_number: null,
      physical_state: null,
      appearance: null,
      pKa: null,
      logP: null,
      solubility: { water: null, organic: null },
      dosage_form: null,
      strength: null,
      excipients: [],
      manufacturing_notes: null,
      stability: null,
      storage: null,
      shelf_life: null,
      packaging: null,
      source: 'pubchem'
    }

    try {
      const supabase = await this.getSupabase()

      // Strategy 1: Get from project design_json
      if (projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('design_json, dosage_form, route, strength')
          .eq('id', projectId)
          .single()

        if (project) {
          emptyCMC.dosage_form = project.dosage_form || project.design_json?.dosage_form
          emptyCMC.strength = project.strength || project.design_json?.strength
          if (emptyCMC.dosage_form) {
            emptyCMC.source = 'project'
          }
        }
      }

      // Strategy 2: Get from PubChem API directly
      const pubchemData = await pubchemAdapter.fetchCompoundProperties(drugName)
      if (pubchemData) {
        emptyCMC.molecular_formula = pubchemData.molecularFormula || null
        emptyCMC.molecular_weight = pubchemData.molecularWeight || null
        emptyCMC.iupac_name = pubchemData.iupacName || null
        emptyCMC.chemical_name = drugName
        emptyCMC.cas_number = pubchemData.cas || null
        emptyCMC.logP = pubchemData.xlogp || null
        emptyCMC.source = 'pubchem'
        console.log(`✅ CMC from PubChem: MW=${emptyCMC.molecular_weight}, logP=${emptyCMC.logP}`)
      }

      // Strategy 3: Get formulation from openFDA label
      const label = await openFDAClient.getFullDrugLabel(drugName)
      if (label?.description) {
        // Extract physical description
        const appearanceMatch = label.description.match(/(?:white|off-white|yellow|crystalline|powder|solid)[^.]+/i)
        if (appearanceMatch) {
          emptyCMC.appearance = appearanceMatch[0]
          emptyCMC.physical_state = appearanceMatch[0]
        }
      }

      // NO FALLBACKS - if no data found, source stays as 'pubchem' but fields are null
      console.log(`✅ CMC data: ${emptyCMC.molecular_formula || 'N/A'} (${emptyCMC.source})`)
      return emptyCMC

    } catch (error) {
      console.error(`❌ Error fetching CMC:`, error)
      return emptyCMC
    }
  }

  // ============================================================================
  // 3.5 pkpd_enrich - Uses openFDA API directly
  // ============================================================================

  async getPKPDEnrich(drugName: string): Promise<PKPDData> {
    console.log(`💊 Fetching PK/PD data for ${drugName} via openFDA`)

    const emptyPKPD: PKPDData = {
      tmax: null,
      cmax: null,
      t_half: null,
      auc: null,
      bioavailability: null,
      absorption: null,
      distribution: { vd: null, protein_binding: null, tissue_distribution: null },
      metabolism: { primary_pathway: null, enzymes: [], metabolites: [] },
      elimination: { route: null, clearance: null },
      steady_state: null,
      food_effect: null,
      special_populations: {
        renal_impairment: null,
        hepatic_impairment: null,
        elderly: null,
        pediatric: null
      },
      source: 'label'
    }

    try {
      // Use openFDA API directly
      const label = await openFDAClient.getFullDrugLabel(drugName)

      if (!label) {
        console.log(`⚠️ No FDA label found for ${drugName}`)
        emptyPKPD.source = 'label'
        return emptyPKPD
      }

      // Use pre-extracted PK data from openFDA client
      if (label.pkData) {
        emptyPKPD.tmax = label.pkData.tmax || null
        emptyPKPD.t_half = label.pkData.tHalf || null
        emptyPKPD.bioavailability = label.pkData.bioavailability || null
        emptyPKPD.food_effect = label.pkData.foodEffect || null
        emptyPKPD.distribution.protein_binding = label.pkData.proteinBinding || null
        emptyPKPD.distribution.vd = label.pkData.volumeOfDistribution || null
        emptyPKPD.metabolism.primary_pathway = label.pkData.metabolism || null
        emptyPKPD.elimination.route = label.pkData.elimination || null
        emptyPKPD.elimination.clearance = label.pkData.clearance || null
        emptyPKPD.special_populations.renal_impairment = label.pkData.renalImpairment || null
        emptyPKPD.special_populations.hepatic_impairment = label.pkData.hepaticImpairment || null
      }

      // Extract CYP enzymes from pharmacokinetics text
      if (label.pharmacokinetics) {
        const cypMatches = label.pharmacokinetics.match(/CYP\d[A-Z]\d+/gi)
        if (cypMatches) {
          emptyPKPD.metabolism.enzymes = [...new Set(cypMatches)] as string[]
        }
      }

      console.log(`✅ PK/PD extracted via openFDA: Tmax=${emptyPKPD.tmax}, t½=${emptyPKPD.t_half}`)
      return emptyPKPD

    } catch (error) {
      console.error(`❌ Error fetching PK/PD:`, error)
      return emptyPKPD
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async detectDrugClass(drugName: string): Promise<string> {
    // Try to detect drug class from known mappings
    const ssris = ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine']
    const snris = ['venlafaxine', 'duloxetine', 'desvenlafaxine', 'levomilnacipran']
    const ppis = ['omeprazole', 'esomeprazole', 'lansoprazole', 'pantoprazole', 'rabeprazole']
    const statins = ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin']
    const nsaids = ['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam']
    const dpp4i = ['sitagliptin', 'saxagliptin', 'linagliptin', 'alogliptin', 'vildagliptin']

    const lowerName = drugName.toLowerCase()

    if (ssris.some(s => lowerName.includes(s))) return 'SSRI'
    if (snris.some(s => lowerName.includes(s))) return 'SNRI'
    if (ppis.some(s => lowerName.includes(s))) return 'PPI'
    if (statins.some(s => lowerName.includes(s))) return 'STATIN'
    if (nsaids.some(s => lowerName.includes(s))) return 'NSAID'
    if (dpp4i.some(s => lowerName.includes(s))) return 'DPP4I'

    // Try to get from openFDA label description
    try {
      const label = await openFDAClient.getFullDrugLabel(drugName)
      if (label?.description) {
        const desc = label.description.toLowerCase()
        if (desc.includes('selective serotonin reuptake inhibitor') || desc.includes('ssri')) return 'SSRI'
        if (desc.includes('serotonin-norepinephrine reuptake inhibitor') || desc.includes('snri')) return 'SNRI'
        if (desc.includes('proton pump inhibitor') || desc.includes('ppi')) return 'PPI'
        if (desc.includes('hmg-coa reductase inhibitor') || desc.includes('statin')) return 'STATIN'
        if (desc.includes('nonsteroidal anti-inflammatory') || desc.includes('nsaid')) return 'NSAID'
        if (desc.includes('dipeptidyl peptidase') || desc.includes('dpp-4')) return 'DPP4I'
        if (desc.includes('antibiotic') || desc.includes('antimicrobial')) return 'ANTIBIOTIC'
      }
    } catch (e) {
      // Ignore errors
    }

    return 'DEFAULT'
  }

  private extractMechanism(text: string): string | null {
    if (!text) return null
    
    // Look for mechanism of action section
    const moaPatterns = [
      /mechanism of action[:\s]+([^.]+\.)/i,
      /acts by[:\s]+([^.]+\.)/i,
      /works by[:\s]+([^.]+\.)/i,
      /inhibits[:\s]+([^.]+\.)/i
    ]

    for (const pattern of moaPatterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }

    // Return first relevant sentence
    const sentences = text.split('.')
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('mechanism') ||
          sentence.toLowerCase().includes('inhibit') ||
          sentence.toLowerCase().includes('block') ||
          sentence.toLowerCase().includes('receptor')) {
        return sentence.trim() + '.'
      }
    }

    return null
  }

  private extractIndications(text: string): string[] {
    if (!text) return []
    
    const indications: string[] = []
    
    // Split by common delimiters
    const parts = text.split(/(?:\d+\.\s+|\n|;|•)/)
    
    for (const part of parts) {
      const cleaned = part.trim()
      if (cleaned.length > 10 && cleaned.length < 500) {
        // Check if it looks like an indication
        if (cleaned.toLowerCase().includes('treatment') ||
            cleaned.toLowerCase().includes('indicated') ||
            cleaned.toLowerCase().includes('management') ||
            cleaned.toLowerCase().includes('prevention')) {
          indications.push(cleaned)
        }
      }
    }

    return indications.slice(0, 10) // Limit to 10 indications
  }

  private extractDosing(text: string): LabelData['dose'] {
    const dose = { recommended: null as string | null, range: null as string | null, adjustments: null as string | null }
    
    if (!text) return dose

    // Extract recommended dose
    const recommendedMatch = text.match(/(?:recommended|usual|starting)\s+(?:dose|dosage)[:\s]+([^.]+\.)/i)
    if (recommendedMatch) dose.recommended = recommendedMatch[1].trim()

    // Extract dose range
    const rangeMatch = text.match(/(\d+\s*(?:mg|mcg|g)\s*(?:to|-)\s*\d+\s*(?:mg|mcg|g))/i)
    if (rangeMatch) dose.range = rangeMatch[1]

    // Extract dose adjustments
    const adjustMatch = text.match(/(?:dose adjustment|dosage adjustment)[:\s]+([^.]+\.)/i)
    if (adjustMatch) dose.adjustments = adjustMatch[1].trim()

    return dose
  }

  private extractPK(text: string): LabelData['pk'] {
    const pk = {
      absorption: null as string | null,
      distribution: null as string | null,
      metabolism: null as string | null,
      excretion: null as string | null,
      half_life: null as string | null,
      bioavailability: null as string | null
    }

    if (!text) return pk

    pk.absorption = this.extractSection(text, 'absorption', 'absorbed')
    pk.distribution = this.extractSection(text, 'distribution', 'distributed', 'protein binding')
    pk.metabolism = this.extractSection(text, 'metabolism', 'metabolized', 'biotransformation')
    pk.excretion = this.extractSection(text, 'excretion', 'excreted', 'elimination')

    // Extract half-life
    const halfLifeMatch = text.match(/(?:half-life|t½|t1\/2)[:\s]+(?:approximately\s+)?(\d+\.?\d*\s*(?:hours?|h|days?))/i)
    if (halfLifeMatch) pk.half_life = halfLifeMatch[1]

    // Extract bioavailability
    const bioMatch = text.match(/(?:bioavailability)[:\s]+(?:approximately\s+)?(\d+\.?\d*\s*%?)/i)
    if (bioMatch) pk.bioavailability = bioMatch[1]

    return pk
  }

  private extractWarnings(text: string): string[] {
    if (!text) return []
    
    const warnings: string[] = []
    
    // Split by numbered sections or bullets
    const parts = text.split(/(?:\d+\.\d*\s+|\n\n|•)/)
    
    for (const part of parts) {
      const cleaned = part.trim()
      if (cleaned.length > 20 && cleaned.length < 1000) {
        // Get first sentence as warning summary
        const firstSentence = cleaned.split('.')[0]
        if (firstSentence && firstSentence.length > 10) {
          warnings.push(firstSentence.trim())
        }
      }
    }

    return warnings.slice(0, 15) // Limit to 15 warnings
  }

  private extractList(text: string): string[] {
    if (!text) return []
    
    const items: string[] = []
    const parts = text.split(/(?:\n|;|•|\d+\.\s+)/)
    
    for (const part of parts) {
      const cleaned = part.trim()
      if (cleaned.length > 5 && cleaned.length < 500) {
        items.push(cleaned)
      }
    }

    return items.slice(0, 20)
  }

  private extractAdverseEvents(text: string): LabelData['adverse_events'] {
    const ae = { common: [] as string[], serious: [] as string[], frequencies: {} as Record<string, number> }
    
    if (!text) return ae

    // Extract common AEs (mentioned with percentages)
    const percentMatches = text.matchAll(/([A-Za-z\s]+)\s*\(?\s*(\d+\.?\d*)\s*%\)?/g)
    for (const match of percentMatches) {
      const term = match[1].trim()
      const freq = parseFloat(match[2])
      if (term.length > 2 && term.length < 50 && freq > 0) {
        ae.frequencies[term] = freq
        if (freq >= 5) {
          ae.common.push(term)
        }
      }
    }

    // Extract serious AEs
    const seriousSection = this.extractSection(text, 'serious', 'severe', 'life-threatening')
    if (seriousSection) {
      const seriousTerms = seriousSection.match(/[A-Za-z\s]+(?=,|\.|;)/g)
      if (seriousTerms) {
        ae.serious = seriousTerms.map(t => t.trim()).filter(t => t.length > 2)
      }
    }

    return ae
  }

  private extractStorage(text: string): string | null {
    if (!text) return null
    
    const storageMatch = text.match(/(?:store|storage)[:\s]+([^.]+\.)/i)
    if (storageMatch) return storageMatch[1].trim()

    const tempMatch = text.match(/(\d+°?[CF]\s*(?:to|-)\s*\d+°?[CF])/i)
    if (tempMatch) return `Store at ${tempMatch[1]}`

    return null
  }

  private extractTargetOrgans(text: string): string[] {
    if (!text) return []
    
    const organs = new Set<string>()
    const organPatterns = [
      /liver/i, /hepat/i, /kidney/i, /renal/i, /heart/i, /cardiac/i,
      /lung/i, /pulmonary/i, /brain/i, /cns/i, /nervous system/i,
      /bone/i, /muscle/i, /gastrointestinal/i, /stomach/i, /intestin/i,
      /thyroid/i, /adrenal/i, /pancreas/i, /spleen/i, /lymph/i
    ]

    for (const pattern of organPatterns) {
      if (pattern.test(text)) {
        // Map to standard organ names
        const match = text.match(pattern)
        if (match) {
          const term = match[0].toLowerCase()
          if (term.includes('liver') || term.includes('hepat')) organs.add('Liver')
          else if (term.includes('kidney') || term.includes('renal')) organs.add('Kidney')
          else if (term.includes('heart') || term.includes('cardiac')) organs.add('Heart')
          else if (term.includes('lung') || term.includes('pulmonary')) organs.add('Lung')
          else if (term.includes('brain') || term.includes('cns') || term.includes('nervous')) organs.add('Central Nervous System')
          else if (term.includes('bone')) organs.add('Bone')
          else if (term.includes('muscle')) organs.add('Skeletal Muscle')
          else if (term.includes('gastrointestinal') || term.includes('stomach') || term.includes('intestin')) organs.add('Gastrointestinal Tract')
          else if (term.includes('thyroid')) organs.add('Thyroid')
        }
      }
    }

    return Array.from(organs)
  }

  private extractSection(text: string, ...keywords: string[]): string | null {
    if (!text) return null

    const lowerText = text.toLowerCase()
    
    for (const keyword of keywords) {
      const idx = lowerText.indexOf(keyword.toLowerCase())
      if (idx !== -1) {
        // Extract surrounding context (up to 500 chars after keyword)
        const start = Math.max(0, idx - 50)
        const end = Math.min(text.length, idx + 500)
        let section = text.substring(start, end)
        
        // Find sentence boundaries
        const sentenceStart = section.lastIndexOf('.', 50) + 1
        const sentenceEnd = section.indexOf('.', 100)
        
        if (sentenceEnd > sentenceStart) {
          section = section.substring(sentenceStart, sentenceEnd + 1).trim()
        }
        
        if (section.length > 20) {
          return section
        }
      }
    }

    return null
  }

  private getPhaseNumber(phase: string): number {
    if (!phase) return 0
    const lower = phase.toLowerCase()
    if (lower.includes('4')) return 4
    if (lower.includes('3')) return 3
    if (lower.includes('2')) return 2
    if (lower.includes('1')) return 1
    return 0
  }
}

export default IBEnrichmentService
