/**
 * SSRI (Selective Serotonin Reuptake Inhibitor) Class Fallback
 * 
 * Examples: fluoxetine, sertraline, paroxetine, citalopram, escitalopram
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { ClassFallbackData } from './types'

export const SSRI_FALLBACK: ClassFallbackData = {
  therapeutic_class: 'SSRI',
  display_name: 'Selective Serotonin Reuptake Inhibitor (SSRI)',
  description: 'SSRIs are a class of antidepressants that work by selectively inhibiting the reuptake of serotonin in the brain, thereby increasing serotonin levels in the synaptic cleft.',
  
  example_compounds: ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine'],
  
  cmc: {
    source: 'class_based',
    physical_properties: {
      state: 'White to off-white crystalline powder',
      color: 'White to off-white'
    },
    solubility_profile: {
      water: 'Slightly soluble to freely soluble depending on salt form',
      organic: 'Soluble in methanol and ethanol'
    },
    formulation: {
      dosage_form: 'Tablet or capsule',
      route: 'Oral'
    },
    storage_stability: {
      storage_conditions: 'Store at 20-25°C (68-77°F). Protect from moisture.',
      shelf_life: '24-36 months'
    }
  },
  
  nonclinical: {
    source: 'class_based',
    target_organs: ['Central Nervous System', 'Liver', 'Cardiovascular System'],
    
    primary_pharmacodynamics: 'SSRIs selectively inhibit the reuptake of serotonin (5-HT) at the presynaptic neuronal membrane, resulting in increased synaptic concentrations of serotonin. This enhanced serotonergic neurotransmission is believed to be responsible for the antidepressant and anxiolytic effects.',
    
    secondary_pharmacodynamics: 'SSRIs have minimal direct effects on norepinephrine and dopamine reuptake at therapeutic concentrations. They generally lack significant affinity for muscarinic, histaminergic H1, or α1-adrenergic receptors, which accounts for their improved tolerability profile compared to older antidepressants.',
    
    safety_pharmacology: 'SSRIs have been evaluated for effects on cardiovascular, respiratory, and central nervous systems. QT prolongation has been observed with some SSRIs at supratherapeutic doses. CNS effects consistent with pharmacology (behavioral changes) are observed at high doses.',
    
    genotoxicity: 'SSRIs as a class have generally shown negative results in standard genotoxicity assays including bacterial mutagenicity tests (Ames test), in vitro chromosomal aberration tests, and in vivo micronucleus tests. No evidence of mutagenic or clastogenic potential at clinically relevant exposures.',
    
    carcinogenicity: 'Long-term carcinogenicity studies in rodents have not shown evidence of carcinogenic potential for SSRIs at clinically relevant doses. Some studies have shown increased incidence of hepatocellular adenomas in mice at high doses, considered not relevant to humans.',
    
    reproductive_toxicity: 'SSRIs may cause reproductive toxicity including decreased fertility in animal studies at high doses. Effects on sexual function and fertility have been observed in clinical use. Male rats showed decreased fertility at high multiples of the human dose.',
    
    developmental_toxicity: 'SSRIs cross the placenta and have been associated with neonatal complications when used in the third trimester, including persistent pulmonary hypertension of the newborn (PPHN) and neonatal adaptation syndrome. Animal studies have shown developmental effects at maternally toxic doses.',
    
    repeat_dose_toxicity: 'In repeat-dose toxicity studies, target organs include the liver (hepatocellular hypertrophy, enzyme induction) and CNS (behavioral changes). Effects are generally reversible upon discontinuation. Safety margins are adequate at therapeutic doses.',
    
    single_dose_toxicity: 'Acute toxicity studies indicate a wide margin of safety. LD50 values in rodents are typically >100 mg/kg. Signs of acute toxicity are consistent with exaggerated pharmacology (CNS effects, serotonin syndrome-like symptoms at very high doses).'
  },
  
  pk: {
    source: 'class_based',
    
    t_half: '1-6 days (varies by specific SSRI; fluoxetine and norfluoxetine have the longest half-lives)',
    tmax: '4-8 hours',
    bioavailability: '70-90% (high oral bioavailability)',
    
    absorption: 'Well absorbed after oral administration with peak plasma concentrations typically reached within 4-8 hours. Food generally has minimal effect on absorption.',
    
    distribution: {
      vd: 'Large volume of distribution (12-43 L/kg) indicating extensive tissue distribution',
      protein_binding: 'Highly protein bound (94-99%), primarily to albumin and α1-acid glycoprotein',
      tissue_distribution: 'Widely distributed including CNS penetration. Crosses blood-brain barrier.',
      cns_penetration: 'Good CNS penetration required for therapeutic effect',
      placental_transfer: 'Crosses placenta; detectable in cord blood',
      breast_milk: 'Excreted in breast milk; infant exposure varies by specific SSRI'
    },
    
    metabolism: {
      primary_pathway: 'Hepatic metabolism via cytochrome P450 enzymes',
      enzymes: ['CYP2D6', 'CYP2C19', 'CYP3A4'],
      metabolites: ['Active metabolites may contribute to pharmacological effect (e.g., norfluoxetine)'],
      metabolite_activity: 'Some SSRIs have active metabolites with similar or longer half-lives',
      first_pass: 'Variable first-pass metabolism'
    },
    
    elimination: {
      route: 'Primarily renal excretion of metabolites; minimal unchanged drug in urine',
      clearance: 'Hepatic clearance; affected by CYP2D6 polymorphisms'
    },
    
    steady_state: 'Achieved within 1-4 weeks of daily dosing depending on half-life',
    accumulation: 'Accumulation occurs with repeated dosing; extent depends on half-life',
    dose_proportionality: 'Generally dose-proportional pharmacokinetics within therapeutic range',
    food_effect: 'Generally minimal effect on absorption; may be taken with or without food',
    
    special_populations: {
      renal_impairment: 'No significant effect on parent drug clearance; caution with severe impairment',
      hepatic_impairment: 'Reduced clearance; dose reduction recommended in moderate-severe impairment',
      elderly: 'Reduced clearance; lower starting doses recommended',
      pediatric: 'Similar PK to adults with weight-based dosing adjustments',
      gender: 'No clinically significant gender differences'
    }
  },
  
  pd: {
    source: 'class_based',
    mechanism: 'Selective inhibition of serotonin (5-HT) reuptake at the presynaptic neuronal membrane, resulting in enhanced serotonergic neurotransmission in brain regions involved in mood regulation.',
    target_biomarker: 'Serotonin transporter (SERT) occupancy; plasma serotonin levels',
    exposure_response: 'Antidepressant effect typically emerges after 2-4 weeks of treatment. Higher doses may provide additional benefit in some patients but also increase adverse effects.',
    onset_of_action: '2-4 weeks for antidepressant effect; anxiolytic effects may be seen earlier',
    duration_of_effect: 'Sustained effect with continued treatment; relapse prevention with maintenance therapy',
    qt_effect: 'Some SSRIs (e.g., citalopram, escitalopram) associated with dose-dependent QT prolongation'
  },
  
  safety: {
    source: 'class_based',
    
    boxed_warning: 'Antidepressants increased the risk of suicidal thinking and behavior in children, adolescents, and young adults in short-term studies. Monitor for worsening and emergence of suicidal thoughts and behaviors.',
    
    common_ae: [
      { term: 'Nausea', frequency: 0.25, soc: 'Gastrointestinal disorders' },
      { term: 'Headache', frequency: 0.20, soc: 'Nervous system disorders' },
      { term: 'Insomnia', frequency: 0.18, soc: 'Psychiatric disorders' },
      { term: 'Somnolence', frequency: 0.15, soc: 'Nervous system disorders' },
      { term: 'Dizziness', frequency: 0.12, soc: 'Nervous system disorders' },
      { term: 'Dry mouth', frequency: 0.12, soc: 'Gastrointestinal disorders' },
      { term: 'Diarrhea', frequency: 0.10, soc: 'Gastrointestinal disorders' },
      { term: 'Fatigue', frequency: 0.10, soc: 'General disorders' },
      { term: 'Decreased appetite', frequency: 0.08, soc: 'Metabolism and nutrition disorders' },
      { term: 'Sexual dysfunction', frequency: 0.08, soc: 'Reproductive system disorders' },
      { term: 'Tremor', frequency: 0.08, soc: 'Nervous system disorders' },
      { term: 'Sweating increased', frequency: 0.07, soc: 'Skin disorders' },
      { term: 'Anxiety', frequency: 0.06, soc: 'Psychiatric disorders' },
      { term: 'Constipation', frequency: 0.05, soc: 'Gastrointestinal disorders' }
    ],
    
    serious_ae: [
      { term: 'Suicidal ideation', serious: true, soc: 'Psychiatric disorders' },
      { term: 'Serotonin syndrome', serious: true, soc: 'Nervous system disorders' },
      { term: 'Seizures', serious: true, soc: 'Nervous system disorders' },
      { term: 'Hyponatremia/SIADH', serious: true, soc: 'Metabolism and nutrition disorders' },
      { term: 'Abnormal bleeding', serious: true, soc: 'Blood and lymphatic system disorders' },
      { term: 'QT prolongation', serious: true, soc: 'Cardiac disorders' },
      { term: 'Mania/hypomania', serious: true, soc: 'Psychiatric disorders' }
    ],
    
    aes_of_special_interest: [
      { term: 'Suicidality', description: 'Increased risk in young adults' },
      { term: 'Serotonin syndrome', description: 'Risk with serotonergic drugs' },
      { term: 'Sexual dysfunction', description: 'Common, may affect adherence' },
      { term: 'Withdrawal symptoms', description: 'With abrupt discontinuation' }
    ],
    
    warnings: [
      'Suicidal thoughts and behaviors in children, adolescents, and young adults',
      'Serotonin syndrome risk, especially with other serotonergic agents',
      'Increased risk of bleeding, especially with NSAIDs, aspirin, or anticoagulants',
      'Hyponatremia, particularly in elderly patients',
      'Activation of mania/hypomania in patients with bipolar disorder',
      'Seizure risk in patients with seizure disorders',
      'QT prolongation (dose-dependent for some SSRIs)',
      'Angle-closure glaucoma risk'
    ],
    
    precautions: [
      'Monitor for clinical worsening and suicidality, especially early in treatment',
      'Screen for bipolar disorder before initiating treatment',
      'Use caution in patients with seizure disorders',
      'Consider dose reduction in hepatic impairment',
      'Gradual dose reduction recommended to minimize discontinuation symptoms',
      'Monitor sodium levels in at-risk patients'
    ],
    
    contraindications: [
      'Concurrent use with MAOIs or within 14 days of stopping MAOIs',
      'Concurrent use with pimozide (for some SSRIs)',
      'Concurrent use with thioridazine (for some SSRIs)',
      'Known hypersensitivity to the specific SSRI'
    ],
    
    drug_interactions: [
      {
        drug: 'MAOIs',
        mechanism: 'Increased serotonergic activity',
        severity: 'major',
        recommendation: 'Contraindicated. Allow 14-day washout before switching.'
      },
      {
        drug: 'Other serotonergic drugs (triptans, tramadol, linezolid)',
        mechanism: 'Additive serotonergic effects',
        severity: 'major',
        recommendation: 'Monitor for serotonin syndrome; use with caution.'
      },
      {
        drug: 'NSAIDs, aspirin, anticoagulants',
        mechanism: 'Additive bleeding risk',
        severity: 'moderate',
        recommendation: 'Monitor for bleeding; consider gastroprotection.'
      },
      {
        drug: 'CYP2D6 substrates',
        mechanism: 'CYP2D6 inhibition by SSRIs',
        severity: 'moderate',
        recommendation: 'May need dose adjustment of CYP2D6 substrates.'
      },
      {
        drug: 'QT-prolonging drugs',
        mechanism: 'Additive QT prolongation',
        severity: 'moderate',
        recommendation: 'ECG monitoring; avoid combination if possible.'
      }
    ],
    
    special_populations: {
      pregnancy: 'SSRIs cross the placenta. Third trimester use associated with neonatal complications including PPHN and neonatal adaptation syndrome. Use only if benefit outweighs risk.',
      pregnancy_category: 'C (most SSRIs)',
      lactation: 'SSRIs are excreted in breast milk. Consider benefits of breastfeeding and treatment vs. potential infant exposure.',
      pediatric: 'FDA-approved for some indications in children/adolescents. Black box warning for suicidality applies.',
      geriatric: 'Increased sensitivity; start with lower doses. Higher risk of hyponatremia.',
      renal_impairment: 'Generally no dose adjustment needed for mild-moderate impairment.',
      hepatic_impairment: 'Reduced clearance; dose reduction recommended.'
    },
    
    overdose: {
      signs_symptoms: 'Nausea, vomiting, seizures, cardiovascular effects (tachycardia, hypotension), CNS depression or excitation, serotonin syndrome',
      treatment: 'Supportive care. Activated charcoal if recent ingestion. Benzodiazepines for seizures. Monitor cardiac rhythm. No specific antidote.',
      antidote: 'No specific antidote. Cyproheptadine may be considered for serotonin syndrome.'
    }
  }
}
