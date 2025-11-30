/**
 * CSR (Clinical Study Report) Section-Specific Prompts
 * 
 * Professional prompts for CSR sections
 * Based on ICH E3 structure
 * 
 * Version: 1.0.0
 * Date: 2025-11-24
 */

export const CSR_SECTION_PROMPTS = {
  csr_synopsis: `
Generate the CSR Synopsis section.

Target: {{targetTokens}} tokens (~{{targetPages}} pages)

Complete summary of study design, conduct, results, and conclusions.
Follow ICH E3 synopsis structure.

Use ALL trial data provided.
Include actual statistics with CI and p-values.
`,

  csr_efficacy: `
Generate the CSR Efficacy Results section.

Target: {{targetTokens}} tokens (~{{targetPages}} pages)

Comprehensive efficacy analysis:
- Primary endpoint results with full statistics
- All secondary endpoints
- Subgroup analyses
- Sensitivity analyses

Use tables extensively.
Report LSM, differences, 95% CI, p-values.
`,

  csr_safety: `
Generate the CSR Safety Results section.

Target: {{targetTokens}} tokens (~{{targetPages}} pages)

Comprehensive safety analysis:
- Exposure summary
- Adverse events (all, serious, leading to D/C)
- Deaths with narratives
- Laboratory abnormalities
- Vital signs and ECG

Use MedDRA terminology.
Provide frequencies with denominators.
`
}

export default CSR_SECTION_PROMPTS
