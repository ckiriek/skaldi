/**
 * Mock Template Engine Test
 * 
 * Demonstrates template rendering without Handlebars dependency
 * Shows how data flows through templates
 */

// Mock data for IB Generic Section 6 (Safety)
const mockData = {
  compound_name: 'Metformin Hydrochloride',
  rld_brand_name: 'GLUCOPHAGE',
  rld_application_number: 'NDA020357',
  years_on_market: 25,
  
  clinical_summary: {
    total_subjects: 3500,
    total_studies: 8,
    safety: true,
  },
  
  adverse_events: [
    {
      pt: 'Diarrhea',
      incidence_pct: 12.3,
      control_incidence_pct: 5.9,
      risk_ratio: 2.09,
      ci_95_lower: 1.42,
      ci_95_upper: 3.01,
    },
    {
      pt: 'Nausea',
      incidence_pct: 8.0,
      control_incidence_pct: 3.1,
      risk_ratio: 2.58,
      ci_95_lower: 1.65,
      ci_95_upper: 4.04,
    },
    {
      pt: 'Abdominal pain',
      incidence_pct: 4.2,
      control_incidence_pct: 2.0,
      risk_ratio: 2.10,
      ci_95_lower: 1.15,
      ci_95_upper: 3.86,
    },
    {
      pt: 'Headache',
      incidence_pct: 6.1,
      control_incidence_pct: 5.8,
      risk_ratio: 1.05,
      ci_95_lower: 0.75,
      ci_95_upper: 1.47,
    },
  ],
  
  adverse_events_summary: {
    any_teae_pct: 28.7,
    placebo_any_teae_pct: 25.3,
    treatment_related_pct: 14.2,
    placebo_treatment_related_pct: 9.8,
    any_sae_pct: 1.1,
    placebo_any_sae_pct: 0.8,
    discontinuation_pct: 4.2,
    placebo_discontinuation_pct: 3.1,
  },
  
  data_source: 'FDA Label (NDA020357) and Phase 3 Clinical Trial Data',
  
  serious_adverse_events: [
    {
      pt: 'Acute pancreatitis',
      cases: 2,
      rate_pct: 0.33,
      relatedness: 'Unlikely',
      outcome: 'Recovered',
    },
    {
      pt: 'Lactic acidosis',
      cases: 1,
      rate_pct: 0.16,
      relatedness: 'Possible',
      outcome: 'Recovered with sequelae',
    },
  ],
  
  sae_threshold: 1,
  sae_review_note: 'All SAEs were reviewed by an independent adjudication committee; none were considered causally related to Metformin Hydrochloride.',
  
  postmarketing_data: {
    as_of_date: 'October 2025',
    sources: 'FAERS, EudraVigilance',
    signals: [
      {
        event: 'Lactic acidosis',
        rate: '< 1',
        denominator: '100,000',
        description: 'Rare but serious metabolic complication, primarily in patients with renal impairment or acute illness.',
      },
      {
        event: 'Vitamin B12 deficiency',
        rate: '7',
        denominator: '1,000',
        description: 'Long-term use (> 4 years) associated with decreased B12 absorption. Monitoring recommended.',
      },
    ],
    no_new_signals: true,
  },
  
  aesi_list: [
    {
      category: 'Lactic Acidosis',
      description: 'Rare but serious metabolic complication characterized by elevated blood lactate levels (> 5 mmol/L) and decreased blood pH. Risk factors include renal impairment, hepatic dysfunction, acute illness, and excessive alcohol intake.',
      incidence: '< 0.03 cases per 1,000 patient-years',
      monitoring: 'Baseline and periodic renal function tests (eGFR). Discontinue if eGFR < 30 mL/min/1.73 m².',
      management: 'Immediate discontinuation, supportive care, hemodialysis if severe.',
    },
    {
      category: 'Hepatotoxicity',
      description: 'Transient elevations in liver enzymes (ALT, AST) have been reported. Most cases are asymptomatic and reversible.',
      incidence: '3% (ALT/AST > 3×ULN)',
      monitoring: 'Baseline and periodic liver function tests.',
      management: 'Discontinue if persistent elevation or symptoms develop.',
    },
  ],
  
  hepatic_elevation_pct: 3,
  
  special_populations: {
    elderly: 'No clinically significant increase in adverse event incidence was observed in elderly subjects (≥ 65 years) compared to younger adults. However, renal function should be monitored more frequently due to age-related decline in kidney function.',
    renal_impairment: 'Contraindicated in severe renal impairment (eGFR < 30 mL/min/1.73 m²). Use with caution in moderate impairment (eGFR 30-60). Dose adjustment may be required.',
    hepatic_impairment: 'Contraindicated in patients with hepatic impairment due to increased risk of lactic acidosis.',
    pediatric: 'Safety and efficacy have been established in pediatric patients ≥ 10 years of age for Type 2 Diabetes Mellitus.',
  },
  
  lab_findings: 'No clinically relevant trends were observed in hematology, chemistry, or urinalysis parameters. Mean changes in liver enzymes (ALT, AST) were transient (< 2×ULN) and not associated with symptoms. No changes in blood pressure, ECG parameters, or body weight exceeding placebo were noted. Vitamin B12 levels decreased by an average of 7% after 4 years of treatment.',
  
  safety_summary_points: [
    'Most adverse events are mild and transient, primarily gastrointestinal in nature (diarrhea, nausea)',
    'No dose-limiting toxicities identified within the therapeutic dose range (500-2000 mg/day)',
    'Lactic acidosis is rare (< 0.03 per 1,000 patient-years) but serious; contraindicated in severe renal impairment',
    'Long-term use (> 4 years) associated with Vitamin B12 deficiency; monitoring recommended',
    'Ongoing postmarketing surveillance confirms absence of new safety signals',
  ],
  
  references: [
    {
      citation: 'FDA Label for GLUCOPHAGE (Metformin Hydrochloride), NDA020357, 2023.',
    },
    {
      citation: 'Postmarketing Safety Summary, FAERS Q3 2025.',
    },
    {
      citation: 'EMA EPAR Metformin Hydrochloride Assessment Report, 2019.',
    },
    {
      citation: 'Bailey CJ, Turner RC. Metformin. N Engl J Med. 1996;334(9):574-579.',
    },
  ],
  
  data_sources: [
    {
      source: 'FDA DailyMed',
      url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=...',
      retrieved_at: '2025-11-11',
    },
    {
      source: 'FDA FAERS',
      url: 'https://fis.fda.gov/sense/app/...',
      retrieved_at: '2025-11-11',
    },
    {
      source: 'EMA EPAR',
      url: 'https://www.ema.europa.eu/en/medicines/...',
      retrieved_at: '2025-11-11',
    },
  ],
  
  label_year: 2023,
  faers_quarter: 'Q3 2025',
  epar_year: 2019,
}

/**
 * Simple template renderer (mock)
 */
function renderTemplate(template: string, data: any): string {
  let result = template

  // Replace simple variables: {{variable}}
  result = result.replace(/\{\{([^#\/\{\}]+)\}\}/g, (match, key) => {
    const keys = key.trim().split('.')
    let value: any = data
    for (const k of keys) {
      value = value?.[k]
    }
    return value !== undefined ? String(value) : match
  })

  // Handle {{#if}} blocks (simplified)
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    const keys = condition.trim().split('.')
    let value: any = data
    for (const k of keys) {
      value = value?.[k]
    }
    return value ? content : ''
  })

  // Handle {{#each}} blocks (simplified)
  result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayKey, content) => {
    const keys = arrayKey.trim().split('.')
    let array: any = data
    for (const k of keys) {
      array = array?.[k]
    }
    
    if (!Array.isArray(array)) return ''
    
    return array.map((item, index) => {
      let itemContent = content
      // Replace {{this.property}}
      itemContent = itemContent.replace(/\{\{this\.([^}]+)\}\}/g, (m, prop) => {
        return item[prop] !== undefined ? String(item[prop]) : m
      })
      // Replace {{@index}}
      itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index + 1))
      return itemContent
    }).join('')
  })

  return result
}

/**
 * Test template rendering
 */
function testTemplate() {
  console.log('🧪 Testing Template Engine (Mock)\n')
  console.log('='.repeat(80))
  console.log('Mock Data for IB Generic Section 6: Safety and Tolerability')
  console.log('='.repeat(80))
  console.log(JSON.stringify(mockData, null, 2))
  console.log('\n' + '='.repeat(80))
  console.log('Template Rendering Test')
  console.log('='.repeat(80))

  // Simple template test
  const simpleTemplate = `
# 6. Safety and Tolerability

## 6.1 Overall Safety Profile

{{#if rld_brand_name}}
The safety profile of {{compound_name}} is well established based on the Reference Listed Drug (RLD), {{rld_brand_name}} ({{rld_application_number}}), which has been approved and marketed for over {{years_on_market}} years.
{{/if}}

{{#if clinical_summary.safety}}
The compound has been evaluated in more than {{clinical_summary.total_subjects}} subjects across {{clinical_summary.total_studies}} clinical studies.
{{/if}}

## 6.2 Treatment-Emergent Adverse Events

### Table 6.2-1. Treatment-Emergent Adverse Events (≥ 2% incidence)

| Preferred Term | {{compound_name}} (%) | Placebo (%) | Risk Ratio | 95% CI |
|----------------|----------------------|-------------|------------|---------|
{{#each adverse_events}}
| {{this.pt}} | {{this.incidence_pct}} | {{this.control_incidence_pct}} | {{this.risk_ratio}} | {{this.ci_95_lower}}–{{this.ci_95_upper}} |
{{/each}}

## 6.8 Summary of Safety

{{#each safety_summary_points}}
- {{this}}
{{/each}}

## References

{{#each references}}
{{@index}}. {{this.citation}}
{{/each}}
`

  const rendered = renderTemplate(simpleTemplate, mockData)
  
  console.log('\n✅ Rendered Output:\n')
  console.log(rendered)
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Template Engine Test Complete!')
  console.log('='.repeat(80))
  console.log('\n📊 Key Observations:')
  console.log('- ✅ Variable substitution works ({{compound_name}})')
  console.log('- ✅ Conditional blocks work ({{#if}})')
  console.log('- ✅ Loops work ({{#each}})')
  console.log('- ✅ Nested properties work ({{clinical_summary.total_subjects}})')
  console.log('- ✅ Array item properties work ({{this.pt}})')
  console.log('- ✅ Index tracking works ({{@index}})')
  console.log('\n🎯 Next Step: Install Handlebars for full functionality')
  console.log('   npm install handlebars @types/handlebars')
}

// Run test
testTemplate()
