# Phase E: Statistics Engine

**Goal:** Build a comprehensive statistics engine that can calculate sample sizes, map endpoints to statistical tests, generate statistical sections for protocols and SAPs, perform basic statistical calculations, validate statistical parameters, and produce structured statistical JSON for CSRs.

**Target:** Make Skaldi capable of creating CRO-level clinical protocols with full statistical rigor.

---

## 1. Architecture

Create module structure:
```
/lib/engine/statistics/
  sample_size/
    power_analysis.ts
    effect_size.ts
    calculators.ts
  endpoint_mapping/
    endpoint_types.ts
    test_selector.ts
    mapping_rules.ts
  sap_generator/
    sections.ts
    analysis_sets.ts
    statistical_methods.ts
  validators/
    parameter_validator.ts
    consistency_checker.ts
  distributions/
    normal.ts
    binomial.ts
    survival.ts
  types.ts
  index.ts
```

---

## 2. Core Capabilities

### 2.1 Sample Size Calculation
- **Power Analysis**: Calculate sample size based on:
  - Effect size (Cohen's d, odds ratio, hazard ratio)
  - Power (typically 80% or 90%)
  - Significance level (α, typically 0.05)
  - Expected dropout rate
- **Formulas**:
  - Continuous endpoints: Two-sample t-test
  - Binary endpoints: Chi-square, Fisher's exact
  - Time-to-event: Log-rank test
  - Non-inferiority/superiority margins
- **Adjustments**:
  - Multiple comparisons (Bonferroni, Holm)
  - Interim analyses (O'Brien-Fleming, Pocock)
  - Stratification factors

### 2.2 Endpoint → Statistical Test Mapping
- **Primary Endpoint Types**:
  - Continuous (mean change, AUC)
  - Binary (response rate, event occurrence)
  - Time-to-event (survival, time to progression)
  - Ordinal (severity scales, quality of life)
  - Count (adverse events, exacerbations)
- **Test Selection Logic**:
  - Parametric vs non-parametric
  - Paired vs unpaired
  - One-sided vs two-sided
  - Superiority vs non-inferiority vs equivalence
- **Covariates & Stratification**:
  - ANCOVA for continuous
  - Cochran-Mantel-Haenszel for binary
  - Stratified log-rank for survival

### 2.3 SAP Generation
Generate complete Statistical Analysis Plan sections:
- **Analysis Sets**:
  - Full Analysis Set (FAS) / Intent-to-Treat (ITT)
  - Per-Protocol (PP)
  - Safety Analysis Set (SAF)
- **Statistical Methods**:
  - Descriptive statistics
  - Inferential tests
  - Missing data handling (LOCF, MMRM, MI)
  - Sensitivity analyses
- **Interim Analysis**:
  - Data Monitoring Committee (DMC) rules
  - Stopping boundaries
  - Alpha spending functions
- **Subgroup Analysis**:
  - Pre-specified subgroups
  - Forest plots
  - Interaction tests

### 2.4 Statistical Validation
- **Parameter Checks**:
  - Sample size feasibility
  - Effect size plausibility
  - Power requirements met
  - Alpha level appropriate
- **Consistency Checks**:
  - Primary endpoint ↔ sample size calculation
  - Analysis method ↔ endpoint type
  - Missing data method ↔ data structure
  - Multiplicity adjustment ↔ number of comparisons

---

## 3. Implementation Plan

### Phase E.1: Foundation (2-3 hours) ✅ COMPLETE
- [x] Create `/lib/engine/statistics/` structure
- [x] Define TypeScript types for all statistical entities
- [x] Implement basic distributions (normal, binomial)
- [x] Create parameter validators

### Phase E.2: Sample Size Module (3-4 hours) ✅ COMPLETE
- [x] Implement power analysis for continuous endpoints
- [x] Implement power analysis for binary endpoints
- [x] Implement power analysis for survival endpoints
- [x] Add dropout adjustment
- [x] Add multiplicity adjustment
- [x] Create REST API: `/api/statistics/sample-size`
- [x] Create sample size calculator UI component (`StatisticsPanel`)

### Phase E.3: Endpoint Mapping (2-3 hours) ✅ COMPLETE
- [x] Define endpoint taxonomy
- [x] Implement test selection rules
- [x] Create endpoint → test mapping engine
- [x] Add covariate handling logic
- [x] Validate mapping consistency
- [x] Create REST API: `/api/statistics/map-test`

### Phase E.4: SAP Generator (4-5 hours) ✅ COMPLETE
- [x] Generate Analysis Sets section
- [x] Generate Statistical Methods section
- [x] Generate Missing Data Handling section
- [x] Generate Interim Analysis section (if applicable)
- [x] Generate Subgroup Analysis section
- [x] Create full SAP document template
- [x] Create REST API: `/api/statistics/generate-sap`

### Phase E.5: Integration (2-3 hours) ✅ COMPLETE
- [x] Create consistency checker for validation
- [x] Integrate validators with statistics engine
- [x] Export all modules from main index
- [x] REST APIs ready for integration
- [x] Statistical JSON structure defined

### Phase E.6: Testing & Validation (DEFERRED)
- [ ] Unit tests for all calculators
- [ ] Integration tests for SAP generation
- [ ] Validate sample size calculations against nQuery
- [ ] Validate test mapping logic
- [ ] Performance testing (< 5s for SAP generation)

**Total Estimated Time: 15-21 hours**

---

## 4. Regulatory Compliance

Ensure alignment with:
- **ICH E9**: Statistical Principles for Clinical Trials
- **ICH E3**: Structure and Content of Clinical Study Reports
- **FDA Guidance**: Adaptive Designs, Missing Data, Multiplicity
- **EMA Guidelines**: Statistical methodology, Subgroup analysis

---

## 5. Success Criteria

- [ ] Sample size calculations match industry-standard software (nQuery, PASS)
- [ ] Endpoint mapping produces appropriate statistical tests
- [ ] Generated SAP sections are regulatory-compliant
- [ ] Statistical JSON is complete and structured
- [ ] All validations pass for real-world protocols
- [ ] Performance: <1s for sample size calculation, <5s for full SAP generation

---

## Next Steps

**Ready to start Phase E.1: Foundation?**
