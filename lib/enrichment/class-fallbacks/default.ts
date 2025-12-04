/**
 * Default Class Fallback
 * 
 * Used when therapeutic class is unknown or not specifically defined.
 * Provides minimal, generic fallback data.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { ClassFallbackData } from './types'

export const DEFAULT_FALLBACK: ClassFallbackData = {
  therapeutic_class: 'OTHER',
  display_name: 'Unknown/Other Therapeutic Class',
  description: 'Fallback data for compounds with unknown or unspecified therapeutic class. This provides minimal generic information that should be supplemented with compound-specific data.',
  
  example_compounds: [],
  
  cmc: {
    source: 'class_based',
    physical_properties: {
      state: 'Solid (powder or crystalline)',
      color: 'White to off-white'
    },
    formulation: {
      dosage_form: 'Tablet or capsule',
      route: 'Oral'
    },
    storage_stability: {
      storage_conditions: 'Store at controlled room temperature (20-25°C). Protect from moisture and light.',
      shelf_life: '24-36 months'
    }
  },
  
  nonclinical: {
    source: 'class_based',
    target_organs: [],
    
    primary_pharmacodynamics: 'Pharmacodynamic effects are specific to the compound and its mechanism of action. Refer to compound-specific data.',
    
    secondary_pharmacodynamics: 'Secondary pharmacodynamic effects depend on the specific compound and its selectivity profile.',
    
    safety_pharmacology: 'Standard safety pharmacology studies (CNS, cardiovascular, respiratory) should be conducted per ICH S7A/S7B guidelines.',
    
    genotoxicity: 'Standard genotoxicity battery (Ames test, in vitro chromosomal aberration, in vivo micronucleus) should be conducted per ICH S2(R1).',
    
    carcinogenicity: 'Carcinogenicity assessment depends on intended treatment duration and patient population per ICH S1A/S1B.',
    
    reproductive_toxicity: 'Reproductive and developmental toxicity studies should be conducted per ICH S5(R3) based on patient population.',
    
    developmental_toxicity: 'Embryo-fetal development studies in relevant species should be conducted.',
    
    repeat_dose_toxicity: 'Repeat-dose toxicity studies of appropriate duration should be conducted in two species per ICH M3(R2).',
    
    single_dose_toxicity: 'Single-dose toxicity studies provide information on acute toxicity and help guide dose selection for repeat-dose studies.'
  },
  
  pk: {
    source: 'class_based',
    
    absorption: 'Absorption characteristics depend on the specific compound, formulation, and route of administration.',
    
    distribution: {
      protein_binding: 'Protein binding should be determined for the specific compound',
      tissue_distribution: 'Tissue distribution depends on compound properties'
    },
    
    metabolism: {
      primary_pathway: 'Metabolic pathway should be characterized for the specific compound',
      enzymes: [],
      metabolites: []
    },
    
    elimination: {
      route: 'Elimination route should be determined for the specific compound'
    },
    
    special_populations: {
      renal_impairment: 'Effect of renal impairment should be evaluated based on elimination pathway',
      hepatic_impairment: 'Effect of hepatic impairment should be evaluated based on metabolic pathway'
    }
  },
  
  pd: {
    source: 'class_based',
    mechanism: 'Mechanism of action is specific to the compound and should be described based on pharmacological studies.',
    exposure_response: 'Exposure-response relationships should be characterized in clinical studies.'
  },
  
  safety: {
    source: 'class_based',
    
    common_ae: [],
    serious_ae: [],
    aes_of_special_interest: [],
    
    warnings: [
      'Safety profile should be characterized based on clinical trial data',
      'Monitor for adverse events during treatment'
    ],
    
    precautions: [
      'Use with caution in patients with hepatic or renal impairment until specific data are available',
      'Consider potential drug-drug interactions based on metabolic pathway'
    ],
    
    contraindications: [
      'Known hypersensitivity to the active substance or excipients'
    ],
    
    drug_interactions: [],
    
    special_populations: {
      pregnancy: 'Use during pregnancy only if potential benefit justifies potential risk. Animal reproduction studies should be conducted.',
      lactation: 'Consider benefits of breastfeeding and treatment vs. potential infant exposure.',
      pediatric: 'Safety and efficacy in pediatric patients should be established in appropriate studies.',
      geriatric: 'Consider age-related changes in organ function when dosing elderly patients.',
      renal_impairment: 'Evaluate need for dose adjustment based on elimination pathway.',
      hepatic_impairment: 'Evaluate need for dose adjustment based on metabolic pathway.'
    },
    
    overdose: {
      signs_symptoms: 'Signs and symptoms of overdose depend on the specific compound and its pharmacology.',
      treatment: 'Provide symptomatic and supportive care. Consider activated charcoal if recent oral ingestion.',
      antidote: 'No specific antidote unless compound-specific data indicate otherwise.'
    }
  }
}
