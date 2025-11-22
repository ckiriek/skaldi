/**
 * SAP Section Generators
 * Generate complete SAP sections for missing data, interim analysis, subgroup analysis
 */

import type { MissingDataStrategy, InterimAnalysis, SubgroupAnalysis } from '../types'

/**
 * Generate Missing Data Handling section
 */
export function generateMissingDataSection(strategy: MissingDataStrategy): string {
  let section = `
## Missing Data Handling

### General Approach
Missing data are inevitable in clinical trials and will be handled according to ICH E9 principles. The primary analysis will use all available data under the assumption that data are Missing at Random (MAR).

### Primary Analysis Method
**Method**: ${strategy.primaryMethod}

${getMissingDataMethodDescription(strategy.primaryMethod)}

### Assumptions
`
  
  strategy.assumptions.forEach(assumption => {
    section += `- ${assumption}\n`
  })

  section += `
### Justification
${strategy.justification}

### Sensitivity Analyses
To assess the robustness of the primary analysis to missing data assumptions, the following sensitivity analyses will be conducted:

`

  strategy.sensitivityAnalyses.forEach((method, index) => {
    section += `${index + 1}. **${method}**: ${getMissingDataMethodDescription(method)}\n\n`
  })

  section += `
### Missing Data Reporting
- Extent and patterns of missing data will be summarized by treatment group
- Reasons for missing data will be tabulated
- Comparison of baseline characteristics between subjects with and without missing data
- Assessment of whether missing data are Missing Completely at Random (MCAR), MAR, or Missing Not at Random (MNAR)

### References
- ICH E9: Statistical Principles for Clinical Trials, Section 5.2
- ICH E9(R1): Estimands and Sensitivity Analysis
- National Research Council (2010). The Prevention and Treatment of Missing Data in Clinical Trials
`

  return section
}

/**
 * Get description for missing data method
 */
function getMissingDataMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    complete_case: 'Complete case analysis: Only subjects with complete data for the endpoint will be included. This approach is valid if data are MCAR but may introduce bias if data are MAR or MNAR.',
    
    LOCF: 'Last Observation Carried Forward: Missing values will be imputed using the last available post-baseline observation. This is a conservative approach but may introduce bias.',
    
    BOCF: 'Baseline Observation Carried Forward: Missing values will be imputed using the baseline observation. This is highly conservative and assumes no treatment effect for subjects with missing data.',
    
    WOCF: 'Worst Observation Carried Forward: Missing values will be imputed using the worst post-baseline observation. This is an extremely conservative approach.',
    
    MMRM: 'Mixed Model for Repeated Measures: All available data will be used in a likelihood-based mixed model. This approach is valid under MAR assumption and does not require imputation. The model will include treatment, visit, treatment-by-visit interaction, and baseline as covariates, with an unstructured covariance matrix.',
    
    MI: 'Multiple Imputation: Missing values will be imputed multiple times (typically 20-100 imputations) using a model based on observed data. Results will be combined using Rubin\'s rules. This approach is valid under MAR assumption.',
    
    PMM: 'Pattern Mixture Model: Different models will be fitted for different patterns of missingness. This approach allows for exploration of MNAR scenarios.',
  }

  return descriptions[method] || 'Detailed methodology to be specified.'
}

/**
 * Generate Interim Analysis section
 */
export function generateInterimAnalysisSection(interim: InterimAnalysis): string {
  if (!interim.planned) {
    return `
## Interim Analysis

No interim analyses for efficacy are planned for this study. The study will continue until the planned sample size is reached and all subjects have completed the study or discontinued.

Safety data will be reviewed on an ongoing basis by the Data Safety Monitoring Board (DSMB) or Safety Review Committee.
`
  }

  let section = `
## Interim Analysis

### Overview
${interim.numberOfAnalyses} interim analysis/analyses will be conducted during the study to allow for early stopping for efficacy or futility.

### Timing
`

  interim.timingCriteria.forEach((criterion, index) => {
    section += `- **Interim Analysis ${index + 1}**: ${criterion}\n`
  })

  section += `
### Statistical Methodology
**Stopping Boundary Method**: ${interim.stoppingBoundary}

`

  if (interim.stoppingBoundary === 'obrien_fleming') {
    section += `
The O'Brien-Fleming boundary will be used, which is conservative at early interim analyses and approaches the conventional significance level at the final analysis.

**Alpha Spending Function**: O'Brien-Fleming type
- Early interim analyses: Very stringent boundaries (difficult to stop early)
- Later analyses: Less stringent boundaries
- Final analysis: Approaches α = 0.05

**Advantages**:
- Preserves overall Type I error rate
- Allows flexibility in timing of interim analyses
- Conservative early stopping reduces risk of false positive results
`
  } else if (interim.stoppingBoundary === 'pocock') {
    section += `
The Pocock boundary will be used, which maintains constant significance levels across all interim analyses.

**Alpha Spending Function**: Pocock type
- All interim analyses use the same significance level
- More liberal early stopping compared to O'Brien-Fleming

**Advantages**:
- Simple to implement
- Equal weight to all interim analyses
`
  }

  section += `
### Stopping Rules

**Efficacy Stopping**: The study may be stopped early for overwhelming efficacy if:
- The primary endpoint shows statistically significant benefit at the interim analysis boundary
- The DSMB recommends stopping based on benefit-risk assessment

**Futility Stopping**: The study may be stopped early for futility if:
- Conditional power falls below ${interim.futilityBoundary || '20%'}
- The DSMB determines that continuing the study is unlikely to demonstrate efficacy

### Data Safety Monitoring Board (DSMB)
- The DSMB will review unblinded interim data
- The DSMB will make recommendations regarding study continuation, modification, or termination
- Study team and investigators will remain blinded to interim results

### Alpha Allocation
Total alpha = 0.05 (two-sided) will be allocated across ${interim.numberOfAnalyses + 1} analyses (${interim.numberOfAnalyses} interim + 1 final) using the ${interim.stoppingBoundary} spending function.

### Impact on Final Analysis
- The final analysis will account for interim looks
- Adjusted confidence intervals will be provided
- P-values will be adjusted for multiple looks

### References
- Jennison, C., & Turnbull, B. W. (1999). Group Sequential Methods with Applications to Clinical Trials
- ICH E9: Statistical Principles for Clinical Trials, Section 4.5
`

  return section
}

/**
 * Generate Subgroup Analysis section
 */
export function generateSubgroupAnalysisSection(subgroups: SubgroupAnalysis[]): string {
  if (subgroups.length === 0) {
    return `
## Subgroup Analysis

No pre-specified subgroup analyses are planned. Treatment effect will be assessed in the overall population only.
`
  }

  let section = `
## Subgroup Analysis

### Overview
Subgroup analyses will be conducted to explore the consistency of treatment effect across different patient subgroups. These analyses are exploratory and hypothesis-generating.

### Pre-specified Subgroups
`

  subgroups.forEach((subgroup, index) => {
    section += `
#### ${index + 1}. ${subgroup.name}

**Variable**: ${subgroup.variable}
**Categories**: ${subgroup.categories.join(', ')}
**Rationale**: ${subgroup.rationale}
**Analysis Method**: ${subgroup.method || 'Treatment-by-subgroup interaction test'}
`
  })

  section += `
### Statistical Methodology

**Interaction Testing**:
- Treatment-by-subgroup interaction will be tested for each subgroup
- Interaction p-value < 0.10 will be considered potentially meaningful
- Forest plots will display treatment effects within each subgroup

**Analysis Approach**:
1. Estimate treatment effect within each subgroup category
2. Test for treatment-by-subgroup interaction
3. Present results graphically using forest plots
4. Interpret with caution due to reduced power in subgroups

### Interpretation Guidelines
- Subgroup analyses are exploratory and not powered for formal hypothesis testing
- Results should be interpreted with caution
- Multiple subgroup analyses increase the risk of false positive findings
- Consistency of treatment effect across subgroups supports generalizability
- Unexpected heterogeneity should be investigated but requires confirmation in future studies

### Multiplicity Considerations
- No formal multiplicity adjustment will be applied to subgroup analyses
- Results will be clearly labeled as exploratory
- P-values will be reported without adjustment
- Clinical and biological plausibility will be considered in interpretation

### Presentation
- Forest plots showing treatment effect (with 95% CI) in each subgroup
- Interaction p-values
- Number of subjects in each subgroup category
- Baseline characteristics by subgroup

### References
- ICH E9: Statistical Principles for Clinical Trials, Section 5.7
- FDA Guidance: Collection of Race and Ethnicity Data in Clinical Trials (2016)
- EMA Guideline on the Investigation of Subgroups in Confirmatory Clinical Trials (2019)
`

  return section
}

/**
 * Generate complete SAP document structure
 */
export function generateSAPStructure(): string {
  return `
# Statistical Analysis Plan (SAP)

## Table of Contents

1. **Introduction**
   1.1 Study Overview
   1.2 Study Objectives
   1.3 Study Design
   1.4 Study Endpoints

2. **General Statistical Considerations**
   2.1 Statistical Software
   2.2 Significance Level and Confidence Intervals
   2.3 Handling of Missing Data
   2.4 Multiplicity Adjustments
   2.5 Interim Analyses

3. **Analysis Populations**
   3.1 Full Analysis Set (FAS)
   3.2 Per-Protocol Set (PPS)
   3.3 Safety Analysis Set (SAF)
   3.4 Other Analysis Sets
   3.5 Analysis Set Assignment Rules

4. **Sample Size and Power**
   4.1 Sample Size Calculation
   4.2 Assumptions
   4.3 Justification

5. **Endpoint Definitions and Derivations**
   5.1 Primary Endpoint
   5.2 Secondary Endpoints
   5.3 Exploratory Endpoints
   5.4 Safety Endpoints

6. **Statistical Methods**
   6.1 Primary Endpoint Analysis
   6.2 Secondary Endpoint Analyses
   6.3 Exploratory Analyses
   6.4 Safety Analyses

7. **Subgroup Analyses**
   7.1 Pre-specified Subgroups
   7.2 Statistical Methodology
   7.3 Interpretation Guidelines

8. **Sensitivity Analyses**
   8.1 Missing Data Sensitivity Analyses
   8.2 Per-Protocol Analysis
   8.3 Other Sensitivity Analyses

9. **Interim Analyses** (if applicable)
   9.1 Timing and Methodology
   9.2 Stopping Rules
   9.3 DSMB Charter

10. **Changes from Protocol**
    10.1 Protocol Amendments
    10.2 SAP Amendments

11. **References**

12. **Appendices**
    12.1 Statistical Formulas
    12.2 SAS/R Code Specifications
    12.3 Table and Figure Shells
`
}
