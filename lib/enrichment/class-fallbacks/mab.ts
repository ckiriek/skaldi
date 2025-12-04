/**
 * Monoclonal Antibody (mAb) Class Fallback
 * 
 * General fallback for monoclonal antibodies.
 * More specific classes (anti-TNF, PD-1, etc.) inherit and extend this.
 * 
 * Examples: adalimumab, pembrolizumab, trastuzumab, rituximab
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { ClassFallbackData } from './types'

export const MAB_FALLBACK: ClassFallbackData = {
  therapeutic_class: 'mAb',
  display_name: 'Monoclonal Antibody (mAb)',
  description: 'Monoclonal antibodies are laboratory-produced molecules engineered to serve as substitute antibodies that can restore, enhance, or mimic the immune system\'s attack on cells. They bind specifically to target antigens.',
  
  example_compounds: ['adalimumab', 'pembrolizumab', 'trastuzumab', 'rituximab', 'bevacizumab', 'nivolumab'],
  
  cmc: {
    source: 'class_based',
    biologic_properties: {
      protein_structure: 'Humanized or fully human IgG monoclonal antibody',
      molecular_weight_kda: 150, // Typical for IgG
      glycosylation: 'N-linked glycosylation at Fc region (Asn297)',
      expression_system: 'Chinese Hamster Ovary (CHO) cells',
      post_translational_modifications: [
        'N-linked glycosylation',
        'Disulfide bond formation',
        'C-terminal lysine clipping'
      ],
      isoelectric_point: 'pI 6.0-9.0 (varies by specific mAb)',
      aggregation: 'Aggregation propensity assessed; formulation optimized to minimize',
      deamidation: 'Deamidation sites identified and monitored',
      oxidation: 'Methionine oxidation monitored as critical quality attribute'
    },
    formulation: {
      dosage_form: 'Solution for injection or infusion',
      strength: 'Varies by product (typically 10-150 mg/mL)',
      route: 'Subcutaneous or intravenous',
      qualitative_composition: [
        'Active substance (mAb)',
        'Buffer (histidine, phosphate, or citrate)',
        'Stabilizer (sucrose, trehalose, or mannitol)',
        'Surfactant (polysorbate 80 or polysorbate 20)',
        'pH adjuster'
      ]
    },
    storage_stability: {
      storage_conditions: 'Store at 2-8°C (36-46°F). Do not freeze. Protect from light.',
      shelf_life: '18-36 months when stored properly',
      in_use_stability: 'Use within specified time after removal from refrigeration',
      special_handling: 'Allow to reach room temperature before administration. Do not shake.'
    }
  },
  
  nonclinical: {
    source: 'class_based',
    target_organs: ['Immune System', 'Injection/Infusion Site', 'Target-expressing tissues'],
    
    primary_pharmacodynamics: 'Monoclonal antibodies bind with high specificity and affinity to their target antigen. Depending on the target, this binding can neutralize soluble factors, block receptor-ligand interactions, induce antibody-dependent cellular cytotoxicity (ADCC), complement-dependent cytotoxicity (CDC), or directly induce apoptosis.',
    
    secondary_pharmacodynamics: 'Off-target binding is generally minimal due to high specificity. Cross-reactivity studies are conducted to assess potential binding to unintended targets in human and animal tissues.',
    
    safety_pharmacology: 'Safety pharmacology studies for mAbs focus on immunotoxicity and cross-reactivity assessments rather than traditional CNS, cardiovascular, and respiratory studies, as mAbs typically do not cross the blood-brain barrier and have limited off-target effects.',
    
    genotoxicity: 'Monoclonal antibodies are not expected to interact with DNA and standard genotoxicity studies are not required per ICH S6(R1). The risk of genotoxicity is considered negligible.',
    
    carcinogenicity: 'Long-term carcinogenicity studies are generally not conducted for mAbs due to immunogenicity concerns in rodents and the expected mechanism of action. Carcinogenic potential is assessed based on target biology and mechanism.',
    
    reproductive_toxicity: 'Enhanced pre- and post-natal development (ePPND) studies are typically conducted in relevant species (often non-human primates). IgG antibodies cross the placenta, particularly in the third trimester. Effects on fertility and embryo-fetal development are assessed.',
    
    developmental_toxicity: 'Monoclonal antibodies cross the placenta via FcRn-mediated transport, with increasing transfer during gestation. Developmental effects are typically related to the pharmacological activity of the mAb.',
    
    repeat_dose_toxicity: 'Repeat-dose toxicity studies are conducted in pharmacologically relevant species. Target-related findings are expected. Immunogenicity (anti-drug antibodies) may limit study duration and interpretation.',
    
    immunotoxicity: 'Immunotoxicity assessment is critical for mAbs. Studies evaluate effects on immune cell populations, cytokine release, and immune function. Immunogenicity (development of anti-drug antibodies) is monitored.',
    
    tissue_cross_reactivity: 'Tissue cross-reactivity studies using human tissues are conducted to identify potential off-target binding sites and inform safety assessment.'
  },
  
  pk: {
    source: 'class_based',
    
    t_half: '14-21 days (typical for IgG antibodies)',
    tmax: '2-7 days for SC administration; end of infusion for IV',
    bioavailability: '50-80% for subcutaneous administration; 100% for IV',
    
    absorption: 'Subcutaneous absorption via lymphatic system. Bioavailability typically 50-80%. IV administration provides immediate systemic exposure.',
    
    distribution: {
      vd: 'Limited to plasma and extracellular fluid (~3-8 L for central compartment)',
      protein_binding: 'Not applicable in traditional sense; mAbs bind specifically to target',
      tissue_distribution: 'Limited tissue penetration due to large molecular size. Distribution primarily in vascular and interstitial spaces.'
    },
    
    metabolism: {
      primary_pathway: 'Catabolized to peptides and amino acids via proteolytic degradation',
      enzymes: [], // No CYP involvement
      metabolites: ['Peptides', 'Amino acids'],
      metabolite_activity: 'Degradation products are not pharmacologically active'
    },
    
    elimination: {
      route: 'No renal or hepatic elimination in traditional sense. Cleared via reticuloendothelial system (RES) and target-mediated drug disposition (TMDD).',
      clearance: 'Typical clearance 0.2-0.5 L/day. May be affected by TMDD, immunogenicity, and disease state.'
    },
    
    steady_state: 'Achieved after 4-5 half-lives (typically 2-3 months with standard dosing intervals)',
    accumulation: 'Accumulation expected with repeated dosing; extent depends on dosing interval relative to half-life',
    dose_proportionality: 'May exhibit non-linear PK due to target-mediated drug disposition at lower doses',
    
    tmdd: 'Target-mediated drug disposition (TMDD) may apply, resulting in non-linear PK at lower concentrations where target binding significantly affects clearance.',
    
    special_populations: {
      renal_impairment: 'No significant effect expected; mAbs are not renally eliminated',
      hepatic_impairment: 'No significant effect expected; mAbs are not hepatically metabolized',
      elderly: 'No clinically significant differences; may have slightly reduced clearance',
      body_weight: 'Clearance and volume of distribution increase with body weight; weight-based dosing often used'
    }
  },
  
  pd: {
    source: 'class_based',
    mechanism: 'Target-specific binding and neutralization, receptor blockade, or cell killing via ADCC, CDC, or direct apoptosis induction.',
    target_biomarker: 'Target antigen levels, receptor occupancy, downstream pathway markers',
    exposure_response: 'Exposure-response relationships established for efficacy and safety endpoints. Trough concentrations often correlate with efficacy.',
    receptor_occupancy: 'Typically >90% receptor occupancy required for optimal efficacy',
    onset_of_action: 'Varies by indication; may take weeks to months for full clinical effect',
    duration_of_effect: 'Prolonged duration due to long half-life; effects may persist after discontinuation'
  },
  
  safety: {
    source: 'class_based',
    
    common_ae: [
      { term: 'Injection site reaction', frequency: 0.15, soc: 'General disorders' },
      { term: 'Infusion-related reaction', frequency: 0.10, soc: 'Immune system disorders' },
      { term: 'Upper respiratory tract infection', frequency: 0.10, soc: 'Infections' },
      { term: 'Headache', frequency: 0.08, soc: 'Nervous system disorders' },
      { term: 'Fatigue', frequency: 0.08, soc: 'General disorders' },
      { term: 'Nausea', frequency: 0.06, soc: 'Gastrointestinal disorders' },
      { term: 'Arthralgia', frequency: 0.05, soc: 'Musculoskeletal disorders' },
      { term: 'Rash', frequency: 0.05, soc: 'Skin disorders' }
    ],
    
    serious_ae: [
      { term: 'Serious infection', serious: true, soc: 'Infections' },
      { term: 'Anaphylaxis', serious: true, soc: 'Immune system disorders' },
      { term: 'Severe infusion reaction', serious: true, soc: 'Immune system disorders' },
      { term: 'Immunogenicity-related events', serious: true, soc: 'Immune system disorders' }
    ],
    
    aes_of_special_interest: [
      { term: 'Infections', description: 'Increased risk due to immunomodulation' },
      { term: 'Infusion/injection reactions', description: 'Monitor during and after administration' },
      { term: 'Immunogenicity', description: 'Anti-drug antibodies may affect efficacy and safety' },
      { term: 'Malignancy', description: 'Long-term immunosuppression risk (class-dependent)' }
    ],
    
    warnings: [
      'Risk of serious infections including opportunistic infections',
      'Infusion-related reactions, including anaphylaxis',
      'Immunogenicity may develop, affecting efficacy and safety',
      'Potential increased risk of malignancy with long-term immunosuppression',
      'Reactivation of latent infections (e.g., tuberculosis, hepatitis B)'
    ],
    
    precautions: [
      'Screen for latent tuberculosis before initiating therapy',
      'Screen for hepatitis B before initiating therapy',
      'Monitor for signs and symptoms of infection during treatment',
      'Administer in settings equipped to manage infusion reactions',
      'Update vaccinations before starting therapy; avoid live vaccines during treatment'
    ],
    
    contraindications: [
      'Known hypersensitivity to the mAb or any excipient',
      'Active serious infection',
      'Specific contraindications vary by target and indication'
    ],
    
    drug_interactions: [
      {
        drug: 'Live vaccines',
        mechanism: 'Immunosuppression may increase risk of infection from live vaccines',
        severity: 'major',
        recommendation: 'Avoid live vaccines during treatment. Complete vaccinations before starting therapy.'
      },
      {
        drug: 'Other immunosuppressants',
        mechanism: 'Additive immunosuppression',
        severity: 'moderate',
        recommendation: 'Monitor for increased infection risk when used in combination.'
      }
    ],
    
    special_populations: {
      pregnancy: 'IgG antibodies cross the placenta, particularly in the third trimester. Use during pregnancy only if clearly needed and benefit outweighs risk. Consider timing of last dose relative to delivery.',
      lactation: 'IgG antibodies are present in breast milk. Consider benefits of breastfeeding and treatment vs. potential infant exposure.',
      pediatric: 'Safety and efficacy in pediatric patients depend on specific indication. Dosing often weight-based.',
      geriatric: 'No overall differences in safety; higher incidence of infections may be observed.',
      renal_impairment: 'No dose adjustment required.',
      hepatic_impairment: 'No dose adjustment required.'
    },
    
    immunogenicity: 'Anti-drug antibodies (ADA) may develop during treatment. ADA can affect drug clearance, efficacy, and may be associated with infusion reactions. Immunogenicity is assessed in clinical trials and post-marketing.',
    
    infusion_reactions: 'Infusion-related reactions can occur, ranging from mild (flushing, pruritus) to severe (anaphylaxis). Pre-medication and slow infusion rates may reduce risk. Monitor patients during and after infusion.'
  }
}
