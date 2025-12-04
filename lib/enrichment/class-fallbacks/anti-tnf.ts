/**
 * Anti-TNF (TNF-alpha Inhibitor) Class Fallback
 * 
 * Extends mAb fallback with TNF-specific data.
 * Examples: adalimumab, infliximab, etanercept, golimumab, certolizumab pegol
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { ClassFallbackData } from './types'

export const ANTI_TNF_FALLBACK: ClassFallbackData = {
  therapeutic_class: 'ANTI_TNF',
  display_name: 'TNF-alpha Inhibitor (Anti-TNF)',
  description: 'Anti-TNF agents are biologic therapies that inhibit tumor necrosis factor alpha (TNF-α), a pro-inflammatory cytokine involved in systemic inflammation. They are used to treat autoimmune and inflammatory conditions.',
  
  example_compounds: ['adalimumab', 'infliximab', 'etanercept', 'golimumab', 'certolizumab pegol'],
  
  cmc: {
    source: 'class_based',
    biologic_properties: {
      protein_structure: 'Humanized or fully human IgG1 monoclonal antibody targeting TNF-alpha (or fusion protein for etanercept)',
      molecular_weight_kda: 148, // Typical for IgG1 mAb
      glycosylation: 'N-linked glycosylation at Fc region',
      expression_system: 'Chinese Hamster Ovary (CHO) cells or NS0 cells',
      post_translational_modifications: [
        'N-linked glycosylation',
        'Disulfide bond formation',
        'C-terminal lysine processing'
      ]
    },
    formulation: {
      dosage_form: 'Solution for injection (SC) or concentrate for infusion (IV)',
      strength: '20-100 mg/mL (varies by product)',
      route: 'Subcutaneous or intravenous',
      qualitative_composition: [
        'Active substance (anti-TNF mAb)',
        'Buffer system',
        'Stabilizer (sucrose, mannitol)',
        'Surfactant (polysorbate 80)',
        'pH adjuster'
      ]
    },
    storage_stability: {
      storage_conditions: 'Store at 2-8°C (36-46°F). Do not freeze. Protect from light.',
      shelf_life: '18-24 months',
      in_use_stability: 'Use within specified time after removal from refrigeration',
      special_handling: 'Allow to reach room temperature before injection. Do not shake.'
    }
  },
  
  nonclinical: {
    source: 'class_based',
    target_organs: ['Immune System', 'Injection Site', 'Lymphoid tissues'],
    
    primary_pharmacodynamics: 'Anti-TNF agents bind to and neutralize soluble and transmembrane TNF-alpha, preventing its interaction with TNF receptors (TNFR1 and TNFR2). This inhibits TNF-mediated inflammatory responses, including cytokine production, leukocyte migration, and activation of neutrophils and eosinophils.',
    
    secondary_pharmacodynamics: 'Some anti-TNF agents can induce reverse signaling through transmembrane TNF, leading to apoptosis of TNF-expressing cells. Complement-dependent cytotoxicity (CDC) and antibody-dependent cellular cytotoxicity (ADCC) may also contribute to mechanism.',
    
    safety_pharmacology: 'Safety pharmacology focuses on immunotoxicity assessment. No direct effects on cardiovascular, respiratory, or CNS function expected at therapeutic doses.',
    
    genotoxicity: 'As monoclonal antibodies, anti-TNF agents are not expected to interact with DNA. Standard genotoxicity studies are not required.',
    
    carcinogenicity: 'Long-term carcinogenicity studies are generally not conducted. Theoretical concern for malignancy risk due to TNF\'s role in tumor surveillance. Clinical data are monitored for malignancy signals.',
    
    reproductive_toxicity: 'Anti-TNF agents cross the placenta, particularly in the third trimester. Studies in cynomolgus monkeys have not shown teratogenicity. Effects on fertility have not been observed.',
    
    developmental_toxicity: 'IgG1 antibodies cross the placenta via FcRn-mediated transport. Infants exposed in utero may have detectable drug levels for several months after birth. Live vaccines should be avoided in exposed infants.',
    
    repeat_dose_toxicity: 'Repeat-dose studies in relevant species (cynomolgus monkeys) show expected pharmacological effects (immunosuppression). Anti-drug antibodies may develop, affecting interpretation.',
    
    immunotoxicity: 'TNF inhibition leads to immunosuppression with increased susceptibility to infections. Reactivation of latent infections (TB, hepatitis B) is a known risk.'
  },
  
  pk: {
    source: 'class_based',
    
    t_half: '10-20 days (varies by specific agent)',
    tmax: '3-7 days for SC administration',
    bioavailability: '50-80% for subcutaneous administration',
    
    absorption: 'Subcutaneous absorption via lymphatic system. Bioavailability typically 50-80%. Peak concentrations reached in 3-7 days.',
    
    distribution: {
      vd: 'Limited to plasma and extracellular fluid (4-8 L)',
      protein_binding: 'Binds specifically to TNF-alpha',
      tissue_distribution: 'Limited tissue penetration; concentrated at sites of inflammation'
    },
    
    metabolism: {
      primary_pathway: 'Proteolytic degradation to peptides and amino acids',
      enzymes: [],
      metabolites: ['Peptides', 'Amino acids']
    },
    
    elimination: {
      route: 'Reticuloendothelial system; target-mediated clearance',
      clearance: '10-20 mL/day; may be affected by body weight, immunogenicity, and disease activity'
    },
    
    steady_state: 'Achieved after 4-5 half-lives (typically 8-12 weeks)',
    accumulation: '2-3 fold accumulation with standard dosing intervals',
    
    special_populations: {
      renal_impairment: 'No significant effect; not renally eliminated',
      hepatic_impairment: 'No significant effect; not hepatically metabolized',
      elderly: 'No clinically significant differences',
      body_weight: 'Clearance increases with body weight; some agents use weight-based dosing'
    }
  },
  
  pd: {
    source: 'class_based',
    mechanism: 'Neutralization of TNF-alpha, preventing binding to TNF receptors and subsequent pro-inflammatory signaling cascades.',
    target_biomarker: 'Serum TNF-alpha levels, CRP, ESR, inflammatory cytokines',
    exposure_response: 'Trough concentrations correlate with clinical response. Higher drug levels associated with better outcomes in inflammatory conditions.',
    onset_of_action: 'Clinical improvement typically seen within 2-4 weeks; full effect may take 12-24 weeks',
    duration_of_effect: 'Sustained with continued treatment; disease may flare upon discontinuation'
  },
  
  safety: {
    source: 'class_based',
    
    boxed_warning: 'Serious infections including tuberculosis, invasive fungal infections, and other opportunistic infections. Lymphoma and other malignancies, some fatal, have been reported in children and adolescent patients.',
    
    common_ae: [
      { term: 'Upper respiratory tract infection', frequency: 0.18, soc: 'Infections' },
      { term: 'Injection site reaction', frequency: 0.15, soc: 'General disorders' },
      { term: 'Headache', frequency: 0.12, soc: 'Nervous system disorders' },
      { term: 'Rash', frequency: 0.08, soc: 'Skin disorders' },
      { term: 'Nausea', frequency: 0.07, soc: 'Gastrointestinal disorders' },
      { term: 'Sinusitis', frequency: 0.07, soc: 'Infections' },
      { term: 'Abdominal pain', frequency: 0.06, soc: 'Gastrointestinal disorders' },
      { term: 'Urinary tract infection', frequency: 0.05, soc: 'Infections' }
    ],
    
    serious_ae: [
      { term: 'Serious infection', serious: true, soc: 'Infections' },
      { term: 'Tuberculosis (including reactivation)', serious: true, soc: 'Infections' },
      { term: 'Invasive fungal infection', serious: true, soc: 'Infections' },
      { term: 'Hepatitis B reactivation', serious: true, soc: 'Infections' },
      { term: 'Lymphoma', serious: true, soc: 'Neoplasms' },
      { term: 'Demyelinating disease', serious: true, soc: 'Nervous system disorders' },
      { term: 'Heart failure exacerbation', serious: true, soc: 'Cardiac disorders' },
      { term: 'Lupus-like syndrome', serious: true, soc: 'Immune system disorders' },
      { term: 'Serious allergic reaction', serious: true, soc: 'Immune system disorders' }
    ],
    
    aes_of_special_interest: [
      { term: 'Serious infections', description: 'Including TB, fungal, bacterial, viral' },
      { term: 'Malignancy', description: 'Lymphoma and other cancers' },
      { term: 'Heart failure', description: 'Contraindicated in moderate-severe CHF' },
      { term: 'Demyelinating disorders', description: 'MS, optic neuritis' },
      { term: 'Hepatotoxicity', description: 'Including autoimmune hepatitis' }
    ],
    
    warnings: [
      'Serious infections including tuberculosis, invasive fungal infections, bacterial sepsis, and viral infections',
      'Malignancies including lymphoma, especially in children and adolescents',
      'Hepatitis B virus reactivation',
      'Heart failure - new onset or worsening',
      'Demyelinating disease - new onset or exacerbation',
      'Cytopenias including pancytopenia',
      'Lupus-like syndrome',
      'Hypersensitivity reactions including anaphylaxis'
    ],
    
    precautions: [
      'Screen for latent TB before initiating therapy; treat latent TB before starting anti-TNF',
      'Screen for hepatitis B before initiating therapy',
      'Do not initiate in patients with active infection',
      'Monitor for signs and symptoms of infection during and after treatment',
      'Avoid in patients with moderate-severe heart failure (NYHA Class III/IV)',
      'Discontinue if lupus-like syndrome or demyelinating disease develops',
      'Update vaccinations before starting therapy; avoid live vaccines during treatment'
    ],
    
    contraindications: [
      'Active infection, including clinically important localized infections',
      'Moderate to severe heart failure (NYHA Class III/IV) - for some agents',
      'Known hypersensitivity to the product or its components'
    ],
    
    drug_interactions: [
      {
        drug: 'Live vaccines',
        mechanism: 'Immunosuppression increases infection risk',
        severity: 'major',
        recommendation: 'Avoid live vaccines during treatment. Complete vaccinations before starting.'
      },
      {
        drug: 'Anakinra (IL-1 inhibitor)',
        mechanism: 'Increased risk of serious infections',
        severity: 'major',
        recommendation: 'Combination not recommended.'
      },
      {
        drug: 'Abatacept',
        mechanism: 'Increased risk of serious infections',
        severity: 'major',
        recommendation: 'Combination not recommended.'
      },
      {
        drug: 'Other biologics',
        mechanism: 'Additive immunosuppression',
        severity: 'moderate',
        recommendation: 'Avoid combination with other biologics.'
      }
    ],
    
    special_populations: {
      pregnancy: 'Anti-TNF agents cross the placenta, especially in third trimester. Use during pregnancy only if clearly needed. Consider timing of last dose relative to delivery. Exposed infants should not receive live vaccines for 6 months.',
      lactation: 'Present in breast milk at low levels. Consider benefits of breastfeeding vs. potential infant exposure.',
      pediatric: 'Approved for some indications in children. Increased risk of malignancy (including hepatosplenic T-cell lymphoma) reported in children and adolescents.',
      geriatric: 'Higher incidence of infections in elderly patients. Use with caution.',
      renal_impairment: 'No dose adjustment required.',
      hepatic_impairment: 'No dose adjustment required. Monitor liver function.'
    },
    
    immunogenicity: 'Anti-drug antibodies (ADA) may develop, potentially reducing efficacy and increasing risk of infusion/injection reactions. Concomitant immunosuppressants (e.g., methotrexate) may reduce immunogenicity.',
    
    infusion_reactions: 'Infusion reactions can occur with IV formulations. Pre-medication may reduce risk. Monitor during and after infusion.'
  }
}
