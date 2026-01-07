/**
 * Skaldi Study Design Engine v2.0
 * 
 * Clinical-grade decision engine for study design selection.
 * 
 * Architecture (per VP CRO spec):
 * 1. Regulatory Pathway → Primary anchor (NOT phase)
 * 2. Primary Objective → Inferred from pathway + context
 * 3. Canonical Design Pattern → Selected from fixed library
 * 4. Phase Label → OUTPUT, not input
 * 
 * Key principles:
 * - Phase is NEVER an input, always derived
 * - Design patterns are fixed, not generated
 * - Guardrails block invalid combinations
 * - User receives design, doesn't choose it
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Beaker, 
  Users, 
  Clock, 
  FlaskConical, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES - Study Design Engine v2.0
// ============================================================================

// Regulatory pathways (primary classification)
type RegulatoryPathway = 
  | 'innovator'      // NCE/NBE - novel compound
  | 'generic'        // 505(j) / ANDA - identical API to reference
  | 'biosimilar'     // 351(k) - similar biologic
  | 'hybrid'         // 505(b)(2) - partial reliance on reference
  | 'post_marketing' // Phase 4 / RWE

// Primary development objectives (drives design selection)
type PrimaryObjective =
  // Innovator objectives
  | 'pk_safety'              // SAD/MAD - first in human
  | 'dose_selection'         // Dose-ranging, dose-response
  | 'proof_of_efficacy'      // Early efficacy signal
  | 'confirmatory_efficacy'  // Pivotal, registration
  | 'long_term_safety'       // Post-approval safety
  // Generic objectives
  | 'pk_equivalence'         // Bioequivalence
  // Biosimilar objectives
  | 'pk_similarity'          // Comparative PK
  | 'clinical_equivalence'   // Efficacy + safety equivalence
  // Post-marketing
  | 'safety_surveillance'    // Real-world safety
  | 'effectiveness_rwe'      // Real-world effectiveness

// Design pattern types
type DesignPatternType =
  | 'sad_mad'                // Single/Multiple Ascending Dose
  | 'parallel_dose_ranging'  // Dose-response parallel
  | 'adaptive_seamless'      // Adaptive Phase 2/3
  | 'parallel_confirmatory'  // Pivotal RCT
  | 'group_sequential'       // Event-driven with interim
  | 'crossover_2x2'          // Standard BE crossover
  | 'crossover_replicate'    // 4-period replicate for HVD
  | 'parallel_3arm_pk'       // Biosimilar comparative PK
  | 'equivalence_rct'        // Biosimilar clinical equivalence
  | 'non_inferiority_rct'    // Non-inferiority design
  | 'registry_observational' // Post-marketing registry

// Comparator types
type ComparatorType =
  | 'placebo'
  | 'active_control'
  | 'reference_drug'         // RLD for generics
  | 'reference_biologic'     // For biosimilars
  | 'none'                   // Observational

interface DrugCharacteristics {
  halfLife?: number
  isNTI?: boolean
  isHVD?: boolean
  hasFoodEffect?: boolean
  isModifiedRelease?: boolean
  bioavailability?: number
  route?: string
  dosageForm?: string
}

// Engine output structure
interface StudyDesignOutput {
  // Core classification
  regulatoryPathway: RegulatoryPathway
  primaryObjective: PrimaryObjective
  designPattern: DesignPatternType
  
  // Derived phase (OUTPUT, not input)
  phaseLabel: string  // "Phase 1", "Phase 2", "Phase 3", "Phase 4", "BE Study"
  
  // Design details
  designName: string
  designType: 'crossover_2x2' | 'crossover_replicate' | 'parallel' | 'adaptive' | 'observational'
  arms: number
  periods: number
  sequences: number
  blinding: 'open-label' | 'single-blind' | 'double-blind'
  
  // Comparator
  comparatorType: ComparatorType
  comparatorDescription: string
  
  // Population
  population: {
    type: 'healthy_volunteers' | 'patients'
    description: string
    sampleSizeRange: { min: number; max: number; recommended: number }
    sampleSizeRationale: string
  }
  
  // Duration
  duration: {
    screeningDays: number
    treatmentDays: number
    washoutDays: number
    followUpDays: number
    totalWeeks: number
  }
  
  // Dosing
  dosing: {
    regimen: 'single-dose' | 'multiple-dose' | 'steady-state'
    description: string
  }
  
  // Conditions (for PK studies)
  conditions: {
    fasting: boolean
    fed: boolean
    fedDescription?: string
  }
  
  // Sampling (for PK studies)
  sampling: {
    schedule: string[]
    totalSamples: number
    rationale: string
  }
  
  // Endpoints
  endpoints: {
    primary: string[]
    secondary: string[]
  }
  
  // Acceptance criteria
  acceptanceCriteria: {
    criterion: string
    margin: string
    description: string
  }
  
  // Regulatory
  regulatoryBasis: string[]
  regulatoryRationale: string  // Short explanation of why this design
  
  // Warnings and confidence
  warnings: string[]
  confidence: number
}

// Legacy interface for backward compatibility
interface StudyDesign extends Omit<StudyDesignOutput, 'regulatoryPathway' | 'primaryObjective' | 'designPattern' | 'phaseLabel' | 'comparatorType' | 'comparatorDescription' | 'regulatoryRationale'> {
  designType: 'crossover_2x2' | 'crossover_replicate' | 'parallel' | 'adaptive'
}

interface StudyDesignSuggestionProps {
  productType: 'generic' | 'innovator' | 'hybrid'
  compoundName: string
  indication?: string
  formulation?: {
    dosageForm?: string
    route?: string
    strength?: string
  }
  phase?: string  // Used as HINT for development stage, not as design driver
  drugCharacteristics?: DrugCharacteristics
  onAcceptDesign?: (design: StudyDesign) => void
}

// ============================================================================
// Drug Characteristics Database + Heuristics
// ============================================================================

// Highly Variable Drugs (CV > 30%) - require replicate design or reference-scaled approach
// Extended list based on FDA BE guidance and published literature
const KNOWN_HVD_DRUGS = new Set([
  // Biguanides
  'metformin',
  // Beta-blockers (lipophilic)
  'propranolol', 'carvedilol', 'labetalol', 'nebivolol',
  // Calcium channel blockers (dihydropyridines)
  'nifedipine', 'felodipine', 'amlodipine', 'nicardipine', 'nimodipine', 'nisoldipine',
  // Calcium channel blockers (non-dihydropyridines)
  'verapamil', 'diltiazem',
  // Statins (all have high first-pass metabolism)
  'simvastatin', 'atorvastatin', 'lovastatin', 'pravastatin', 'rosuvastatin', 'fluvastatin', 'pitavastatin',
  // Proton pump inhibitors
  'omeprazole', 'esomeprazole', 'lansoprazole', 'pantoprazole', 'rabeprazole', 'dexlansoprazole',
  // NSAIDs
  'naproxen', 'ibuprofen', 'diclofenac', 'piroxicam', 'meloxicam', 'celecoxib', 'indomethacin',
  // Immunosuppressants
  'cyclosporine', 'tacrolimus', 'sirolimus', 'everolimus', 'mycophenolate',
  // Anticonvulsants
  'carbamazepine', 'oxcarbazepine', 'topiramate', 'levetiracetam',
  // Antiemetics
  'ondansetron', 'granisetron', 'dolasetron',
  // Antifungals (azoles)
  'itraconazole', 'ketoconazole', 'fluconazole', 'voriconazole', 'posaconazole',
  // Antivirals
  'ritonavir', 'lopinavir', 'atazanavir', 'darunavir', 'efavirenz', 'nevirapine',
  // Antipsychotics
  'quetiapine', 'olanzapine', 'risperidone', 'aripiprazole', 'ziprasidone',
  // Benzodiazepines
  'midazolam', 'triazolam', 'alprazolam',
  // Opioids
  'fentanyl', 'oxycodone', 'hydrocodone', 'morphine', 'tramadol', 'buprenorphine',
  // Erectile dysfunction
  'sildenafil', 'tadalafil', 'vardenafil',
  // Migraine
  'sumatriptan', 'rizatriptan', 'zolmitriptan',
  // Antibiotics (macrolides)
  'azithromycin', 'clarithromycin', 'erythromycin',
  // Fluoroquinolones
  'ciprofloxacin', 'levofloxacin', 'moxifloxacin',
])

// Narrow Therapeutic Index Drugs - require tighter BE limits (90-111%)
// Based on FDA NTI guidance and clinical practice
const KNOWN_NTI_DRUGS = new Set([
  // Anticoagulants
  'warfarin', 'dabigatran', 'rivaroxaban', 'apixaban', 'edoxaban',
  // Cardiac glycosides
  'digoxin', 'digitoxin',
  // Mood stabilizers
  'lithium',
  // Anticonvulsants
  'phenytoin', 'carbamazepine', 'valproic acid', 'valproate', 'phenobarbital', 'primidone',
  // Bronchodilators
  'theophylline', 'aminophylline',
  // Immunosuppressants
  'cyclosporine', 'tacrolimus', 'sirolimus', 'everolimus',
  // Thyroid hormones
  'levothyroxine', 'liothyronine',
  // Antiarrhythmics
  'amiodarone', 'flecainide', 'propafenone', 'quinidine', 'procainamide', 'disopyramide',
  // Aminoglycosides
  'gentamicin', 'tobramycin', 'amikacin', 'vancomycin',
  // Antineoplastics
  'methotrexate', 'mercaptopurine', 'azathioprine',
  // Clozapine
  'clozapine',
])

// ============================================================================
// Drug class patterns for heuristic detection
// Based on INN stem nomenclature (WHO INN Programme)
// Source: https://www.who.int/teams/health-product-and-policy-standards/inn
// ============================================================================

const HVD_CLASS_PATTERNS = [
  // ============================================================================
  // CARDIOVASCULAR
  // ============================================================================
  /statin$/i,           // HMG-CoA reductase inhibitors (atorvastatin, simvastatin)
  /dipine$/i,           // Dihydropyridine CCBs (amlodipine, nifedipine)
  /sartan$/i,           // ARBs (losartan, valsartan) - some are HVD
  /fibrate$/i,          // Fibrates (fenofibrate, gemfibrozil)
  
  // ============================================================================
  // GASTROINTESTINAL
  // ============================================================================
  /prazole$/i,          // Proton pump inhibitors (omeprazole, pantoprazole)
  /setron$/i,           // 5-HT3 antagonists/antiemetics (ondansetron, granisetron)
  
  // ============================================================================
  // ANTI-INFECTIVES
  // ============================================================================
  /azole$/i,            // Azole antifungals (fluconazole, itraconazole)
  /navir$/i,            // HIV protease inhibitors (ritonavir, lopinavir)
  /vir$/i,              // Antivirals broad (acyclovir, valacyclovir)
  /cycline$/i,          // Tetracyclines (doxycycline, minocycline)
  /cillin$/i,           // Penicillins (amoxicillin, ampicillin)
  /sporin$/i,           // Cephalosporins (cefixime) - note: also matches cyclosporin
  
  // ============================================================================
  // CNS - ANTIDEPRESSANTS
  // ============================================================================
  /etine$/i,            // SSRIs (fluoxetine, paroxetine)
  /oxetine$/i,          // SSRIs/SNRIs (fluoxetine, duloxetine, atomoxetine)
  /aline$/i,            // SNRIs (venlafaxine, desvenlafaxine)
  /ipramine$/i,         // Tricyclics (imipramine, clomipramine)
  /ptyline$/i,          // Tricyclics (amitriptyline, nortriptyline)
  
  // ============================================================================
  // CNS - ANTIPSYCHOTICS
  // ============================================================================
  /apin$/i,             // Atypical antipsychotics (olanzapine, clozapine, quetiapine)
  /done$/i,             // Antipsychotics (risperidone, paliperidone, ziprasidone)
  /peridol$/i,          // Butyrophenones (haloperidol, droperidol)
  
  // ============================================================================
  // CNS - ANXIOLYTICS/SEDATIVES
  // ============================================================================
  /azepam$/i,           // Benzodiazepines (diazepam, lorazepam, clonazepam)
  /zolam$/i,            // Benzodiazepines (alprazolam, triazolam, midazolam)
  /pidem$/i,            // Z-drugs (zolpidem)
  /clone$/i,            // Z-drugs (zopiclone, eszopiclone)
  
  // ============================================================================
  // CNS - ANTICONVULSANTS
  // ============================================================================
  /bamate$/i,           // Carbamates (felbamate, meprobamate)
  /etam$/i,             // Racetams (levetiracetam, brivaracetam)
  
  // ============================================================================
  // CNS - MIGRAINE/PAIN
  // ============================================================================
  /triptan$/i,          // 5-HT1 agonists (sumatriptan, rizatriptan)
  /gepant$/i,           // CGRP antagonists (ubrogepant, rimegepant)
  
  // ============================================================================
  // CNS - OPIOIDS
  // ============================================================================
  /adol$/i,             // Tramadol-like (tramadol, tapentadol)
  /codone$/i,           // Opioids (oxycodone, hydrocodone)
  /morphone$/i,         // Opioids (hydromorphone, oxymorphone)
  
  // ============================================================================
  // METABOLIC/ENDOCRINE
  // ============================================================================
  /glutide$/i,          // GLP-1 receptor agonists (semaglutide, liraglutide, tirzepatide)
  /natide$/i,           // GLP-1 agonists (exenatide)
  /gliflozin$/i,        // SGLT2 inhibitors (empagliflozin, dapagliflozin)
  /gliptin$/i,          // DPP-4 inhibitors (sitagliptin, linagliptin)
  /glitazone$/i,        // Thiazolidinediones (pioglitazone, rosiglitazone)
  
  // ============================================================================
  // CORTICOSTEROIDS (variable absorption)
  // ============================================================================
  /sone$/i,             // Corticosteroids (prednisone, dexamethasone, hydrocortisone)
  /solone$/i,           // Corticosteroids (prednisolone, methylprednisolone)
  /nide$/i,             // Inhaled corticosteroids (budesonide, fluticasone - partial)
  
  // ============================================================================
  // ANTIHISTAMINES
  // ============================================================================
  /tadine$/i,           // H1 antihistamines (loratadine, desloratadine)
  /astine$/i,           // H1 antihistamines (cetirizine - partial, bilastine)
  /zine$/i,             // Older antihistamines (promethazine, hydroxyzine)
  
  // ============================================================================
  // RESPIRATORY
  // ============================================================================
  /terol$/i,            // Beta-2 agonists (salbutamol/albuterol, formoterol, salmeterol)
  /lukast$/i,           // Leukotriene antagonists (montelukast, zafirlukast)
  
  // ============================================================================
  // MUSCULOSKELETAL
  // ============================================================================
  /coxib$/i,            // COX-2 inhibitors (celecoxib, etoricoxib)
  /profen$/i,           // Propionic acid NSAIDs (ibuprofen, naproxen - partial)
  
  // ============================================================================
  // UROLOGY
  // ============================================================================
  /afil$/i,             // PDE5 inhibitors (sildenafil, tadalafil, vardenafil)
  /osin$/i,             // Alpha-blockers (tamsulosin, alfuzosin, doxazosin)
  
  // ============================================================================
  // BIOLOGICS (generally HVD due to immunogenicity variability)
  // ============================================================================
  /mab$/i,              // Monoclonal antibodies (all -mab)
  /cept$/i,             // Receptor-Fc fusion proteins (etanercept, abatacept)
  /kinra$/i,            // IL-1 receptor antagonists (anakinra)
  /ase$/i,              // Enzymes (alteplase, but be careful - broad pattern)
  /ermin$/i,            // Growth factors (epoetin - partial)
  
  // ============================================================================
  // INSULINS
  // ============================================================================
  /sulin$/i,            // All insulins (insulin glargine, insulin lispro, insulin aspart)
]

const NTI_CLASS_PATTERNS = [
  // ============================================================================
  // THYROID
  // ============================================================================
  /thyroxine$/i,        // Thyroid hormones (levothyroxine, liothyronine)
  
  // ============================================================================
  // RESPIRATORY
  // ============================================================================
  /phylline$/i,         // Xanthines (theophylline, aminophylline)
  
  // ============================================================================
  // CARDIAC
  // ============================================================================
  /glycoside/i,         // Cardiac glycosides (digoxin, digitoxin)
  
  // ============================================================================
  // ANTICOAGULANTS
  // ============================================================================
  /xaban$/i,            // Direct factor Xa inhibitors (rivaroxaban, apixaban, edoxaban)
  /gatran$/i,           // Direct thrombin inhibitors (dabigatran)
  /parin$/i,            // Heparins (heparin, enoxaparin, dalteparin, tinzaparin)
  
  // ============================================================================
  // IMMUNOSUPPRESSANTS
  // ============================================================================
  /limus$/i,            // mTOR/calcineurin inhibitors (sirolimus, tacrolimus, everolimus)
  /sporine$/i,          // Cyclosporins (cyclosporine) - more specific than /sporin/
  
  // ============================================================================
  // ANTIEPILEPTICS
  // ============================================================================
  /toin$/i,             // Hydantoins (phenytoin, fosphenytoin)
  /barbital$/i,         // Barbiturates (phenobarbital, pentobarbital)
  /suximide$/i,         // Succinimides (ethosuximide)
  
  // ============================================================================
  // ANTIARRHYTHMICS
  // ============================================================================
  /arone$/i,            // Class III antiarrhythmics (amiodarone, dronedarone)
  /cainide$/i,          // Class IC antiarrhythmics (flecainide, propafenone - partial)
  /ilide$/i,            // Class III antiarrhythmics (dofetilide, ibutilide)
  
  // ============================================================================
  // AMINOGLYCOSIDES (nephro/ototoxic)
  // ============================================================================
  /micin$/i,            // Aminoglycosides (gentamicin, tobramycin, amikacin, streptomycin)
  
  // ============================================================================
  // GLYCOPEPTIDES
  // ============================================================================
  /mycin$/i,            // Vancomycin, teicoplanin (also matches macrolides - be careful)
  
  // ============================================================================
  // ANTINEOPLASTICS (many are NTI)
  // ============================================================================
  /mustine$/i,          // Nitrogen mustards (cyclophosphamide - partial, chlorambucil)
  /platin$/i,           // Platinum compounds (cisplatin, carboplatin, oxaliplatin)
  /rubicin$/i,          // Anthracyclines (doxorubicin, daunorubicin, epirubicin)
  /taxel$/i,            // Taxanes (paclitaxel, docetaxel)
  /tinib$/i,            // Kinase inhibitors (imatinib, erlotinib) - some are NTI
  
  // ============================================================================
  // LOCAL ANESTHETICS (toxicity risk)
  // ============================================================================
  /caine$/i,            // Local anesthetics (lidocaine, bupivacaine, ropivacaine)
  
  // ============================================================================
  // LITHIUM
  // ============================================================================
  /lithium/i,           // Lithium salts
]

// Biologic-specific patterns (special handling for mAbs)
const BIOLOGIC_PATTERNS = [
  /mab$/i,              // Monoclonal antibodies
  /cept$/i,             // Fusion proteins
  /kinra$/i,            // IL antagonists
  /ase$/i,              // Enzymes (be careful)
  /glutide$/i,          // GLP-1 agonists
  /natide$/i,           // Peptides
]

// Checkpoint inhibitor patterns (anti-PD-1, anti-PD-L1, anti-CTLA-4)
const CHECKPOINT_INHIBITOR_DRUGS = new Set([
  // Anti-PD-1
  'pembrolizumab', 'nivolumab', 'cemiplimab', 'dostarlimab', 'retifanlimab',
  // Anti-PD-L1
  'atezolizumab', 'durvalumab', 'avelumab',
  // Anti-CTLA-4
  'ipilimumab', 'tremelimumab',
  // Anti-LAG-3
  'relatlimab',
  // Bispecifics
  'tebentafusp',
])

// Drug-specific half-lives (hours) - expanded
const KNOWN_HALF_LIVES: Record<string, number> = {
  // Biguanides
  'metformin': 6.2,
  // Statins
  'atorvastatin': 14, 'simvastatin': 3, 'rosuvastatin': 19, 'pravastatin': 2, 'lovastatin': 3, 'fluvastatin': 3,
  // PPIs
  'omeprazole': 1, 'esomeprazole': 1.5, 'lansoprazole': 1.5, 'pantoprazole': 1, 'rabeprazole': 1,
  // CCBs
  'amlodipine': 35, 'nifedipine': 2, 'felodipine': 11, 'verapamil': 6, 'diltiazem': 4,
  // Beta-blockers
  'metoprolol': 3.5, 'propranolol': 4, 'atenolol': 7, 'carvedilol': 7, 'bisoprolol': 11, 'nebivolol': 12,
  // ACE inhibitors
  'lisinopril': 12, 'enalapril': 11, 'ramipril': 15, 'captopril': 2, 'perindopril': 10,
  // ARBs
  'losartan': 2, 'valsartan': 6, 'irbesartan': 12, 'candesartan': 9, 'telmisartan': 24, 'olmesartan': 13,
  // Diuretics
  'furosemide': 2, 'hydrochlorothiazide': 10, 'spironolactone': 1.5, 'indapamide': 14,
  // Anticoagulants
  'warfarin': 40, 'rivaroxaban': 7, 'apixaban': 12, 'dabigatran': 14, 'edoxaban': 10,
  // Cardiac
  'digoxin': 36, 'amiodarone': 58,
  // Anticonvulsants
  'phenytoin': 22, 'carbamazepine': 16, 'valproic acid': 12, 'levetiracetam': 7, 'lamotrigine': 25, 'topiramate': 21,
  // Thyroid
  'levothyroxine': 168, 'liothyronine': 24,
  // Antidepressants
  'sertraline': 26, 'fluoxetine': 72, 'escitalopram': 27, 'citalopram': 35, 'paroxetine': 21,
  'venlafaxine': 5, 'duloxetine': 12, 'bupropion': 21, 'mirtazapine': 26,
  // Antipsychotics
  'quetiapine': 6, 'olanzapine': 30, 'risperidone': 20, 'aripiprazole': 75, 'haloperidol': 18,
  // Anxiolytics
  'alprazolam': 11, 'lorazepam': 12, 'diazepam': 43, 'clonazepam': 30,
  // Opioids
  'tramadol': 6, 'oxycodone': 4.5, 'morphine': 3, 'fentanyl': 4, 'hydrocodone': 4, 'codeine': 3,
  // Antibiotics
  'amoxicillin': 1.5, 'azithromycin': 68, 'ciprofloxacin': 4, 'levofloxacin': 7, 'doxycycline': 18,
  // NSAIDs
  'ibuprofen': 2, 'naproxen': 14, 'diclofenac': 2, 'celecoxib': 11, 'meloxicam': 20,
  // Diabetes
  'glipizide': 4, 'glyburide': 10, 'glimepiride': 5, 'sitagliptin': 12, 'linagliptin': 12,
  'empagliflozin': 12, 'dapagliflozin': 13, 'canagliflozin': 11,
  // Immunosuppressants
  'cyclosporine': 8, 'tacrolimus': 12, 'sirolimus': 62, 'mycophenolate': 17,
  // Misc small molecules
  'allopurinol': 2, 'gabapentin': 6, 'pregabalin': 6, 'montelukast': 5,
  
  // ============================================================================
  // BIOLOGICS - half-lives in DAYS (converted to hours for consistency)
  // ============================================================================
  
  // GLP-1 Receptor Agonists
  'semaglutide': 168,        // 7 days (weekly)
  'tirzepatide': 120,        // 5 days
  'liraglutide': 13,         // 13 hours (daily)
  'dulaglutide': 120,        // 5 days (weekly)
  'exenatide': 2.4,          // 2.4 hours (immediate release)
  'lixisenatide': 3,         // 3 hours
  
  // Checkpoint Inhibitors (anti-PD-1, anti-PD-L1, anti-CTLA-4)
  'pembrolizumab': 552,      // 23 days
  'nivolumab': 624,          // 26 days
  'atezolizumab': 624,       // 26 days
  'durvalumab': 408,         // 17 days
  'avelumab': 144,           // 6 days
  'ipilimumab': 360,         // 15 days
  'cemiplimab': 504,         // 21 days
  'tremelimumab': 528,       // 22 days
  
  // TNF Inhibitors
  'adalimumab': 336,         // 14 days
  'infliximab': 216,         // 9 days
  'etanercept': 102,         // 4.3 days
  'golimumab': 336,          // 14 days
  'certolizumab': 336,       // 14 days
  
  // IL Inhibitors
  'ustekinumab': 720,        // 30 days (IL-12/23)
  'secukinumab': 624,        // 26 days (IL-17A)
  'ixekizumab': 312,         // 13 days (IL-17A)
  'risankizumab': 672,       // 28 days (IL-23)
  'guselkumab': 408,         // 17 days (IL-23)
  'tildrakizumab': 552,      // 23 days (IL-23)
  'dupilumab': 480,          // 20 days (IL-4/13)
  'tocilizumab': 312,        // 13 days (IL-6)
  'sarilumab': 240,          // 10 days (IL-6)
  'anakinra': 6,             // 6 hours (IL-1)
  'canakinumab': 624,        // 26 days (IL-1β)
  
  // Anti-CD20
  'rituximab': 528,          // 22 days
  'ocrelizumab': 624,        // 26 days
  'ofatumumab': 384,         // 16 days
  'obinutuzumab': 672,       // 28 days
  
  // Anti-HER2
  'trastuzumab': 672,        // 28 days
  'pertuzumab': 408,         // 17 days
  'trastuzumab emtansine': 96, // 4 days (ADC)
  
  // Anti-VEGF
  'bevacizumab': 480,        // 20 days
  'ranibizumab': 216,        // 9 days
  'aflibercept': 144,        // 6 days
  
  // Anti-EGFR
  'cetuximab': 168,          // 7 days
  'panitumumab': 180,        // 7.5 days
  
  // JAK Inhibitors (small molecules but often grouped with biologics)
  'tofacitinib': 3,          // 3 hours
  'baricitinib': 12,         // 12 hours
  'upadacitinib': 9,         // 9 hours
  'ruxolitinib': 3,          // 3 hours
  
  // Other mAbs
  'omalizumab': 624,         // 26 days (anti-IgE)
  'mepolizumab': 480,        // 20 days (anti-IL-5)
  'benralizumab': 360,       // 15 days (anti-IL-5R)
  'vedolizumab': 624,        // 26 days (anti-integrin)
  'natalizumab': 264,        // 11 days (anti-integrin)
  'eculizumab': 264,         // 11 days (anti-C5)
  'denosumab': 624,          // 26 days (anti-RANKL)
}

// ============================================================================
// Drug Characteristic Detection Functions
// ============================================================================

// Check if drug is HVD - uses database + class heuristics
function isKnownHVD(compoundName: string): boolean {
  const normalized = compoundName.toLowerCase().trim()
  
  // First check explicit database
  if (KNOWN_HVD_DRUGS.has(normalized)) return true
  
  // Then check class patterns (e.g., any drug ending in -statin is HVD)
  for (const pattern of HVD_CLASS_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  
  return false
}

// Check if drug is NTI - uses database + class heuristics
function isKnownNTI(compoundName: string): boolean {
  const normalized = compoundName.toLowerCase().trim()
  
  // First check explicit database
  if (KNOWN_NTI_DRUGS.has(normalized)) return true
  
  // Then check class patterns
  for (const pattern of NTI_CLASS_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  
  return false
}

// Estimate half-life for unknown drugs based on class
function estimateHalfLife(compoundName: string): number {
  const normalized = compoundName.toLowerCase().trim()
  
  // Check explicit database first
  if (KNOWN_HALF_LIVES[normalized]) {
    return KNOWN_HALF_LIVES[normalized]
  }
  
  // ============================================================================
  // BIOLOGICS - typically long half-lives (days to weeks)
  // ============================================================================
  if (/mab$/i.test(normalized)) return 480       // mAbs: ~20 days median
  if (/cept$/i.test(normalized)) return 240      // Fusion proteins: ~10 days
  if (/glutide$/i.test(normalized)) return 120   // GLP-1 agonists: ~5 days
  if (/natide$/i.test(normalized)) return 3      // Short peptides: ~3 hours
  if (/kinra$/i.test(normalized)) return 6       // IL-1Ra: ~6 hours
  
  // ============================================================================
  // SMALL MOLECULES - Class-based estimates
  // ============================================================================
  
  // Cardiovascular
  if (/statin$/i.test(normalized)) return 8      // Statins: 2-19h, use median
  if (/sartan$/i.test(normalized)) return 8      // ARBs: 2-24h
  if (/pril$/i.test(normalized)) return 10       // ACE inhibitors
  if (/olol$/i.test(normalized)) return 6        // Beta-blockers
  if (/dipine$/i.test(normalized)) return 10     // CCBs
  if (/xaban$/i.test(normalized)) return 10      // DOACs
  if (/gatran$/i.test(normalized)) return 14     // Direct thrombin inhibitors
  
  // GI
  if (/prazole$/i.test(normalized)) return 1.5   // PPIs: short half-life
  if (/tidine$/i.test(normalized)) return 2.5    // H2 blockers
  
  // Anti-infectives
  if (/floxacin$/i.test(normalized)) return 6    // Fluoroquinolones
  if (/mycin$/i.test(normalized)) return 12      // Aminoglycosides/macrolides
  if (/cycline$/i.test(normalized)) return 12    // Tetracyclines
  if (/cillin$/i.test(normalized)) return 1      // Penicillins
  if (/azole$/i.test(normalized)) return 24      // Azole antifungals
  if (/navir$/i.test(normalized)) return 6       // HIV protease inhibitors
  if (/vir$/i.test(normalized)) return 8         // Antivirals general
  
  // CNS - Antidepressants
  if (/etine$/i.test(normalized)) return 24      // SSRIs
  if (/oxetine$/i.test(normalized)) return 24    // SSRIs/SNRIs
  if (/ipramine$/i.test(normalized)) return 18   // Tricyclics
  if (/ptyline$/i.test(normalized)) return 20    // Tricyclics
  
  // CNS - Antipsychotics
  if (/apin$/i.test(normalized)) return 12       // Atypical antipsychotics
  if (/done$/i.test(normalized)) return 20       // Antipsychotics
  if (/peridol$/i.test(normalized)) return 18    // Butyrophenones
  
  // CNS - Anxiolytics/Sedatives
  if (/azepam$/i.test(normalized)) return 30     // Benzodiazepines (long-acting)
  if (/zolam$/i.test(normalized)) return 12      // Benzodiazepines (short-acting)
  if (/pidem$/i.test(normalized)) return 2.5     // Z-drugs
  if (/clone$/i.test(normalized)) return 5       // Z-drugs
  
  // CNS - Opioids
  if (/adol$/i.test(normalized)) return 6        // Tramadol-like
  if (/codone$/i.test(normalized)) return 4      // Oxycodone, hydrocodone
  if (/morphone$/i.test(normalized)) return 3    // Hydromorphone, oxymorphone
  if (/lam$/i.test(normalized)) return 12        // Benzodiazepines
  if (/triptan$/i.test(normalized)) return 3     // Triptans
  
  // Metabolic
  if (/gliptin$/i.test(normalized)) return 12    // DPP-4 inhibitors
  if (/gliflozin$/i.test(normalized)) return 12  // SGLT2 inhibitors
  if (/glitazone$/i.test(normalized)) return 5   // Thiazolidinediones
  
  // Immunosuppressants
  if (/limus$/i.test(normalized)) return 40      // mTOR/calcineurin inhibitors
  if (/sporin$/i.test(normalized)) return 8      // Cyclosporins
  
  // JAK inhibitors / Kinase inhibitors
  if (/tinib$/i.test(normalized)) return 6       // Kinase inhibitors (JAK, TKI)
  
  // ============================================================================
  // NEW CLASSES
  // ============================================================================
  
  // Corticosteroids
  if (/sone$/i.test(normalized)) return 3        // Prednisone, dexamethasone (short)
  if (/solone$/i.test(normalized)) return 3      // Prednisolone, methylprednisolone
  if (/nide$/i.test(normalized)) return 3        // Budesonide (topical/inhaled)
  
  // Antihistamines
  if (/tadine$/i.test(normalized)) return 12     // Loratadine, desloratadine
  if (/astine$/i.test(normalized)) return 10     // Bilastine, cetirizine
  if (/zine$/i.test(normalized)) return 8        // Promethazine, hydroxyzine
  
  // Respiratory
  if (/terol$/i.test(normalized)) return 5       // Beta-2 agonists (variable)
  if (/lukast$/i.test(normalized)) return 5      // Leukotriene antagonists
  if (/phylline$/i.test(normalized)) return 8    // Theophylline
  
  // Insulins
  if (/sulin$/i.test(normalized)) return 1.5     // Rapid-acting default (variable by type)
  
  // Anticoagulants
  if (/parin$/i.test(normalized)) return 4       // Heparins (LMWH ~4h)
  
  // Antineoplastics
  if (/platin$/i.test(normalized)) return 30     // Platinum compounds
  if (/rubicin$/i.test(normalized)) return 30    // Anthracyclines
  if (/taxel$/i.test(normalized)) return 20      // Taxanes
  
  // Local anesthetics
  if (/caine$/i.test(normalized)) return 2       // Lidocaine, bupivacaine
  
  // Barbiturates
  if (/barbital$/i.test(normalized)) return 80   // Phenobarbital (long)
  
  // Antiemetics
  if (/setron$/i.test(normalized)) return 6      // 5-HT3 antagonists
  
  // Fibrates
  if (/fibrate$/i.test(normalized)) return 20    // Fenofibrate, gemfibrozil
  
  // PDE5 inhibitors
  if (/afil$/i.test(normalized)) return 4        // Sildenafil, tadalafil (variable)
  
  // Alpha-blockers
  if (/osin$/i.test(normalized)) return 10       // Tamsulosin, doxazosin
  
  // CGRP antagonists
  if (/gepant$/i.test(normalized)) return 6      // Ubrogepant, rimegepant
  
  // Bisphosphonates
  if (/dronate$/i.test(normalized)) return 10000 // Very long (bone retention)
  
  // Default for unknown drugs
  return 8
}

// Check if drug is a biologic (affects study design)
function isBiologic(compoundName: string): boolean {
  const normalized = compoundName.toLowerCase().trim()
  
  // Check checkpoint inhibitors first
  if (CHECKPOINT_INHIBITOR_DRUGS.has(normalized)) return true
  
  // Check biologic patterns
  for (const pattern of BIOLOGIC_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  
  return false
}

// Get half-life - uses database first, then class-based estimation
function getKnownHalfLife(compoundName: string): number {
  return estimateHalfLife(compoundName)
}

// ============================================================================
// STUDY DESIGN ENGINE v2.0 - Objective-Driven Architecture
// ============================================================================
// Per VP CRO spec: Phase is OUTPUT, not input. Design driven by:
// 1. Regulatory Pathway (inferred from product type)
// 2. Primary Objective (inferred from pathway + development stage hint)
// 3. Canonical Design Pattern (selected from fixed library)
// ============================================================================

// Step 1: Infer Regulatory Pathway from product type
function inferRegulatoryPathway(
  productType: 'generic' | 'innovator' | 'hybrid',
  compoundName: string,
  stageHint?: string
): RegulatoryPathway {
  // Check if this is a biologic
  const isBio = isBiologic(compoundName)
  
  if (productType === 'generic') {
    return 'generic'
  }
  
  if (productType === 'hybrid') {
    // Hybrid can be 505(b)(2) or biosimilar depending on molecule type
    return isBio ? 'biosimilar' : 'hybrid'
  }
  
  if (productType === 'innovator') {
    // Check if post-marketing stage
    if (stageHint === 'Phase 4') {
      return 'post_marketing'
    }
    return 'innovator'
  }
  
  return 'innovator'
}

// Step 2: Infer Primary Objective from pathway + development stage
function inferPrimaryObjective(
  pathway: RegulatoryPathway,
  stageHint?: string,
  hasEfficacyData?: boolean
): PrimaryObjective {
  switch (pathway) {
    case 'generic':
      return 'pk_equivalence'
      
    case 'biosimilar':
      // Biosimilar: PK first, then clinical equivalence
      if (stageHint === 'Phase 3' || hasEfficacyData) {
        return 'clinical_equivalence'
      }
      return 'pk_similarity'
      
    case 'hybrid':
      // Hybrid 505(b)(2): Can rely on reference data, often needs bridging PK
      if (stageHint === 'Phase 3') {
        return 'confirmatory_efficacy'
      }
      if (stageHint === 'Phase 2') {
        return 'dose_selection'
      }
      return 'pk_equivalence' // Default to PK bridging
      
    case 'post_marketing':
      return 'safety_surveillance'
      
    case 'innovator':
    default:
      // Innovator: progression through objectives
      if (stageHint === 'Phase 4') {
        return 'long_term_safety'
      }
      if (stageHint === 'Phase 3') {
        return 'confirmatory_efficacy'
      }
      if (stageHint === 'Phase 2') {
        return 'dose_selection'
      }
      // Default to Phase 1 / FIH
      return 'pk_safety'
  }
}

// Step 3: Select Canonical Design Pattern
function selectDesignPattern(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  drugChars: { isHVD?: boolean; isNTI?: boolean }
): DesignPatternType {
  // GUARDRAIL: Block invalid combinations
  if (pathway === 'generic' && objective === 'confirmatory_efficacy') {
    throw new Error('GUARDRAIL: Generic products cannot have confirmatory efficacy objective')
  }
  if (pathway === 'biosimilar' && objective === 'dose_selection') {
    throw new Error('GUARDRAIL: Biosimilars do not require dose selection studies')
  }
  
  switch (objective) {
    // Innovator objectives
    case 'pk_safety':
      return 'sad_mad'
    case 'dose_selection':
      return 'adaptive_seamless' // Modern standard per VP feedback
    case 'proof_of_efficacy':
      return 'adaptive_seamless'
    case 'confirmatory_efficacy':
      return 'parallel_confirmatory' // or group_sequential for event-driven
    case 'long_term_safety':
      return 'registry_observational'
      
    // Generic objectives
    case 'pk_equivalence':
      return drugChars.isHVD ? 'crossover_replicate' : 'crossover_2x2'
      
    // Biosimilar objectives
    case 'pk_similarity':
      return 'parallel_3arm_pk'
    case 'clinical_equivalence':
      return 'equivalence_rct'
      
    // Post-marketing
    case 'safety_surveillance':
    case 'effectiveness_rwe':
      return 'registry_observational'
      
    default:
      return 'parallel_confirmatory'
  }
}

// Step 4: Derive Phase Label (OUTPUT, not input)
function derivePhaseLabel(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective
): string {
  // Generic: No classical phases
  if (pathway === 'generic') {
    return 'BE Study'
  }
  
  // Map objective to phase
  switch (objective) {
    case 'pk_safety':
      return 'Phase 1'
    case 'dose_selection':
    case 'proof_of_efficacy':
      return 'Phase 2'
    case 'confirmatory_efficacy':
    case 'clinical_equivalence':
      return 'Phase 3'
    case 'long_term_safety':
    case 'safety_surveillance':
    case 'effectiveness_rwe':
      return 'Phase 4'
    case 'pk_similarity':
      return 'Phase 1' // Biosimilar PK is labeled Phase 1
    case 'pk_equivalence':
      return 'BE Study'
    default:
      return 'Phase 2'
  }
}

// Step 5: Select Comparator
function selectComparator(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective
): { type: ComparatorType; description: string } {
  switch (pathway) {
    case 'generic':
      return {
        type: 'reference_drug',
        description: 'Reference Listed Drug (RLD) per FDA Orange Book'
      }
    case 'biosimilar':
      return {
        type: 'reference_biologic',
        description: 'US-licensed and/or EU-approved reference biologic'
      }
    case 'post_marketing':
      return {
        type: 'none',
        description: 'Non-interventional observational study'
      }
    case 'innovator':
    case 'hybrid':
    default:
      if (objective === 'confirmatory_efficacy') {
        return {
          type: 'placebo', // or active_control depending on indication
          description: 'Placebo or active control per indication standard of care'
        }
      }
      return {
        type: 'placebo',
        description: 'Placebo control for safety and efficacy assessment'
      }
  }
}

// ============================================================================
// CANONICAL DESIGN PATTERN LIBRARY
// Fixed patterns - no generation, only selection
// ============================================================================

interface CanonicalDesignPattern {
  pattern: DesignPatternType
  name: string
  designType: 'crossover_2x2' | 'crossover_replicate' | 'parallel' | 'adaptive' | 'observational'
  arms: number
  periods: number
  blinding: 'open-label' | 'single-blind' | 'double-blind'
  populationType: 'healthy_volunteers' | 'patients'
  sampleSizeRange: { min: number; max: number; recommended: number }
  sampleSizeRationale: string
  durationWeeks: number
  dosingRegimen: 'single-dose' | 'multiple-dose' | 'steady-state'
  primaryEndpoints: string[]
  secondaryEndpoints: string[]
  acceptanceCriterion: string
  acceptanceMargin: string
  regulatoryBasis: string[]
}

const CANONICAL_PATTERNS: Record<DesignPatternType, CanonicalDesignPattern> = {
  // ============================================================================
  // INNOVATOR PATTERNS
  // ============================================================================
  sad_mad: {
    pattern: 'sad_mad',
    name: 'Randomized, Double-Blind, Placebo-Controlled, Single/Multiple Ascending Dose (SAD/MAD)',
    designType: 'adaptive',
    arms: 2, // Active + Placebo per cohort
    periods: 1,
    blinding: 'double-blind',
    populationType: 'healthy_volunteers',
    sampleSizeRange: { min: 24, max: 80, recommended: 48 },
    sampleSizeRationale: 'SAD/MAD: 6-8 cohorts × 6-10 subjects per cohort (3:1 or 4:1 active:placebo)',
    durationWeeks: 12,
    dosingRegimen: 'single-dose',
    primaryEndpoints: [
      'Safety and tolerability (AEs, SAEs, vital signs, ECG, laboratory)',
      'Maximum Tolerated Dose (MTD) or Maximum Administered Dose (MAD)',
      'Pharmacokinetics (Cmax, AUC, t½, CL, Vd)'
    ],
    secondaryEndpoints: [
      'Dose-proportionality assessment',
      'Preliminary PK/PD relationship',
      'Food effect (if applicable)',
      'Immunogenicity (for biologics)'
    ],
    acceptanceCriterion: 'Safety Review Committee approval for dose escalation',
    acceptanceMargin: 'No DLTs in ≥6 subjects at dose level; predefined stopping rules',
    regulatoryBasis: [
      'FDA Guidance: Estimating the Maximum Safe Starting Dose in Initial Clinical Trials (2005)',
      'ICH M3(R2): Nonclinical Safety Studies for Human Pharmaceuticals',
      'ICH S9: Nonclinical Evaluation for Anticancer Pharmaceuticals'
    ]
  },
  
  parallel_dose_ranging: {
    pattern: 'parallel_dose_ranging',
    name: 'Randomized, Double-Blind, Placebo-Controlled, Parallel-Group, Dose-Ranging',
    designType: 'parallel',
    arms: 4, // Placebo + 3 dose levels
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 100, max: 300, recommended: 200 },
    sampleSizeRationale: 'Dose-ranging: ~50 patients per arm × 4 arms for dose-response modeling (MCP-Mod)',
    durationWeeks: 12,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Dose-response relationship for efficacy endpoint',
      'Target dose selection for Phase 3'
    ],
    secondaryEndpoints: [
      'Safety and tolerability by dose',
      'PK/PD correlation',
      'Biomarker response',
      'Preliminary efficacy signals'
    ],
    acceptanceCriterion: 'Statistically significant dose-response',
    acceptanceMargin: 'MCP-Mod or Emax modeling; p < 0.05 for dose-response trend',
    regulatoryBasis: [
      'FDA Guidance: Dose-Response Information to Support Drug Registration (1994)',
      'ICH E4: Dose-Response Information to Support Drug Registration',
      'EMA Guideline on the Investigation of Drug Interactions'
    ]
  },
  
  adaptive_seamless: {
    pattern: 'adaptive_seamless',
    name: 'Adaptive Seamless Phase 2/3 Design with Interim Analysis',
    designType: 'adaptive',
    arms: 3, // Placebo + 2 doses (selected adaptively)
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 200, max: 600, recommended: 400 },
    sampleSizeRationale: 'Seamless design: Phase 2 portion ~150, Phase 3 portion ~250-450; interim for dose selection',
    durationWeeks: 24,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Phase 2: Dose selection based on efficacy/safety profile',
      'Phase 3: Confirmatory efficacy at selected dose(s)'
    ],
    secondaryEndpoints: [
      'Key secondary efficacy endpoints',
      'Safety profile characterization',
      'PK/PD in patient population',
      'Biomarker validation'
    ],
    acceptanceCriterion: 'Pre-specified success criteria at interim and final',
    acceptanceMargin: 'Interim: dose selection criteria; Final: p < 0.025 one-sided',
    regulatoryBasis: [
      'FDA Guidance: Adaptive Designs for Clinical Trials of Drugs and Biologics (2019)',
      'EMA Reflection Paper on Methodological Issues in Confirmatory Clinical Trials with Adaptive Design',
      'ICH E9(R1): Estimands and Sensitivity Analysis in Clinical Trials'
    ]
  },
  
  parallel_confirmatory: {
    pattern: 'parallel_confirmatory',
    name: 'Randomized, Double-Blind, Placebo/Active-Controlled, Parallel-Group, Pivotal',
    designType: 'parallel',
    arms: 2,
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 300, max: 3000, recommended: 500 },
    sampleSizeRationale: 'Pivotal: Powered at 90% for clinically meaningful difference, α=0.025 one-sided',
    durationWeeks: 24,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Regulatory-accepted primary efficacy endpoint',
      'Clinically meaningful treatment difference vs control'
    ],
    secondaryEndpoints: [
      'Key secondary efficacy endpoints (multiplicity-adjusted)',
      'Safety profile characterization',
      'Patient-reported outcomes (PROs)',
      'Health economics and outcomes research (HEOR) data'
    ],
    acceptanceCriterion: 'Superiority or Non-Inferiority',
    acceptanceMargin: 'p < 0.025 one-sided (or 0.05 two-sided) for primary endpoint',
    regulatoryBasis: [
      'FDA Guidance: Providing Clinical Evidence of Effectiveness (1998)',
      'ICH E9: Statistical Principles for Clinical Trials',
      'ICH E10: Choice of Control Group in Clinical Trials'
    ]
  },
  
  group_sequential: {
    pattern: 'group_sequential',
    name: 'Randomized, Double-Blind, Event-Driven, Group-Sequential Design',
    designType: 'adaptive',
    arms: 2,
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 500, max: 5000, recommended: 1500 },
    sampleSizeRationale: 'Event-driven: Based on expected event rate; interim analyses at 50%, 75% of events',
    durationWeeks: 52,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Time-to-event endpoint (e.g., PFS, OS, MACE)',
      'Event-driven analysis with pre-specified number of events'
    ],
    secondaryEndpoints: [
      'Secondary time-to-event endpoints',
      'Response rate',
      'Duration of response',
      'Safety and tolerability'
    ],
    acceptanceCriterion: 'Group-sequential boundaries (O\'Brien-Fleming or similar)',
    acceptanceMargin: 'Pre-specified alpha spending function; overall α=0.025 one-sided',
    regulatoryBasis: [
      'FDA Guidance: Adaptive Designs for Clinical Trials (2019)',
      'ICH E9: Statistical Principles for Clinical Trials',
      'FDA Guidance: Clinical Trial Endpoints for Approval of Cancer Drugs'
    ]
  },
  
  // ============================================================================
  // GENERIC PATTERNS
  // ============================================================================
  crossover_2x2: {
    pattern: 'crossover_2x2',
    name: 'Randomized, Open-Label, Single-Dose, 2-Treatment, 2-Period, 2-Sequence Crossover',
    designType: 'crossover_2x2',
    arms: 2,
    periods: 2,
    blinding: 'open-label',
    populationType: 'healthy_volunteers',
    sampleSizeRange: { min: 24, max: 36, recommended: 30 },
    sampleSizeRationale: 'Standard BE: Based on expected intra-subject CV of 20-25%',
    durationWeeks: 4,
    dosingRegimen: 'single-dose',
    primaryEndpoints: [
      'AUC0-t: Area under the concentration-time curve to last measurable concentration',
      'AUC0-∞: Area under the concentration-time curve extrapolated to infinity',
      'Cmax: Maximum observed plasma concentration'
    ],
    secondaryEndpoints: [
      'Tmax: Time to maximum concentration',
      't½: Terminal elimination half-life',
      'Safety and tolerability'
    ],
    acceptanceCriterion: 'Average Bioequivalence',
    acceptanceMargin: '90% CI of geometric mean ratio within 80.00-125.00% for AUC and Cmax',
    regulatoryBasis: [
      'FDA Guidance: Bioequivalence Studies With Pharmacokinetic Endpoints for Drugs Submitted Under an ANDA (2021)',
      'FDA Guidance: Statistical Approaches to Establishing Bioequivalence (2001)',
      'EMA Guideline on the Investigation of Bioequivalence'
    ]
  },
  
  crossover_replicate: {
    pattern: 'crossover_replicate',
    name: 'Randomized, Open-Label, Single-Dose, 2-Treatment, 4-Period, Replicate Crossover',
    designType: 'crossover_replicate',
    arms: 2,
    periods: 4,
    blinding: 'open-label',
    populationType: 'healthy_volunteers',
    sampleSizeRange: { min: 36, max: 48, recommended: 42 },
    sampleSizeRationale: 'Replicate design for HVD: Allows reference-scaled approach; CV >30%',
    durationWeeks: 8,
    dosingRegimen: 'single-dose',
    primaryEndpoints: [
      'AUC0-t with reference-scaled average bioequivalence',
      'AUC0-∞ with reference-scaled average bioequivalence',
      'Cmax with reference-scaled average bioequivalence'
    ],
    secondaryEndpoints: [
      'Within-subject variability estimation',
      'Tmax, t½',
      'Safety and tolerability'
    ],
    acceptanceCriterion: 'Reference-Scaled Average Bioequivalence',
    acceptanceMargin: 'Scaled 90% CI with point estimate constraint (0.80-1.25); σWR ≥ 0.294',
    regulatoryBasis: [
      'FDA Guidance: Bioequivalence Studies With Pharmacokinetic Endpoints (2021)',
      'FDA Draft Guidance: Bioequivalence Recommendations for Specific Products',
      'FDA Guidance: Statistical Approaches to Establishing Bioequivalence'
    ]
  },
  
  // ============================================================================
  // BIOSIMILAR PATTERNS
  // ============================================================================
  parallel_3arm_pk: {
    pattern: 'parallel_3arm_pk',
    name: 'Randomized, Double-Blind, 3-Arm Parallel, Comparative PK Similarity Study',
    designType: 'parallel',
    arms: 3, // Biosimilar vs US-reference vs EU-reference
    periods: 1,
    blinding: 'double-blind',
    populationType: 'healthy_volunteers',
    sampleSizeRange: { min: 150, max: 250, recommended: 200 },
    sampleSizeRationale: 'Powered for PK equivalence: 90% CI within 80-125% for AUC and Cmax',
    durationWeeks: 12,
    dosingRegimen: 'single-dose',
    primaryEndpoints: [
      'AUC0-∞ ratio (biosimilar/reference) with 90% CI within 80-125%',
      'Cmax ratio (biosimilar/reference) with 90% CI within 80-125%'
    ],
    secondaryEndpoints: [
      'Immunogenicity: Anti-Drug Antibodies (ADA) incidence and titer',
      'Safety and tolerability comparison',
      'PK parameter comparison (t½, CL, Vd)'
    ],
    acceptanceCriterion: 'PK Biosimilarity',
    acceptanceMargin: '90% CI of geometric mean ratio within 80.00-125.00% for AUC and Cmax',
    regulatoryBasis: [
      'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
      'FDA Guidance: Clinical Pharmacology Data to Support Biosimilarity (2016)',
      'EMA Guideline on Similar Biological Medicinal Products'
    ]
  },
  
  equivalence_rct: {
    pattern: 'equivalence_rct',
    name: 'Randomized, Double-Blind, Parallel-Group, Equivalence Trial',
    designType: 'parallel',
    arms: 2,
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 300, max: 800, recommended: 500 },
    sampleSizeRationale: 'Equivalence design: Powered to exclude clinically meaningful difference at pre-specified margin',
    durationWeeks: 24,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Clinical efficacy endpoint with equivalence margin',
      'Treatment difference with 95% CI within equivalence bounds'
    ],
    secondaryEndpoints: [
      'Safety profile comparison',
      'Immunogenicity comparison (ADA incidence, neutralizing antibodies)',
      'PK/PD in patient population',
      'Switching study (if applicable)'
    ],
    acceptanceCriterion: 'Clinical Equivalence',
    acceptanceMargin: '95% CI of treatment difference within pre-specified equivalence margin (±δ)',
    regulatoryBasis: [
      'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
      'FDA Guidance: Considerations in Demonstrating Interchangeability (2019)',
      'EMA Guideline on Similar Biological Medicinal Products Containing Biotechnology-Derived Proteins'
    ]
  },
  
  non_inferiority_rct: {
    pattern: 'non_inferiority_rct',
    name: 'Randomized, Double-Blind, Parallel-Group, Non-Inferiority Trial',
    designType: 'parallel',
    arms: 2,
    periods: 1,
    blinding: 'double-blind',
    populationType: 'patients',
    sampleSizeRange: { min: 400, max: 1000, recommended: 600 },
    sampleSizeRationale: 'Non-inferiority: Powered to exclude inferiority at pre-specified margin with 90% power',
    durationWeeks: 24,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Clinical efficacy endpoint with non-inferiority margin',
      'Lower bound of 95% CI above -δ (non-inferiority margin)'
    ],
    secondaryEndpoints: [
      'Safety profile comparison',
      'Immunogenicity',
      'Quality of life measures',
      'Healthcare resource utilization'
    ],
    acceptanceCriterion: 'Non-Inferiority',
    acceptanceMargin: 'Lower bound of 95% CI for treatment difference > -δ (non-inferiority margin)',
    regulatoryBasis: [
      'FDA Guidance: Non-Inferiority Clinical Trials to Establish Effectiveness (2016)',
      'ICH E10: Choice of Control Group in Clinical Trials',
      'EMA Guideline on the Choice of Non-Inferiority Margin'
    ]
  },
  
  // ============================================================================
  // POST-MARKETING PATTERNS
  // ============================================================================
  registry_observational: {
    pattern: 'registry_observational',
    name: 'Post-Marketing Observational Registry / Real-World Evidence Study',
    designType: 'observational',
    arms: 1,
    periods: 1,
    blinding: 'open-label',
    populationType: 'patients',
    sampleSizeRange: { min: 1000, max: 10000, recommended: 3000 },
    sampleSizeRationale: 'Post-marketing: Rule of 3 for rare AE detection (n=3000 for 1/1000 events with 95% CI)',
    durationWeeks: 52,
    dosingRegimen: 'multiple-dose',
    primaryEndpoints: [
      'Long-term safety profile in real-world population',
      'Rare adverse event detection and characterization',
      'Real-world effectiveness measures'
    ],
    secondaryEndpoints: [
      'Drug utilization patterns',
      'Healthcare resource utilization',
      'Patient adherence and persistence',
      'Comparative effectiveness (if comparator arm)',
      'Special populations (elderly, pediatric, renal/hepatic impairment)'
    ],
    acceptanceCriterion: 'Safety signal detection and characterization',
    acceptanceMargin: 'Descriptive statistics; no formal hypothesis testing unless specified',
    regulatoryBasis: [
      'FDA Guidance: Postmarketing Studies and Clinical Trials (2011)',
      'FDA Guidance: Best Practices for Conducting Pharmacoepidemiologic Safety Studies (2013)',
      'ICH E2E: Pharmacovigilance Planning',
      'FDA Guidance: Real-World Evidence Program Framework (2018)'
    ]
  }
}

// ============================================================================
// MAIN ENGINE FUNCTION - Generates complete study design
// ============================================================================

function generateStudyDesign(
  productType: 'generic' | 'innovator' | 'hybrid',
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  stageHint?: string,
  indication?: string,
  drugChars?: DrugCharacteristics
): StudyDesignOutput {
  // Step 1: Infer regulatory pathway
  const pathway = inferRegulatoryPathway(productType, compoundName, stageHint)
  
  // Step 2: Infer primary objective
  const objective = inferPrimaryObjective(pathway, stageHint)
  
  // Step 3: Get drug characteristics
  const isHVD = drugChars?.isHVD || isKnownHVD(compoundName)
  const isNTI = drugChars?.isNTI || isKnownNTI(compoundName)
  const halfLife = drugChars?.halfLife || getKnownHalfLife(compoundName)
  
  // Step 4: Select design pattern
  let designPattern: DesignPatternType
  try {
    designPattern = selectDesignPattern(pathway, objective, { isHVD, isNTI })
  } catch (error) {
    // Guardrail triggered - fall back to safe default
    console.error('Design Engine Guardrail:', error)
    designPattern = pathway === 'generic' ? 'crossover_2x2' : 'parallel_confirmatory'
  }
  
  // Step 5: Get canonical pattern
  const pattern = CANONICAL_PATTERNS[designPattern]
  
  // Step 6: Derive phase label
  const phaseLabel = derivePhaseLabel(pathway, objective)
  
  // Step 7: Select comparator
  const comparator = selectComparator(pathway, objective)
  
  // Step 8: Calculate washout for crossover designs
  const washoutDays = designPattern.includes('crossover') 
    ? Math.max(Math.ceil(halfLife * 5 / 24), 7)
    : 0
  
  // Step 9: Adjust sample size for NTI
  let sampleSize = { ...pattern.sampleSizeRange }
  let sampleSizeRationale = pattern.sampleSizeRationale
  if (isNTI && pathway === 'generic') {
    sampleSize = { min: 36, max: 48, recommended: 42 }
    sampleSizeRationale = 'Increased sample size for NTI drug with tighter acceptance criteria (90-111%)'
  }
  
  // Step 10: Build sampling schedule for PK studies
  let samplingSchedule: string[] = []
  if (objective === 'pk_equivalence' || objective === 'pk_similarity' || objective === 'pk_safety') {
    if (halfLife <= 4) {
      samplingSchedule = ['0', '0.25', '0.5', '0.75', '1', '1.5', '2', '2.5', '3', '4', '6', '8', '12h']
    } else if (halfLife <= 12) {
      samplingSchedule = ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '24h']
    } else {
      samplingSchedule = ['0', '0.5', '1', '2', '3', '4', '6', '8', '12', '24', '36', '48', '72h']
    }
  }
  
  // Step 11: Build acceptance criteria for NTI
  let acceptanceCriteria = {
    criterion: pattern.acceptanceCriterion,
    margin: pattern.acceptanceMargin,
    description: ''
  }
  if (isNTI && pathway === 'generic') {
    acceptanceCriteria = {
      criterion: 'Average Bioequivalence with Tightened Limits',
      margin: '90% CI of geometric mean ratio within 90.00-111.11%',
      description: 'Tightened limits for narrow therapeutic index drugs per FDA guidance'
    }
  }
  
  // Step 12: Build warnings
  const warnings: string[] = []
  if (isHVD) {
    warnings.push('Highly Variable Drug (CV >30%): Reference-scaled approach may be required')
  }
  if (isNTI) {
    warnings.push('Narrow Therapeutic Index: Tightened BE limits (90-111%) and additional safety monitoring required')
  }
  if (pathway === 'biosimilar') {
    warnings.push('Biosimilar pathway: Totality of evidence approach required (analytical + functional + clinical)')
  }
  if (objective === 'confirmatory_efficacy') {
    warnings.push('Pivotal study: Pre-specify multiplicity adjustment; consider global regulatory requirements')
  }
  if (designPattern === 'adaptive_seamless') {
    warnings.push('Adaptive design: Requires pre-specified adaptation rules and independent DMC')
  }
  
  // Step 13: Build regulatory rationale
  const regulatoryRationale = buildRegulatoryRationale(pathway, objective, designPattern, isHVD, isNTI)
  
  // Step 14: Determine conditions (fasting/fed)
  const conditions = {
    fasting: pathway === 'generic' || objective === 'pk_similarity',
    fed: pathway === 'generic' && (drugChars?.hasFoodEffect ?? false),
    fedDescription: 'High-fat, high-calorie meal per FDA guidance'
  }
  
  return {
    regulatoryPathway: pathway,
    primaryObjective: objective,
    designPattern,
    phaseLabel,
    designName: pattern.name,
    designType: pattern.designType as StudyDesignOutput['designType'],
    arms: pattern.arms,
    periods: pattern.periods,
    sequences: pattern.periods, // For crossover
    blinding: pattern.blinding,
    comparatorType: comparator.type,
    comparatorDescription: comparator.description,
    population: {
      type: pattern.populationType,
      description: buildPopulationDescription(pattern.populationType, indication, pathway),
      sampleSizeRange: sampleSize,
      sampleSizeRationale
    },
    duration: {
      screeningDays: 28,
      treatmentDays: pattern.durationWeeks * 7,
      washoutDays,
      followUpDays: pathway === 'biosimilar' ? 56 : 28,
      totalWeeks: pattern.durationWeeks + 8
    },
    dosing: {
      regimen: pattern.dosingRegimen,
      description: `${pattern.dosingRegimen === 'single-dose' ? 'Single' : 'Multiple'} dose administration of ${compoundName}`
    },
    conditions,
    sampling: {
      schedule: samplingSchedule,
      totalSamples: samplingSchedule.length,
      rationale: samplingSchedule.length > 0 ? 'PK sampling to characterize absorption and elimination' : 'Sparse PK if applicable'
    },
    endpoints: {
      primary: pattern.primaryEndpoints,
      secondary: pattern.secondaryEndpoints
    },
    acceptanceCriteria,
    regulatoryBasis: pattern.regulatoryBasis,
    regulatoryRationale,
    warnings,
    confidence: calculateConfidence(pathway, objective, isHVD, isNTI)
  }
}

// Helper: Build regulatory rationale
function buildRegulatoryRationale(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  pattern: DesignPatternType,
  isHVD: boolean,
  isNTI: boolean
): string {
  const parts: string[] = []
  
  switch (pathway) {
    case 'generic':
      parts.push('ANDA pathway (505(j)) requires demonstration of bioequivalence to RLD.')
      if (isHVD) parts.push('Replicate design selected for highly variable drug.')
      if (isNTI) parts.push('Tightened BE limits applied for narrow therapeutic index.')
      break
    case 'biosimilar':
      parts.push('351(k) pathway requires stepwise demonstration of biosimilarity.')
      if (objective === 'pk_similarity') {
        parts.push('Comparative PK study establishes similar exposure profiles.')
      } else {
        parts.push('Clinical equivalence study confirms similar efficacy and safety.')
      }
      break
    case 'innovator':
      if (objective === 'pk_safety') {
        parts.push('First-in-human study to establish safety, tolerability, and PK profile.')
      } else if (objective === 'dose_selection') {
        parts.push('Adaptive design enables efficient dose selection with interim analysis.')
      } else if (objective === 'confirmatory_efficacy') {
        parts.push('Pivotal study designed to meet FDA/EMA requirements for NDA/MAA.')
      }
      break
    case 'hybrid':
      parts.push('505(b)(2) pathway allows reliance on FDA findings for reference product.')
      break
    case 'post_marketing':
      parts.push('Post-marketing study to characterize long-term safety in real-world population.')
      break
  }
  
  return parts.join(' ')
}

// Helper: Build population description
function buildPopulationDescription(
  type: 'healthy_volunteers' | 'patients',
  indication?: string,
  pathway?: RegulatoryPathway
): string {
  if (type === 'healthy_volunteers') {
    return 'Healthy adult volunteers, 18-55 years, BMI 18.5-30 kg/m², non-smokers or light smokers'
  }
  if (indication) {
    return `Adult patients with ${indication}, meeting protocol-defined inclusion/exclusion criteria`
  }
  if (pathway === 'post_marketing') {
    return 'Real-world patient population receiving treatment per standard clinical practice'
  }
  return 'Adult patients meeting protocol-defined inclusion/exclusion criteria'
}

// Helper: Calculate confidence score
function calculateConfidence(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  isHVD: boolean,
  isNTI: boolean
): number {
  let confidence = 90
  
  // Reduce confidence for complex scenarios
  if (isHVD) confidence -= 5
  if (isNTI) confidence -= 5
  if (pathway === 'biosimilar') confidence -= 5
  if (objective === 'dose_selection') confidence -= 10 // More uncertainty in dose-finding
  if (objective === 'confirmatory_efficacy') confidence -= 5 // Many variables
  
  return Math.max(confidence, 60)
}

// ============================================================================
// LEGACY ADAPTER - Converts new output to old StudyDesign interface
// ============================================================================

function convertToLegacyDesign(output: StudyDesignOutput): StudyDesign {
  return {
    designType: output.designType === 'observational' ? 'parallel' : output.designType as StudyDesign['designType'],
    designName: output.designName,
    arms: output.arms,
    periods: output.periods,
    sequences: output.sequences,
    blinding: output.blinding,
    population: output.population,
    duration: output.duration,
    dosing: output.dosing,
    conditions: output.conditions,
    sampling: output.sampling,
    endpoints: output.endpoints,
    acceptanceCriteria: output.acceptanceCriteria,
    regulatoryBasis: output.regulatoryBasis,
    warnings: output.warnings,
    confidence: output.confidence
  }
}

// ============================================================================
// LEGACY FUNCTIONS - Kept for backward compatibility, now use new engine
// ============================================================================

// ============================================================================
// BE Design Rules Engine (for Generic products)
// ============================================================================

function generateBEDesign(
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  characteristics: DrugCharacteristics,
  phase: string = 'Phase 1'
): StudyDesign {
  // For Generic: Phase selection affects study type
  // Phase 1: Standard fasting BE (primary study)
  // Phase 2: Not typical for generics, but could be dose-finding for complex generics
  // Phase 3: Fed study, special populations (renal/hepatic), or additional PK studies
  // Phase 4: Post-marketing surveillance, real-world evidence
  const isPhase1 = phase === 'Phase 1'
  const isPhase3 = phase === 'Phase 3'
  const isPhase4 = phase === 'Phase 4'
  
  const isOral = formulation.route?.toUpperCase() === 'ORAL' || 
                 formulation.dosageForm?.toLowerCase().includes('tablet') ||
                 formulation.dosageForm?.toLowerCase().includes('capsule')
  
  const isIR = !characteristics.isModifiedRelease && 
               !formulation.dosageForm?.toLowerCase().includes('extended') &&
               !formulation.dosageForm?.toLowerCase().includes('modified') &&
               !formulation.dosageForm?.toLowerCase().includes('sustained')
  
  // Use known drug database OR provided characteristics
  const isNTI = characteristics.isNTI || isKnownNTI(compoundName)
  const isHVD = characteristics.isHVD || isKnownHVD(compoundName)
  const hasFoodEffect = characteristics.hasFoodEffect ?? true // Default to requiring fed study
  const halfLife = characteristics.halfLife || getKnownHalfLife(compoundName) || 8 // Use known or default 8h
  
  // Calculate washout period (≥5 half-lives, minimum 7 days)
  const washoutDays = Math.max(Math.ceil(halfLife * 5 / 24), 7)
  
  // Determine design type
  let designType: StudyDesign['designType'] = 'crossover_2x2'
  let designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 2-Period, 2-Sequence Crossover'
  let periods = 2
  let sequences = 2
  let arms = 2
  
  if (isHVD) {
    designType = 'crossover_replicate'
    designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 4-Period, Replicate Crossover'
    periods = 4
    sequences = 2
  }
  
  if (!isOral) {
    designType = 'crossover_2x2'
    designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 2-Period, 2-Sequence Crossover'
  }
  
  // Sample size calculation
  let sampleSizeMin = 24
  let sampleSizeMax = 36
  let sampleSizeRecommended = 30
  let sampleSizeRationale = 'Based on expected intra-subject CV of 20-25% for standard oral formulations'
  
  if (isHVD) {
    sampleSizeMin = 36
    sampleSizeMax = 48
    sampleSizeRecommended = 42
    sampleSizeRationale = 'Increased sample size for highly variable drug (CV >30%) with reference-scaled approach'
  }
  
  if (isNTI) {
    sampleSizeMin = 36
    sampleSizeMax = 48
    sampleSizeRecommended = 42
    sampleSizeRationale = 'Increased sample size for narrow therapeutic index drug with tighter acceptance criteria'
  }
  
  // Sampling schedule based on half-life
  let samplingSchedule: string[] = []
  if (halfLife <= 4) {
    samplingSchedule = ['0', '0.25', '0.5', '0.75', '1', '1.5', '2', '2.5', '3', '4', '6', '8', '12h']
  } else if (halfLife <= 12) {
    samplingSchedule = ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '24h']
  } else {
    samplingSchedule = ['0', '0.5', '1', '2', '3', '4', '6', '8', '12', '24', '36', '48', '72h']
  }
  
  // Acceptance criteria
  let acceptanceCriterion = 'Average Bioequivalence'
  let acceptanceMargin = '90% CI of geometric mean ratio within 80.00-125.00%'
  let acceptanceDescription = 'Standard FDA bioequivalence criteria'
  
  if (isNTI) {
    acceptanceCriterion = 'Average Bioequivalence with Tightened Limits'
    acceptanceMargin = '90% CI of geometric mean ratio within 90.00-111.11%'
    acceptanceDescription = 'Tightened limits for narrow therapeutic index drugs per FDA guidance'
  }
  
  if (isHVD) {
    acceptanceCriterion = 'Reference-Scaled Average Bioequivalence'
    acceptanceMargin = 'Scaled 90% CI with point estimate constraint (0.80-1.25)'
    acceptanceDescription = 'Reference-scaled approach for highly variable drugs (CV >30%)'
  }
  
  // Phase-specific adjustments
  let phaseNote = ''
  if (isPhase1) {
    phaseNote = 'Primary fasting BE study'
  } else if (isPhase3) {
    // Phase 3 for generic = Fed study or special populations
    phaseNote = 'Fed-state BE study or special population PK'
  } else if (isPhase4) {
    // Phase 4 = Post-marketing, different design
    designType = 'parallel'
    designName = 'Post-Marketing Surveillance / Real-World Evidence Study'
    periods = 1
    sampleSizeMin = 100
    sampleSizeMax = 500
    sampleSizeRecommended = 200
    sampleSizeRationale = 'Post-marketing surveillance requires larger sample for safety signal detection'
    phaseNote = 'Post-marketing safety surveillance'
  }
  
  // Warnings
  const warnings: string[] = []
  if (isNTI) {
    warnings.push('Narrow Therapeutic Index drug requires additional safety monitoring and tighter BE limits')
  }
  if (isHVD) {
    warnings.push('Highly Variable Drug may require replicate design and reference-scaled analysis')
  }
  if (hasFoodEffect && !isPhase4) {
    warnings.push('Food effect study may be required based on RLD labeling')
  }
  if (isPhase3) {
    warnings.push('Consider fed-state study if RLD label indicates food effect')
    warnings.push('Special population studies (renal/hepatic impairment) may be required')
  }
  if (isPhase4) {
    warnings.push('Post-marketing study - focus on real-world safety and effectiveness')
  }
  
  return {
    designType,
    designName,
    arms,
    periods,
    sequences,
    blinding: 'open-label',
    population: {
      type: 'healthy_volunteers',
      description: 'Healthy adult volunteers, 18-55 years, BMI 18.5-30 kg/m²',
      sampleSizeRange: { min: sampleSizeMin, max: sampleSizeMax, recommended: sampleSizeRecommended },
      sampleSizeRationale
    },
    duration: {
      screeningDays: 28,
      treatmentDays: periods,
      washoutDays,
      followUpDays: 7,
      totalWeeks: Math.ceil((28 + periods + (periods - 1) * washoutDays + 7) / 7)
    },
    dosing: {
      regimen: 'single-dose',
      description: `Single dose of ${formulation.strength || '[strength]'} ${compoundName} ${formulation.dosageForm || 'tablet'}`
    },
    conditions: {
      fasting: true,
      fed: hasFoodEffect,
      fedDescription: hasFoodEffect ? 'High-fat, high-calorie breakfast per FDA guidance' : undefined
    },
    sampling: {
      schedule: samplingSchedule,
      totalSamples: samplingSchedule.length * 2, // Per period
      rationale: `Sampling schedule designed to capture Cmax and characterize elimination phase (t½ ≈ ${halfLife}h)`
    },
    endpoints: {
      primary: [
        'Cmax (Maximum Plasma Concentration)',
        'AUC0-t (Area Under Curve to Last Measurable Concentration)',
        'AUC0-∞ (Area Under Curve Extrapolated to Infinity)'
      ],
      secondary: [
        'Tmax (Time to Maximum Concentration)',
        't½ (Elimination Half-life)',
        'Kel (Elimination Rate Constant)',
        'λz (Terminal Elimination Rate Constant)'
      ]
    },
    acceptanceCriteria: {
      criterion: acceptanceCriterion,
      margin: acceptanceMargin,
      description: acceptanceDescription
    },
    regulatoryBasis: [
      'FDA Guidance: Bioequivalence Studies With Pharmacokinetic Endpoints for Drugs Submitted Under an ANDA (2021)',
      'FDA Guidance: Statistical Approaches to Establishing Bioequivalence (2001)',
      isHVD ? 'FDA Guidance: Bioequivalence Recommendations for Highly Variable Drugs' : '',
      isNTI ? 'FDA Guidance: Bioequivalence for Narrow Therapeutic Index Drugs' : ''
    ].filter(Boolean),
    warnings,
    confidence: isNTI || isHVD ? 85 : 95
  }
}

// ============================================================================
// Innovator Design Rules Engine
// ============================================================================

function generateInnovatorDesign(
  compoundName: string,
  indication: string | undefined,
  phase: string = 'Phase 2'
): StudyDesign {
  const isPhase1 = phase === 'Phase 1'
  const isPhase2 = phase === 'Phase 2'
  const isPhase3 = phase === 'Phase 3'
  const isPhase4 = phase === 'Phase 4'
  
  let designType: StudyDesign['designType'] = 'parallel'
  let designName = ''
  let arms = 2
  let periods = 1
  let sequences = 1
  let blinding: StudyDesign['blinding'] = 'double-blind'
  let populationType: 'healthy_volunteers' | 'patients' = 'patients'
  let populationDescription = ''
  let sampleSizeMin = 100
  let sampleSizeMax = 300
  let sampleSizeRecommended = 150
  let sampleSizeRationale = ''
  let dosingRegimen: 'single-dose' | 'multiple-dose' | 'steady-state' = 'multiple-dose'
  let durationWeeks = 12
  let primaryEndpoints: string[] = []
  let secondaryEndpoints: string[] = []
  let acceptanceCriterion = ''
  let acceptanceMargin = ''
  let regulatoryBasis: string[] = []
  let warnings: string[] = []
  let confidence = 75
  
  if (isPhase1) {
    // Phase 1: Safety, tolerability, PK, MTD
    designName = 'Randomized, Double-Blind, Placebo-Controlled, Single/Multiple Ascending Dose (SAD/MAD)'
    designType = 'adaptive'
    arms = 2 // Active + Placebo per cohort
    blinding = 'double-blind'
    populationType = 'healthy_volunteers'
    populationDescription = 'Healthy adult volunteers, 18-55 years, for SAD/MAD dose-escalation'
    sampleSizeMin = 24
    sampleSizeMax = 80
    sampleSizeRecommended = 48
    sampleSizeRationale = 'Typical Phase 1 SAD/MAD: 6-8 cohorts × 6-10 subjects per cohort (including placebo)'
    dosingRegimen = 'single-dose'
    durationWeeks = 8
    primaryEndpoints = [
      'Safety and tolerability (AEs, SAEs, vital signs, ECG, laboratory)',
      'Maximum Tolerated Dose (MTD)',
      'Pharmacokinetics (Cmax, AUC, t½, CL, Vd)'
    ]
    secondaryEndpoints = [
      'Dose-proportionality assessment',
      'Preliminary PK/PD relationship',
      'Food effect (if applicable)'
    ]
    acceptanceCriterion = 'Safety Review Committee approval for dose escalation'
    acceptanceMargin = 'No DLTs in ≥6 subjects at dose level'
    regulatoryBasis = [
      'FDA Guidance: Estimating the Maximum Safe Starting Dose in Initial Clinical Trials (2005)',
      'ICH M3(R2): Nonclinical Safety Studies for Human Pharmaceuticals',
      'FDA Guidance: Safety Testing of Drug Metabolites (2020)'
    ]
    warnings = [
      'Sentinel dosing recommended for first-in-human studies',
      'Data Safety Monitoring Board (DSMB) required',
      'Consider adaptive design for dose-escalation efficiency'
    ]
    confidence = 85
    
  } else if (isPhase2) {
    // Phase 2: Efficacy signal, dose-finding
    designName = 'Randomized, Double-Blind, Placebo-Controlled, Parallel-Group, Dose-Ranging'
    designType = 'parallel'
    arms = 4 // Placebo + 3 dose levels
    blinding = 'double-blind'
    populationType = 'patients'
    populationDescription = `Patients with ${indication || '[indication]'}, meeting inclusion criteria`
    sampleSizeMin = 100
    sampleSizeMax = 300
    sampleSizeRecommended = 200
    sampleSizeRationale = 'Phase 2 dose-ranging: ~50 patients per arm × 4 arms for dose-response modeling'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 12
    primaryEndpoints = [
      'Preliminary efficacy endpoint (disease-specific)',
      'Dose-response relationship'
    ]
    secondaryEndpoints = [
      'Safety and tolerability',
      'PK/PD correlation',
      'Biomarker response',
      'Quality of life measures'
    ]
    acceptanceCriterion = 'Statistically significant dose-response'
    acceptanceMargin = 'p < 0.05 for primary endpoint vs placebo'
    regulatoryBasis = [
      'FDA Guidance: Dose-Response Information to Support Drug Registration (1994)',
      'ICH E4: Dose-Response Information to Support Drug Registration',
      'FDA Guidance: Adaptive Designs for Clinical Trials (2019)'
    ]
    warnings = [
      'Consider adaptive design for dose selection',
      'Interim analysis may allow early termination for futility',
      'Biomarker-driven enrichment may improve efficiency'
    ]
    confidence = 70
    
  } else if (isPhase3) {
    // Phase 3: Confirmatory, pivotal
    designName = 'Randomized, Double-Blind, Placebo/Active-Controlled, Parallel-Group, Pivotal'
    designType = 'parallel'
    arms = 2
    blinding = 'double-blind'
    populationType = 'patients'
    populationDescription = `Patients with ${indication || '[indication]'}, broad inclusion for generalizability`
    sampleSizeMin = 300
    sampleSizeMax = 3000
    sampleSizeRecommended = 500
    sampleSizeRationale = 'Pivotal Phase 3: Powered at 90% for clinically meaningful difference, α=0.05 two-sided'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 24
    primaryEndpoints = [
      'Regulatory-accepted primary efficacy endpoint',
      'Clinically meaningful treatment difference'
    ]
    secondaryEndpoints = [
      'Key secondary efficacy endpoints',
      'Safety profile characterization',
      'Patient-reported outcomes (PROs)',
      'Health economics data'
    ]
    acceptanceCriterion = 'Superiority or Non-Inferiority'
    acceptanceMargin = 'p < 0.025 one-sided (or 0.05 two-sided) for primary endpoint'
    regulatoryBasis = [
      'FDA Guidance: Providing Clinical Evidence of Effectiveness for Human Drug and Biological Products (1998)',
      'ICH E9: Statistical Principles for Clinical Trials',
      'ICH E10: Choice of Control Group in Clinical Trials'
    ]
    warnings = [
      'Two adequate and well-controlled trials typically required for NDA',
      'Pre-specify multiplicity adjustment for secondary endpoints',
      'Consider global regulatory requirements (FDA, EMA, PMDA)'
    ]
    confidence = 80
    
  } else if (isPhase4) {
    // Phase 4: Post-marketing
    designName = 'Post-Marketing Observational / Registry Study'
    designType = 'parallel'
    arms = 1
    blinding = 'open-label'
    populationType = 'patients'
    populationDescription = 'Real-world patient population in clinical practice'
    sampleSizeMin = 1000
    sampleSizeMax = 10000
    sampleSizeRecommended = 3000
    sampleSizeRationale = 'Post-marketing: Large sample for rare AE detection (rule of 3: n=3000 for 1/1000 events)'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 52
    primaryEndpoints = [
      'Long-term safety profile',
      'Rare adverse event detection',
      'Real-world effectiveness'
    ]
    secondaryEndpoints = [
      'Drug utilization patterns',
      'Healthcare resource utilization',
      'Patient adherence and persistence',
      'Comparative effectiveness'
    ]
    acceptanceCriterion = 'Safety signal detection'
    acceptanceMargin = 'Descriptive statistics, no formal hypothesis testing'
    regulatoryBasis = [
      'FDA Guidance: Postmarketing Studies and Clinical Trials (2011)',
      'FDA Guidance: Best Practices for Conducting and Reporting Pharmacoepidemiologic Safety Studies (2013)',
      'ICH E2E: Pharmacovigilance Planning'
    ]
    warnings = [
      'May be required as post-marketing commitment (PMC/PMR)',
      'Consider registry-based or EHR-based design',
      'REMS may require additional safety monitoring'
    ]
    confidence = 90
  }
  
  return {
    designType,
    designName,
    arms,
    periods,
    sequences,
    blinding,
    population: {
      type: populationType,
      description: populationDescription,
      sampleSizeRange: { min: sampleSizeMin, max: sampleSizeMax, recommended: sampleSizeRecommended },
      sampleSizeRationale
    },
    duration: {
      screeningDays: 28,
      treatmentDays: durationWeeks * 7,
      washoutDays: 0,
      followUpDays: 28,
      totalWeeks: durationWeeks + 8
    },
    dosing: {
      regimen: dosingRegimen,
      description: `${dosingRegimen === 'single-dose' ? 'Single' : 'Multiple'} dose administration of ${compoundName}`
    },
    conditions: {
      fasting: false,
      fed: false
    },
    sampling: {
      schedule: isPhase1 ? ['Pre-dose', '0.5h', '1h', '2h', '4h', '8h', '12h', '24h', '48h', '72h'] : [],
      totalSamples: isPhase1 ? 10 : 0,
      rationale: isPhase1 ? 'Intensive PK sampling for first-in-human characterization' : 'Sparse PK sampling if applicable'
    },
    endpoints: {
      primary: primaryEndpoints,
      secondary: secondaryEndpoints
    },
    acceptanceCriteria: {
      criterion: acceptanceCriterion,
      margin: acceptanceMargin,
      description: ''
    },
    regulatoryBasis,
    warnings,
    confidence
  }
}

// ============================================================================
// Hybrid/Biosimilar Design Rules Engine
// ============================================================================

function generateHybridDesign(
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  phase: string = 'Phase 1'
): StudyDesign {
  const isPhase1 = phase === 'Phase 1'
  const isPhase3 = phase === 'Phase 3'
  
  // Biosimilar typically needs: Comparative PK (Phase 1) + Clinical similarity (Phase 3)
  if (isPhase1) {
    return {
      designType: 'parallel',
      designName: 'Randomized, Double-Blind, 3-Arm Parallel, Comparative PK Study',
      arms: 3, // Biosimilar vs US-reference vs EU-reference
      periods: 1,
      sequences: 3,
      blinding: 'double-blind',
      population: {
        type: 'healthy_volunteers',
        description: 'Healthy adult volunteers, 18-55 years, matched for weight/BMI',
        sampleSizeRange: { min: 150, max: 250, recommended: 200 },
        sampleSizeRationale: 'Powered for PK equivalence with 90% CI within 80-125% for AUC and Cmax'
      },
      duration: {
        screeningDays: 28,
        treatmentDays: 1,
        washoutDays: 0,
        followUpDays: 56,
        totalWeeks: 12
      },
      dosing: {
        regimen: 'single-dose',
        description: `Single dose of ${compoundName} biosimilar vs reference products`
      },
      conditions: {
        fasting: true,
        fed: false
      },
      sampling: {
        schedule: ['Pre-dose', '0.5h', '1h', '2h', '4h', '8h', '12h', '24h', '48h', '72h', '7d', '14d', '21d'],
        totalSamples: 13,
        rationale: 'Intensive PK sampling to characterize absorption and elimination'
      },
      endpoints: {
        primary: [
          'AUC0-∞ ratio (biosimilar/reference) with 90% CI within 80-125%',
          'Cmax ratio (biosimilar/reference) with 90% CI within 80-125%'
        ],
        secondary: [
          'Immunogenicity: Anti-Drug Antibodies (ADA) incidence',
          'Safety and tolerability comparison',
          'PK parameter comparison (t½, CL, Vd)'
        ]
      },
      acceptanceCriteria: {
        criterion: 'PK Biosimilarity',
        margin: '90% CI of geometric mean ratio within 80.00-125.00% for AUC and Cmax',
        description: 'FDA/EMA biosimilar PK equivalence criteria'
      },
      regulatoryBasis: [
        'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
        'FDA Guidance: Clinical Pharmacology Data to Support Biosimilarity (2016)',
        'EMA Guideline on Similar Biological Medicinal Products (2014)'
      ],
      warnings: [
        'Three-arm design required for global submission (US + EU reference)',
        'Immunogenicity assessment critical for biologics',
        'Consider switching study design for interchangeability'
      ],
      confidence: 85
    }
  } else {
    // Phase 3: Clinical similarity study
    return {
      designType: 'parallel',
      designName: 'Randomized, Double-Blind, Parallel-Group, Clinical Equivalence Study',
      arms: 2,
      periods: 1,
      sequences: 2,
      blinding: 'double-blind',
      population: {
        type: 'patients',
        description: 'Patients with approved indication, on stable background therapy',
        sampleSizeRange: { min: 300, max: 600, recommended: 450 },
        sampleSizeRationale: 'Powered for equivalence margin of ±15% for primary efficacy endpoint'
      },
      duration: {
        screeningDays: 28,
        treatmentDays: 168, // 24 weeks
        washoutDays: 0,
        followUpDays: 28,
        totalWeeks: 28
      },
      dosing: {
        regimen: 'multiple-dose',
        description: `${compoundName} biosimilar vs reference product per approved dosing`
      },
      conditions: {
        fasting: false,
        fed: false
      },
      sampling: {
        schedule: ['Week 0', 'Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20', 'Week 24'],
        totalSamples: 7,
        rationale: 'Efficacy and safety assessments at regular intervals'
      },
      endpoints: {
        primary: [
          'Clinical efficacy endpoint (e.g., ACR20 for RA, PASI75 for psoriasis)',
          'Equivalence margin typically ±15%'
        ],
        secondary: [
          'Immunogenicity: ADA incidence and titer',
          'Immunogenicity: Neutralizing antibodies',
          'Safety profile comparison',
          'PK trough concentrations'
        ]
      },
      acceptanceCriteria: {
        criterion: 'Clinical Equivalence',
        margin: '95% CI of treatment difference within ±15% equivalence margin',
        description: 'Clinical similarity demonstration per FDA/EMA guidance'
      },
      regulatoryBasis: [
        'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
        'FDA Guidance: Considerations in Demonstrating Interchangeability (2019)',
        'EMA Guideline on Similar Biological Medicinal Products Containing Biotechnology-Derived Proteins'
      ],
      warnings: [
        'Sensitive patient population required to detect differences',
        'Immunogenicity follow-up typically 52 weeks',
        'Consider switching sub-study for interchangeability designation'
      ],
      confidence: 80
    }
  }
}

// ============================================================================
// Component
// ============================================================================

export function StudyDesignSuggestion({
  productType,
  compoundName,
  indication,
  formulation,
  phase,
  drugCharacteristics = {},
  onAcceptDesign
}: StudyDesignSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Check if we should show the component
  // Generic: needs formulation selected
  // Innovator: needs compound name
  // Hybrid: needs formulation selected
  const shouldShow = (
    (productType === 'generic' && !!formulation?.dosageForm) ||
    (productType === 'innovator' && !!compoundName && compoundName.length >= 3) ||
    (productType === 'hybrid' && !!formulation?.dosageForm)
  )
  
  // Generate design using new objective-driven engine v2.0
  // Phase is used as HINT for development stage, not as design driver
  const designOutput = useMemo(() => {
    if (!shouldShow) return null
    
    try {
      return generateStudyDesign(
        productType,
        compoundName,
        formulation || {},
        phase,  // stageHint - used to infer objective, not to drive design
        indication,
        drugCharacteristics
      )
    } catch (error) {
      console.error('Study Design Engine error:', error)
      return null
    }
  }, [compoundName, formulation, drugCharacteristics, shouldShow, phase, productType, indication])
  
  // Convert to legacy format for backward compatibility with UI
  const design = useMemo(() => {
    if (!designOutput) return null
    return convertToLegacyDesign(designOutput)
  }, [designOutput])
  
  // Early return AFTER all hooks
  if (!shouldShow || !design) {
    return null
  }
  
  const handleCopy = async () => {
    const text = `
STUDY DESIGN: ${design.designName}

POPULATION: ${design.population.description}
SAMPLE SIZE: ${design.population.sampleSizeRange.recommended} subjects (range: ${design.population.sampleSizeRange.min}-${design.population.sampleSizeRange.max})

DESIGN:
- ${design.arms} treatments, ${design.periods} periods, ${design.sequences} sequences
- Washout: ${design.duration.washoutDays} days
- Dosing: ${design.dosing.description}
- Conditions: ${design.conditions.fasting ? 'Fasting' : ''}${design.conditions.fed ? ' + Fed' : ''}

SAMPLING: ${design.sampling.schedule.join(', ')}

PRIMARY ENDPOINTS:
${design.endpoints.primary.map(e => `- ${e}`).join('\n')}

ACCEPTANCE CRITERIA:
${design.acceptanceCriteria.criterion}
${design.acceptanceCriteria.margin}

REGULATORY BASIS:
${design.regulatoryBasis.map(r => `- ${r}`).join('\n')}
    `.trim()
    
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Format pathway and objective for display
  const pathwayLabel = designOutput ? {
    'innovator': 'Innovator (NCE/NBE)',
    'generic': 'Generic (ANDA)',
    'biosimilar': 'Biosimilar (351(k))',
    'hybrid': 'Hybrid (505(b)(2))',
    'post_marketing': 'Post-Marketing'
  }[designOutput.regulatoryPathway] : ''
  
  const objectiveLabel = designOutput ? {
    'pk_safety': 'PK + Safety',
    'dose_selection': 'Dose Selection',
    'proof_of_efficacy': 'Proof of Efficacy',
    'confirmatory_efficacy': 'Confirmatory Efficacy',
    'long_term_safety': 'Long-term Safety',
    'pk_equivalence': 'PK Equivalence',
    'pk_similarity': 'PK Similarity',
    'clinical_equivalence': 'Clinical Equivalence',
    'safety_surveillance': 'Safety Surveillance',
    'effectiveness_rwe': 'Real-World Effectiveness'
  }[designOutput.primaryObjective] : ''
  
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm text-foreground">
              Recommended Study Design
              {designOutput && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {designOutput.phaseLabel}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {pathwayLabel}
              {' → '}
              {objectiveLabel}
              {' • '}
              {design.population.sampleSizeRange.recommended} subjects
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              design.confidence >= 90 ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"
            )}
          >
            {design.confidence >= 90 ? 'High Confidence' : 'Review Recommended'}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Regulatory Rationale - NEW in v2.0 */}
          {designOutput?.regulatoryRationale && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Regulatory Rationale</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">{designOutput.regulatoryRationale}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Design Title */}
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Study Design</div>
            <div className="text-sm font-medium text-foreground">{design.designName}</div>
          </div>
          
          {/* Key Parameters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Population */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Sample Size</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.population.sampleSizeRange.recommended}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Range: {design.population.sampleSizeRange.min}-{design.population.sampleSizeRange.max}
              </div>
            </div>
            
            {/* Design */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Design</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.arms}×{design.periods}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {design.sequences} sequences
              </div>
            </div>
            
            {/* Washout */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">Washout</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.duration.washoutDays} days
              </div>
              <div className="text-[10px] text-muted-foreground">
                ≥5 half-lives
              </div>
            </div>
            
            {/* Conditions */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Conditions</span>
              </div>
              <div className="flex gap-1">
                {design.conditions.fasting && (
                  <Badge variant="secondary" className="text-[10px]">Fasting</Badge>
                )}
                {design.conditions.fed && (
                  <Badge variant="secondary" className="text-[10px]">Fed</Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Sampling Schedule */}
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">PK Sampling Schedule</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {design.sampling.schedule.map((time, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 rounded bg-muted text-xs font-mono"
                >
                  {time}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              {design.sampling.totalSamples} samples per subject • {design.sampling.rationale}
            </div>
          </div>
          
          {/* Acceptance Criteria */}
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Acceptance Criteria</span>
            </div>
            <div className="text-sm font-medium text-green-800 dark:text-green-300">
              {design.acceptanceCriteria.criterion}
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 mt-1">
              {design.acceptanceCriteria.margin}
            </div>
          </div>
          
          {/* Warnings */}
          {design.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Considerations</span>
              </div>
              <ul className="space-y-1">
                {design.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Regulatory Basis */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Regulatory Basis</span>
            </div>
            <ul className="space-y-1">
              {design.regulatoryBasis.map((ref, i) => (
                <li key={i} className="text-[11px] text-blue-700 dark:text-blue-400">
                  {ref}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
            <div className="text-[10px] text-muted-foreground">
              Generated based on FDA BE guidance • {isKnownHVD(compoundName) ? 'HVD detected' : ''} {isKnownNTI(compoundName) ? 'NTI detected' : ''}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs h-8"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1.5" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1.5" />
                    Copy Summary
                  </>
                )}
              </Button>
              {onAcceptDesign && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAcceptDesign(design)}
                  className="text-xs h-8 bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Use This Design
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
