/**
 * Statistical Test Selector
 * Automatically select appropriate statistical test based on endpoint characteristics
 */

import type { StatisticalTest, HypothesisType, TestSidedness } from '../types'
import type { EndpointClassification } from './endpoint_types'

export interface TestSelection {
  primaryTest: StatisticalTest
  alternativeTests: StatisticalTest[]
  rationale: string
  assumptions: string[]
  requiresCovariates: boolean
  requiresStratification: boolean
}

/**
 * Select statistical test based on endpoint classification
 */
export function selectStatisticalTest(
  classification: EndpointClassification,
  hypothesis: HypothesisType = 'superiority',
  sided: TestSidedness = 'two_sided'
): TestSelection {
  const { dataType, pairing, numberOfGroups, covariates, stratificationFactors, distributionAssumption } = classification

  // CONTINUOUS ENDPOINTS
  if (dataType === 'continuous') {
    // Paired data
    if (pairing === 'paired') {
      if (distributionAssumption === 'normal') {
        return {
          primaryTest: 'paired_t_test',
          alternativeTests: ['wilcoxon_signed_rank'],
          rationale: 'Paired continuous data with normal distribution',
          assumptions: [
            'Paired observations',
            'Normal distribution of differences',
            'Independent pairs',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      } else {
        return {
          primaryTest: 'wilcoxon_signed_rank',
          alternativeTests: ['paired_t_test'],
          rationale: 'Paired continuous data with non-normal distribution',
          assumptions: [
            'Paired observations',
            'Symmetric distribution of differences',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      }
    }

    // Repeated measures
    if (pairing === 'repeated_measures') {
      if (covariates.length > 0) {
        return {
          primaryTest: 'mmrm',
          alternativeTests: ['glmm'],
          rationale: 'Repeated measures with covariates (MMRM preferred)',
          assumptions: [
            'Repeated measures over time',
            'Missing at random (MAR)',
            'Unstructured covariance',
          ],
          requiresCovariates: true,
          requiresStratification: false,
        }
      } else {
        return {
          primaryTest: 'anova',
          alternativeTests: ['mmrm'],
          rationale: 'Repeated measures without covariates',
          assumptions: [
            'Repeated measures over time',
            'Sphericity assumption',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      }
    }

    // Independent groups
    if (numberOfGroups === 2) {
      // With covariates → ANCOVA
      if (covariates.length > 0) {
        return {
          primaryTest: 'ancova',
          alternativeTests: ['t_test', 'mann_whitney'],
          rationale: 'Two independent groups with covariates (ANCOVA increases power)',
          assumptions: [
            'Normal distribution within groups',
            'Homogeneity of variance',
            'Linear relationship between covariate and outcome',
            'Homogeneity of regression slopes',
          ],
          requiresCovariates: true,
          requiresStratification: stratificationFactors.length > 0,
        }
      }

      // Without covariates → t-test
      if (distributionAssumption === 'normal') {
        return {
          primaryTest: 't_test',
          alternativeTests: ['mann_whitney', 'ancova'],
          rationale: 'Two independent groups with normal distribution',
          assumptions: [
            'Normal distribution within groups',
            'Independent observations',
            'Homogeneity of variance (or Welch correction)',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      } else {
        return {
          primaryTest: 'mann_whitney',
          alternativeTests: ['t_test'],
          rationale: 'Two independent groups with non-normal distribution',
          assumptions: [
            'Independent observations',
            'Ordinal or continuous data',
            'Similar distribution shapes',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      }
    }

    // More than 2 groups
    if (numberOfGroups > 2) {
      if (covariates.length > 0) {
        return {
          primaryTest: 'ancova',
          alternativeTests: ['anova', 'kruskal_wallis'],
          rationale: 'Multiple groups with covariates',
          assumptions: [
            'Normal distribution within groups',
            'Homogeneity of variance',
            'Linear relationship with covariates',
          ],
          requiresCovariates: true,
          requiresStratification: false,
        }
      } else if (distributionAssumption === 'normal') {
        return {
          primaryTest: 'anova',
          alternativeTests: ['kruskal_wallis'],
          rationale: 'Multiple independent groups with normal distribution',
          assumptions: [
            'Normal distribution within groups',
            'Homogeneity of variance',
            'Independent observations',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      } else {
        return {
          primaryTest: 'kruskal_wallis',
          alternativeTests: ['anova'],
          rationale: 'Multiple independent groups with non-normal distribution',
          assumptions: [
            'Independent observations',
            'Ordinal or continuous data',
          ],
          requiresCovariates: false,
          requiresStratification: false,
        }
      }
    }
  }

  // BINARY ENDPOINTS
  if (dataType === 'binary') {
    // Paired data
    if (pairing === 'paired') {
      return {
        primaryTest: 'mcnemar',
        alternativeTests: [],
        rationale: 'Paired binary data (before/after or matched pairs)',
        assumptions: [
          'Paired observations',
          'Binary outcome',
          'Discordant pairs',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }

    // Independent groups
    if (numberOfGroups === 2) {
      // With stratification → CMH
      if (stratificationFactors.length > 0) {
        return {
          primaryTest: 'cochran_mantel_haenszel',
          alternativeTests: ['chi_square', 'fisher_exact'],
          rationale: 'Two groups with stratification factors (CMH controls for confounding)',
          assumptions: [
            'Independent observations',
            'Binary outcome',
            'Stratification factors defined',
            'Homogeneous odds ratios across strata',
          ],
          requiresCovariates: false,
          requiresStratification: true,
        }
      }

      // Without stratification → Chi-square or Fisher
      return {
        primaryTest: 'chi_square',
        alternativeTests: ['fisher_exact', 'cochran_mantel_haenszel'],
        rationale: 'Two independent groups with binary outcome',
        assumptions: [
          'Independent observations',
          'Binary outcome',
          'Expected cell counts ≥ 5 (use Fisher exact if violated)',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }

    // More than 2 groups
    return {
      primaryTest: 'chi_square',
      alternativeTests: ['fisher_exact'],
      rationale: 'Multiple groups with binary outcome',
      assumptions: [
        'Independent observations',
        'Binary outcome',
        'Expected cell counts ≥ 5',
      ],
      requiresCovariates: false,
      requiresStratification: false,
    }
  }

  // TIME-TO-EVENT ENDPOINTS
  if (dataType === 'time_to_event') {
    if (numberOfGroups === 2) {
      // With covariates → Cox regression
      if (covariates.length > 0 || stratificationFactors.length > 0) {
        return {
          primaryTest: 'cox_regression',
          alternativeTests: ['log_rank'],
          rationale: 'Time-to-event with covariates (Cox regression adjusts for confounders)',
          assumptions: [
            'Proportional hazards',
            'Independent censoring',
            'Non-informative censoring',
            'Covariates measured at baseline',
          ],
          requiresCovariates: true,
          requiresStratification: stratificationFactors.length > 0,
        }
      }

      // Without covariates → Log-rank
      return {
        primaryTest: 'log_rank',
        alternativeTests: ['cox_regression', 'kaplan_meier'],
        rationale: 'Time-to-event comparison between two groups',
        assumptions: [
          'Proportional hazards',
          'Independent censoring',
          'Non-informative censoring',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }

    // More than 2 groups
    if (covariates.length > 0) {
      return {
        primaryTest: 'cox_regression',
        alternativeTests: ['log_rank'],
        rationale: 'Multiple groups with time-to-event and covariates',
        assumptions: [
          'Proportional hazards',
          'Independent censoring',
        ],
        requiresCovariates: true,
        requiresStratification: false,
      }
    } else {
      return {
        primaryTest: 'log_rank',
        alternativeTests: ['cox_regression'],
        rationale: 'Multiple groups with time-to-event',
        assumptions: [
          'Proportional hazards',
          'Independent censoring',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }
  }

  // ORDINAL ENDPOINTS
  if (dataType === 'ordinal') {
    if (pairing === 'paired') {
      return {
        primaryTest: 'wilcoxon_signed_rank',
        alternativeTests: [],
        rationale: 'Paired ordinal data',
        assumptions: [
          'Paired observations',
          'Ordinal scale',
          'Symmetric distribution of differences',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }

    if (numberOfGroups === 2) {
      return {
        primaryTest: 'mann_whitney',
        alternativeTests: ['wilcoxon_signed_rank'],
        rationale: 'Two independent groups with ordinal outcome',
        assumptions: [
          'Independent observations',
          'Ordinal scale',
          'Similar distribution shapes',
        ],
        requiresCovariates: false,
        requiresStratification: false,
      }
    }

    return {
      primaryTest: 'kruskal_wallis',
      alternativeTests: [],
      rationale: 'Multiple groups with ordinal outcome',
      assumptions: [
        'Independent observations',
        'Ordinal scale',
      ],
      requiresCovariates: false,
      requiresStratification: false,
    }
  }

  // COUNT ENDPOINTS
  if (dataType === 'count') {
    return {
      primaryTest: 'glmm',
      alternativeTests: [],
      rationale: 'Count data (negative binomial or Poisson regression)',
      assumptions: [
        'Count outcome',
        'Overdispersion handled (negative binomial)',
        'Independent observations',
      ],
      requiresCovariates: covariates.length > 0,
      requiresStratification: false,
    }
  }

  // Default fallback
  throw new Error(`Unable to select test for endpoint type: ${dataType}`)
}

/**
 * Validate test selection against endpoint
 */
export function validateTestSelection(
  test: StatisticalTest,
  classification: EndpointClassification
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Check if test is appropriate for data type
  const continuousTests: StatisticalTest[] = ['t_test', 'anova', 'ancova', 'paired_t_test', 'mmrm']
  const binaryTests: StatisticalTest[] = ['chi_square', 'fisher_exact', 'mcnemar', 'cochran_mantel_haenszel']
  const survivalTests: StatisticalTest[] = ['log_rank', 'cox_regression', 'kaplan_meier']
  const ordinalTests: StatisticalTest[] = ['mann_whitney', 'kruskal_wallis', 'wilcoxon_signed_rank']

  if (classification.dataType === 'continuous' && !continuousTests.includes(test)) {
    warnings.push(`${test} may not be appropriate for continuous endpoints`)
  }

  if (classification.dataType === 'binary' && !binaryTests.includes(test)) {
    warnings.push(`${test} may not be appropriate for binary endpoints`)
  }

  if (classification.dataType === 'time_to_event' && !survivalTests.includes(test)) {
    warnings.push(`${test} may not be appropriate for time-to-event endpoints`)
  }

  if (classification.dataType === 'ordinal' && !ordinalTests.includes(test)) {
    warnings.push(`${test} may not be appropriate for ordinal endpoints`)
  }

  // Check pairing
  if (classification.pairing === 'paired' && !['paired_t_test', 'wilcoxon_signed_rank', 'mcnemar'].includes(test)) {
    warnings.push('Paired data requires paired test (paired t-test, Wilcoxon signed-rank, or McNemar)')
  }

  // Check covariates
  if (classification.covariates.length > 0 && !['ancova', 'cox_regression', 'mmrm', 'glmm'].includes(test)) {
    warnings.push('Covariates specified but test does not adjust for them')
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}
