/**
 * PPI (Proton Pump Inhibitor) Class Fallback
 * 
 * Examples: omeprazole, esomeprazole, lansoprazole, pantoprazole, rabeprazole
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { ClassFallbackData } from './types'

export const PPI_FALLBACK: ClassFallbackData = {
  therapeutic_class: 'PPI',
  display_name: 'Proton Pump Inhibitor (PPI)',
  description: 'PPIs are a class of medications that irreversibly inhibit the hydrogen-potassium ATPase (proton pump) in gastric parietal cells, resulting in profound and prolonged suppression of gastric acid secretion.',
  
  example_compounds: ['omeprazole', 'esomeprazole', 'lansoprazole', 'pantoprazole', 'rabeprazole', 'dexlansoprazole'],
  
  cmc: {
    source: 'class_based',
    physical_properties: {
      state: 'White to off-white crystalline powder',
      color: 'White to off-white',
      polymorphism: 'Multiple polymorphic forms may exist'
    },
    solubility_profile: {
      water: 'Practically insoluble in water at neutral pH; soluble at acidic pH',
      organic: 'Soluble in methanol and dichloromethane'
    },
    formulation: {
      dosage_form: 'Delayed-release capsule or tablet (enteric-coated)',
      route: 'Oral',
      qualitative_composition: [
        'Active substance',
        'Enteric coating (to protect from gastric acid)',
        'Excipients for delayed release'
      ]
    },
    storage_stability: {
      storage_conditions: 'Store at 20-25°C (68-77°F). Protect from moisture and light.',
      shelf_life: '24-36 months',
      special_handling: 'Acid-labile; requires enteric coating or other protection'
    }
  },
  
  nonclinical: {
    source: 'class_based',
    target_organs: ['Gastrointestinal Tract', 'Liver', 'Bone', 'Stomach (ECL cells)'],
    
    primary_pharmacodynamics: 'PPIs irreversibly inhibit the H+/K+-ATPase enzyme system (proton pump) at the secretory surface of gastric parietal cells. This blocks the final step of acid production, resulting in dose-dependent inhibition of both basal and stimulated gastric acid secretion.',
    
    secondary_pharmacodynamics: 'PPIs have minimal effects on other ion pumps or receptors at therapeutic concentrations. Some PPIs may have weak antimicrobial activity against H. pylori.',
    
    safety_pharmacology: 'PPIs have been evaluated for effects on cardiovascular, respiratory, and central nervous systems. No significant effects observed at therapeutic exposures. Gastric pH elevation is the primary pharmacological effect.',
    
    genotoxicity: 'PPIs have shown negative results in standard genotoxicity assays including Ames test, in vitro chromosomal aberration, and in vivo micronucleus tests.',
    
    carcinogenicity: 'Long-term carcinogenicity studies in rodents have shown gastric carcinoid tumors due to sustained hypergastrinemia secondary to profound acid suppression. This is considered a rodent-specific finding related to the pharmacology. Enterochromaffin-like (ECL) cell hyperplasia observed.',
    
    reproductive_toxicity: 'No significant effects on fertility observed in animal studies at clinically relevant doses. Generally considered safe for use during pregnancy based on extensive clinical experience.',
    
    developmental_toxicity: 'No evidence of teratogenicity in animal studies. Extensive human pregnancy data (particularly for omeprazole) have not shown increased risk of malformations.',
    
    repeat_dose_toxicity: 'Target organ findings include gastric ECL cell hyperplasia (pharmacology-related), liver enzyme induction, and thyroid follicular cell changes in rodents. Effects are generally reversible.',
    
    single_dose_toxicity: 'Wide margin of safety. LD50 values in rodents are high (>1000 mg/kg for most PPIs).'
  },
  
  pk: {
    source: 'class_based',
    
    t_half: '1-2 hours (but prolonged pharmacological effect due to irreversible binding)',
    tmax: '1-3 hours (delayed-release formulations)',
    bioavailability: '30-90% depending on formulation and specific PPI',
    
    absorption: 'Rapidly absorbed from the small intestine after release from enteric coating. Acid-labile, requiring protection from gastric acid. Bioavailability increases with repeated dosing.',
    
    distribution: {
      vd: 'Small volume of distribution (0.13-0.35 L/kg)',
      protein_binding: 'Highly protein bound (95-98%)',
      tissue_distribution: 'Concentrated in acidic compartments, particularly gastric parietal cells'
    },
    
    metabolism: {
      primary_pathway: 'Hepatic metabolism via cytochrome P450 enzymes',
      enzymes: ['CYP2C19', 'CYP3A4'],
      metabolites: ['Inactive sulfone and sulfide metabolites'],
      metabolite_activity: 'Metabolites are pharmacologically inactive',
      first_pass: 'Significant first-pass metabolism'
    },
    
    elimination: {
      route: 'Primarily renal excretion of metabolites (70-80%); some biliary excretion',
      clearance: 'Hepatic clearance; affected by CYP2C19 polymorphisms'
    },
    
    steady_state: 'Maximal acid suppression achieved within 3-5 days of daily dosing',
    accumulation: 'Minimal accumulation due to short half-life; effect accumulates due to irreversible binding',
    dose_proportionality: 'Generally dose-proportional; bioavailability may increase with repeated dosing',
    food_effect: 'Best absorbed on empty stomach (30-60 minutes before meals)',
    
    special_populations: {
      renal_impairment: 'No dose adjustment required; metabolites are inactive',
      hepatic_impairment: 'Reduced clearance; consider dose reduction in severe impairment',
      elderly: 'Slightly reduced clearance; generally no dose adjustment needed',
      pediatric: 'PK similar to adults with weight-based dosing',
      gender: 'No clinically significant differences'
    }
  },
  
  pd: {
    source: 'class_based',
    mechanism: 'Irreversible inhibition of H+/K+-ATPase (proton pump) in gastric parietal cells, blocking the final step of gastric acid secretion.',
    target_biomarker: 'Intragastric pH, gastric acid output, serum gastrin levels',
    exposure_response: 'Acid suppression correlates with AUC rather than Cmax. Once-daily dosing provides sustained acid suppression despite short half-life.',
    onset_of_action: 'Acid suppression begins within 1 hour; maximal effect within 2-4 hours',
    duration_of_effect: '24+ hours due to irreversible enzyme inhibition; new proton pumps must be synthesized',
    qt_effect: 'No significant QT prolongation at therapeutic doses'
  },
  
  safety: {
    source: 'class_based',
    
    common_ae: [
      { term: 'Headache', frequency: 0.07, soc: 'Nervous system disorders' },
      { term: 'Diarrhea', frequency: 0.05, soc: 'Gastrointestinal disorders' },
      { term: 'Nausea', frequency: 0.04, soc: 'Gastrointestinal disorders' },
      { term: 'Abdominal pain', frequency: 0.04, soc: 'Gastrointestinal disorders' },
      { term: 'Flatulence', frequency: 0.03, soc: 'Gastrointestinal disorders' },
      { term: 'Constipation', frequency: 0.02, soc: 'Gastrointestinal disorders' },
      { term: 'Dizziness', frequency: 0.02, soc: 'Nervous system disorders' },
      { term: 'Rash', frequency: 0.02, soc: 'Skin disorders' }
    ],
    
    serious_ae: [
      { term: 'Clostridium difficile-associated diarrhea', serious: true, soc: 'Infections' },
      { term: 'Bone fractures (hip, wrist, spine)', serious: true, soc: 'Musculoskeletal disorders' },
      { term: 'Hypomagnesemia', serious: true, soc: 'Metabolism and nutrition disorders' },
      { term: 'Vitamin B12 deficiency', serious: true, soc: 'Metabolism and nutrition disorders' },
      { term: 'Acute interstitial nephritis', serious: true, soc: 'Renal disorders' },
      { term: 'Cutaneous lupus erythematosus', serious: true, soc: 'Skin disorders' },
      { term: 'Systemic lupus erythematosus', serious: true, soc: 'Immune system disorders' }
    ],
    
    aes_of_special_interest: [
      { term: 'Bone fractures', description: 'Risk with long-term, high-dose use' },
      { term: 'Hypomagnesemia', description: 'Monitor magnesium with prolonged use' },
      { term: 'C. difficile infection', description: 'Increased risk with acid suppression' },
      { term: 'Fundic gland polyps', description: 'Associated with long-term use' }
    ],
    
    warnings: [
      'Risk of Clostridium difficile-associated diarrhea',
      'Increased risk of bone fractures with long-term, high-dose use',
      'Hypomagnesemia with prolonged use (usually >1 year)',
      'Vitamin B12 deficiency with long-term use',
      'Acute interstitial nephritis (rare)',
      'Cutaneous and systemic lupus erythematosus',
      'Fundic gland polyps with long-term use',
      'May mask symptoms of gastric malignancy'
    ],
    
    precautions: [
      'Use lowest effective dose for shortest duration',
      'Consider calcium supplementation in patients at risk for osteoporosis',
      'Monitor magnesium levels with prolonged use',
      'Consider B12 monitoring with long-term use',
      'Exclude gastric malignancy before initiating therapy'
    ],
    
    contraindications: [
      'Known hypersensitivity to the PPI or substituted benzimidazoles',
      'Concomitant use with rilpivirine-containing products (some PPIs)'
    ],
    
    drug_interactions: [
      {
        drug: 'Clopidogrel',
        mechanism: 'CYP2C19 inhibition reduces clopidogrel activation',
        severity: 'moderate',
        recommendation: 'Consider alternative PPI (pantoprazole) or H2 blocker if needed.'
      },
      {
        drug: 'Methotrexate',
        mechanism: 'Reduced renal elimination of methotrexate',
        severity: 'moderate',
        recommendation: 'Consider temporary PPI discontinuation with high-dose methotrexate.'
      },
      {
        drug: 'Drugs requiring gastric acidity for absorption (ketoconazole, iron, B12)',
        mechanism: 'Reduced absorption due to increased gastric pH',
        severity: 'moderate',
        recommendation: 'Separate administration or use alternative formulations.'
      },
      {
        drug: 'Tacrolimus',
        mechanism: 'Increased tacrolimus levels (mechanism unclear)',
        severity: 'moderate',
        recommendation: 'Monitor tacrolimus levels when initiating or discontinuing PPI.'
      }
    ],
    
    special_populations: {
      pregnancy: 'Extensive human data (particularly omeprazole) have not shown increased risk. Generally considered safe when indicated.',
      pregnancy_category: 'B (omeprazole) or C (others)',
      lactation: 'PPIs are excreted in breast milk in small amounts. Generally considered compatible with breastfeeding.',
      pediatric: 'Approved for various indications in children. Dosing based on weight.',
      geriatric: 'No dose adjustment needed. Consider bone health with long-term use.',
      renal_impairment: 'No dose adjustment required.',
      hepatic_impairment: 'Consider dose reduction in severe hepatic impairment.'
    },
    
    overdose: {
      signs_symptoms: 'Confusion, drowsiness, blurred vision, tachycardia, nausea, sweating, flushing, headache',
      treatment: 'Symptomatic and supportive care. PPIs are highly protein-bound and not readily dialyzable.',
      antidote: 'No specific antidote.'
    }
  }
}
