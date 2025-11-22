/**
 * Statistical Methods Section Generator
 * Generate detailed statistical methodology for SAP
 */

import type { Endpoint, StatisticalMethod, StatisticalTest } from '../types'
import type { MappingResult } from '../endpoint_mapping/mapping_rules'

/**
 * Generate statistical methods section for an endpoint
 */
export function generateMethodDescription(
  endpoint: Endpoint,
  method: StatisticalMethod,
  sampleSize?: number
): string {
  let description = `### ${endpoint.name}\n\n`
  
  description += `**Endpoint Type**: ${endpoint.type}\n`
  description += `**Data Type**: ${endpoint.dataType}\n`
  description += `**Hypothesis**: ${endpoint.hypothesis}\n`
  description += `**Significance Level**: ${endpoint.sided === 'two_sided' ? 'Two-sided α = 0.05' : 'One-sided α = 0.025'}\n\n`

  description += `**Statistical Method**: ${method.description}\n\n`

  // Test-specific details
  description += generateTestDetails(method.test, endpoint, method)

  // Covariates
  if (method.covariates && method.covariates.length > 0) {
    description += `\n**Covariates**:\n`
    method.covariates.forEach(cov => {
      description += `- ${cov}\n`
    })
  }

  // Stratification
  if (method.stratificationFactors && method.stratificationFactors.length > 0) {
    description += `\n**Stratification Factors**:\n`
    method.stratificationFactors.forEach(factor => {
      description += `- ${factor}\n`
    })
  }

  // Assumptions
  description += `\n**Assumptions**:\n`
  method.assumptions.forEach(assumption => {
    description += `- ${assumption}\n`
  })

  // Sample size (if provided)
  if (sampleSize) {
    description += `\n**Sample Size**: ${sampleSize} subjects (based on power analysis)\n`
  }

  description += '\n'

  return description
}

/**
 * Generate test-specific details
 */
function generateTestDetails(
  test: StatisticalTest,
  endpoint: Endpoint,
  method: StatisticalMethod
): string {
  let details = ''

  switch (test) {
    case 't_test':
      details = `
**Analysis Model**: Two-sample t-test

The primary analysis will compare the mean change from baseline between treatment groups using a two-sample t-test. The null hypothesis is that there is no difference in mean change between groups.

**Model Specification**:
- Null Hypothesis (H₀): μ_treatment - μ_control = 0
- Alternative Hypothesis (H₁): μ_treatment - μ_control ≠ 0
- Test Statistic: t = (x̄₁ - x̄₂) / SE
- Degrees of Freedom: Welch-Satterthwaite approximation (unequal variances assumed)

**Effect Estimate**: Mean difference with 95% confidence interval
`
      break

    case 'ancova':
      details = `
**Analysis Model**: Analysis of Covariance (ANCOVA)

The primary analysis will use an ANCOVA model with treatment as the main factor and baseline value as a covariate. This approach increases statistical power by reducing residual variance.

**Model Specification**:
\`\`\`
Y = β₀ + β₁(Treatment) + β₂(Baseline) + ε
\`\`\`

Where:
- Y = Post-treatment outcome
- Treatment = Treatment group indicator
- Baseline = Baseline value of the outcome variable
- ε = Random error term (assumed normally distributed)

**Primary Estimand**: Least squares mean difference between treatment groups, adjusted for baseline

**Effect Estimate**: Adjusted mean difference with 95% confidence interval
`
      break

    case 'anova':
      details = `
**Analysis Model**: Analysis of Variance (ANOVA)

A one-way ANOVA will be used to compare means across treatment groups.

**Model Specification**:
- Null Hypothesis (H₀): μ₁ = μ₂ = ... = μₖ
- Alternative Hypothesis (H₁): At least one mean differs
- Test Statistic: F = MS_between / MS_within

**Post-hoc Comparisons**: If the overall F-test is significant (p < 0.05), pairwise comparisons will be conducted using Tukey's HSD method to control family-wise error rate.
`
      break

    case 'chi_square':
      details = `
**Analysis Model**: Chi-square test of independence

The primary analysis will compare the proportion of responders between treatment groups using Pearson's chi-square test.

**Model Specification**:
- Null Hypothesis (H₀): p_treatment = p_control
- Alternative Hypothesis (H₁): p_treatment ≠ p_control
- Test Statistic: χ² = Σ[(O - E)² / E]

**Effect Estimate**: Risk difference with 95% confidence interval (Wilson score method)

**Additional Estimates**:
- Risk Ratio with 95% CI
- Odds Ratio with 95% CI
- Number Needed to Treat (NNT)
`
      break

    case 'fisher_exact':
      details = `
**Analysis Model**: Fisher's Exact Test

Due to expected small cell counts, Fisher's exact test will be used instead of chi-square test.

**Model Specification**:
- Exact p-value calculated using hypergeometric distribution
- No large-sample approximation required

**Effect Estimate**: Risk difference with exact 95% confidence interval
`
      break

    case 'cochran_mantel_haenszel':
      details = `
**Analysis Model**: Cochran-Mantel-Haenszel (CMH) Test

The CMH test will be used to compare proportions while controlling for stratification factors.

**Model Specification**:
- Stratified analysis controlling for: ${method.stratificationFactors?.join(', ') || 'stratification factors'}
- Null Hypothesis (H₀): Common odds ratio = 1 across all strata
- Test Statistic: CMH χ²

**Effect Estimate**: Mantel-Haenszel common odds ratio with 95% confidence interval

**Assumption**: Homogeneous odds ratios across strata (tested using Breslow-Day test)
`
      break

    case 'log_rank':
      details = `
**Analysis Model**: Log-rank Test

The primary analysis will compare time-to-event distributions between treatment groups using the log-rank test.

**Model Specification**:
- Null Hypothesis (H₀): S₁(t) = S₂(t) for all t (survival functions are equal)
- Alternative Hypothesis (H₁): S₁(t) ≠ S₂(t) for some t
- Test Statistic: Log-rank χ²

**Survival Estimates**:
- Kaplan-Meier survival curves for each treatment group
- Median survival time with 95% CI
- Survival rates at key time points (e.g., 6, 12, 24 months)

**Effect Estimate**: Hazard ratio from Cox proportional hazards model with 95% CI
`
      break

    case 'cox_regression':
      details = `
**Analysis Model**: Cox Proportional Hazards Regression

A Cox regression model will be used to estimate the hazard ratio while adjusting for baseline covariates.

**Model Specification**:
\`\`\`
h(t) = h₀(t) × exp(β₁×Treatment + β₂×Covariate₁ + ... + βₖ×Covariateₖ)
\`\`\`

Where:
- h(t) = Hazard function at time t
- h₀(t) = Baseline hazard function
- Treatment = Treatment group indicator
- Covariates = ${method.covariates?.join(', ') || 'baseline covariates'}

**Primary Estimand**: Hazard ratio (HR) for treatment effect, adjusted for covariates

**Proportional Hazards Assumption**: Will be assessed using:
- Schoenfeld residuals test
- Log-log survival plots
- Time-dependent covariates

**Effect Estimate**: Adjusted hazard ratio with 95% confidence interval
`
      break

    case 'mann_whitney':
      details = `
**Analysis Model**: Mann-Whitney U Test (Wilcoxon Rank-Sum Test)

A non-parametric test will be used due to non-normal distribution or ordinal data.

**Model Specification**:
- Null Hypothesis (H₀): Distributions are identical
- Alternative Hypothesis (H₁): Distributions differ in location
- Test Statistic: U = min(U₁, U₂)

**Effect Estimate**: Hodges-Lehmann estimate of median difference with 95% confidence interval

**Interpretation**: The test assesses whether one group tends to have larger values than the other.
`
      break

    case 'wilcoxon_signed_rank':
      details = `
**Analysis Model**: Wilcoxon Signed-Rank Test

A non-parametric paired test for within-subject comparisons.

**Model Specification**:
- Null Hypothesis (H₀): Median difference = 0
- Alternative Hypothesis (H₁): Median difference ≠ 0
- Test Statistic: Sum of signed ranks

**Effect Estimate**: Median difference with 95% confidence interval
`
      break

    case 'mmrm':
      details = `
**Analysis Model**: Mixed Model for Repeated Measures (MMRM)

An MMRM will be used to analyze repeated measurements over time, accounting for within-subject correlation.

**Model Specification**:
\`\`\`
Y_ij = β₀ + β₁(Treatment_i) + β₂(Time_j) + β₃(Treatment_i × Time_j) + β₄(Baseline_i) + b_i + ε_ij
\`\`\`

Where:
- Y_ij = Outcome for subject i at time j
- Treatment_i = Treatment group for subject i
- Time_j = Visit time point
- b_i = Random subject effect
- ε_ij = Residual error

**Covariance Structure**: Unstructured covariance matrix (allows different variances and correlations at each time point)

**Primary Estimand**: Treatment difference at the primary time point, adjusted for baseline

**Missing Data**: MMRM uses all available data under Missing at Random (MAR) assumption

**Effect Estimate**: Least squares mean difference at primary endpoint with 95% CI
`
      break

    case 'mcnemar':
      details = `
**Analysis Model**: McNemar's Test

A paired test for binary outcomes (e.g., before/after or matched pairs).

**Model Specification**:
- Null Hypothesis (H₀): Marginal probabilities are equal
- Test Statistic: χ² = (b - c)² / (b + c), where b and c are discordant pairs

**Effect Estimate**: Odds ratio for paired data with 95% confidence interval
`
      break

    case 'kruskal_wallis':
      details = `
**Analysis Model**: Kruskal-Wallis Test

A non-parametric test for comparing multiple groups.

**Model Specification**:
- Null Hypothesis (H₀): All groups have identical distributions
- Alternative Hypothesis (H₁): At least one group differs
- Test Statistic: H = (12/N(N+1)) × Σ(R²ᵢ/nᵢ) - 3(N+1)

**Post-hoc Comparisons**: If significant (p < 0.05), pairwise comparisons using Dunn's test with Bonferroni correction
`
      break

    case 'glmm':
      details = `
**Analysis Model**: Generalized Linear Mixed Model (GLMM)

A GLMM will be used for count or non-normal data with repeated measures.

**Model Specification**:
- Distribution: ${endpoint.dataType === 'count' ? 'Negative Binomial (to handle overdispersion)' : 'Appropriate family based on data type'}
- Link Function: Log link
- Random Effects: Subject-specific intercepts

**Primary Estimand**: Rate ratio or odds ratio (depending on outcome type)

**Effect Estimate**: Exponentiated coefficient with 95% confidence interval
`
      break

    default:
      details = `**Statistical Test**: ${test.replace(/_/g, ' ')}\n\nDetailed methodology will be specified in the final SAP.`
  }

  return details
}

/**
 * Generate general statistical principles section
 */
export function generateGeneralPrinciples(): string {
  return `
## General Statistical Principles

### Significance Level
- All statistical tests will be two-sided (unless otherwise specified) with a significance level of α = 0.05
- P-values will be reported to three decimal places (p < 0.001 for very small values)
- Confidence intervals will be reported at the 95% level

### Missing Data
- The primary analysis will use all available data
- Missing data patterns will be examined and reported
- Sensitivity analyses will be conducted to assess the impact of missing data (see Section on Missing Data Handling)

### Multiplicity
- Multiplicity adjustments will be applied as specified in the protocol
- The primary endpoint will be tested at the full α = 0.05 level
- Secondary endpoints will be tested using a hierarchical testing procedure (if applicable)

### Interim Analyses
- Interim analyses will be conducted as specified in the protocol
- Alpha spending function: O'Brien-Fleming (if applicable)
- Final analysis will account for interim looks

### Software
- All statistical analyses will be performed using validated statistical software:
  - SAS® Version 9.4 or later (SAS Institute Inc., Cary, NC, USA)
  - R Version 4.0 or later (The R Foundation for Statistical Computing)
- Analysis programs will be validated and documented

### Data Presentation
- Continuous variables: Mean, SD, median, Q1, Q3, min, max, n
- Categorical variables: Frequency, percentage
- Time-to-event: Kaplan-Meier estimates, median with 95% CI, hazard ratios
- All tables and figures will follow ICH E3 guidelines
`
}

/**
 * Generate sample size justification section
 */
export function generateSampleSizeJustification(params: {
  totalSampleSize: number
  perArm: number[]
  power: number
  alpha: number
  effectSize: number
  dropoutRate?: number
  method: string
  assumptions: string[]
}): string {
  const { totalSampleSize, perArm, power, alpha, effectSize, dropoutRate, method, assumptions } = params

  let section = `
## Sample Size Justification

### Sample Size Calculation
- **Total Sample Size**: ${totalSampleSize} subjects
- **Per Arm**: ${perArm.join(' / ')} subjects
- **Power**: ${(power * 100).toFixed(0)}%
- **Significance Level**: ${alpha} (two-sided)
- **Effect Size**: ${effectSize}
- **Statistical Method**: ${method}
`

  if (dropoutRate) {
    section += `- **Expected Dropout Rate**: ${(dropoutRate * 100).toFixed(0)}%\n`
  }

  section += `
### Assumptions
`
  assumptions.forEach(assumption => {
    section += `- ${assumption}\n`
  })

  section += `
### Justification
The sample size was calculated to provide ${(power * 100).toFixed(0)}% power to detect a clinically meaningful difference of ${effectSize} between treatment groups at a two-sided significance level of ${alpha}. This calculation assumes ${assumptions[0]}.

${dropoutRate ? `The sample size has been inflated by ${(dropoutRate * 100).toFixed(0)}% to account for expected dropouts and withdrawals.` : ''}

### References
- ICH E9: Statistical Principles for Clinical Trials
- Chow, S. C., Shao, J., & Wang, H. (2008). Sample Size Calculations in Clinical Research
`

  return section
}
