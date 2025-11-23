'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FieldAutocomplete } from '@/components/forms/field-autocomplete'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { normalizeFormulation } from '@/lib/engine/formulation'
import { FormulationDebugPanel } from '@/components/formulation/FormulationDebugPanel'
import { FormulationDisplay } from '@/components/formulation/FormulationDisplay'
import { KnowledgeGraphButton } from '@/components/knowledge/KnowledgeGraphButton'
import type { ParsedFormulation } from '@/lib/engine/formulation/types'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [suggestedIndications, setSuggestedIndications] = useState<Array<{indication: string, source: string, count?: number}>>([])
  const [parsedFormulation, setParsedFormulation] = useState<ParsedFormulation | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    product_type: 'generic' as 'innovator' | 'generic' | 'hybrid', // Changed default to 'generic'
    compound_name: '',
    sponsor: '',
    phase: 'Phase 2',
    indication: '',
    countries: '',
    design_type: 'randomized',
    blinding: 'double-blind',
    arms: '2',
    duration_weeks: '24',
    primary_endpoint: '',
    // Generic-specific fields
    rld_brand_name: '',
    // New clinical parameters (Step 6)
    visit_schedule: '',
    safety_monitoring: '',
    secondary_endpoints: '',
    analysis_populations: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setLoading(true)

    try {
      const countriesArray = formData.countries
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0)

      const designJson = {
        design_type: formData.design_type,
        blinding: formData.blinding,
        arms: parseInt(formData.arms),
        duration_weeks: parseInt(formData.duration_weeks),
        primary_endpoint: formData.primary_endpoint,
        // New clinical parameters
        visit_schedule: formData.visit_schedule || undefined,
        safety_monitoring: formData.safety_monitoring || undefined,
        secondary_endpoints: formData.secondary_endpoints || undefined,
        analysis_populations: formData.analysis_populations || undefined,
      }

      // Call Intake Agent API
      const response = await fetch('/api/v1/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          product_type: formData.product_type,
          compound_name: formData.compound_name,
          sponsor: formData.sponsor,
          phase: formData.phase,
          indication: formData.indication,
          countries: countriesArray,
          design_json: designJson,
          rld_brand_name: formData.product_type === 'generic' ? formData.rld_brand_name : undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setSubmitError(result.errors?.join('\n') || 'Failed to create project')
        return
      }

      router.push(`/dashboard/projects/${result.project_id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      setSubmitError('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Parse formulation when compound name changes
  useEffect(() => {
    if (!formData.compound_name || formData.compound_name.length < 3) {
      setParsedFormulation(null)
      return
    }

    try {
      const parsed = normalizeFormulation(formData.compound_name)
      setParsedFormulation(parsed)
      console.log('🔬 Parsed formulation:', parsed)
    } catch (error) {
      console.error('❌ Failed to parse formulation:', error)
      setParsedFormulation(null)
    }
  }, [formData.compound_name])

  // Auto-fetch indications when compound changes
  useEffect(() => {
    const fetchIndications = async () => {
      if (!formData.compound_name || formData.compound_name.length < 3) {
        setSuggestedIndications([])
        return
      }

      try {
        console.log('🔍 Fetching indications for:', formData.compound_name)
        const response = await fetch(`/api/v1/drugs/indications?drug=${encodeURIComponent(formData.compound_name)}`)
        const data = await response.json()

        if (data.success && data.data) {
          console.log('✅ Got', data.data.length, 'suggested indications')
          setSuggestedIndications(data.data)
        }
      } catch (error) {
        console.error('❌ Failed to fetch indications:', error)
        setSuggestedIndications([])
      }
    }

    // Debounce
    const timer = setTimeout(fetchIndications, 500)
    return () => clearTimeout(timer)
  }, [formData.compound_name])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new clinical trial project</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the basic information about your clinical trial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {submitError && (
              <Alert variant="error">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            {/* Product Type Selection - Improved UX */}
            <div className="space-y-2.5">
              <div>
                <Label className="text-sm font-medium">Product Type *</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Most common: Generic Drug (auto-fetches RLD data)</p>
              </div>
              <RadioGroup
                value={formData.product_type}
                onValueChange={(value: 'innovator' | 'generic' | 'hybrid') => 
                  setFormData({ ...formData, product_type: value })
                }
                className="gap-2"
              >
                {/* Generic Drug - Most common, now first */}
                <div
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all',
                    formData.product_type === 'generic'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="generic" id="generic" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="generic" className="cursor-pointer">
                      <div className="font-medium text-sm text-foreground">Generic Drug</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Based on approved RLD · Auto-fetches FDA/Orange Book data
                      </p>
                    </Label>
                  </div>
                </div>

                {/* New Drug (Innovator) */}
                <div
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all',
                    formData.product_type === 'innovator'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="innovator" id="innovator" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="innovator" className="cursor-pointer">
                      <div className="font-medium text-sm text-foreground">New Drug (Innovator)</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Full development with sponsor data
                      </p>
                    </Label>
                  </div>
                </div>

                {/* Other (Combination/Biosimilar) */}
                <div
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all',
                    formData.product_type === 'hybrid'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="hybrid" id="hybrid" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hybrid" className="cursor-pointer">
                      <div className="font-medium text-sm text-foreground">Other (Combination/Biosimilar)</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Modified release, fixed-dose combination, or biosimilar
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Project Title *
              </label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., AST-101 Phase 2 Trial"
              />
            </div>

            {/* Compound Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Compound / Drug Name *
              </label>
              <FieldAutocomplete
                value={formData.compound_name}
                onChange={(value) => setFormData({ ...formData, compound_name: value })}
                endpoint="/api/v1/autocomplete/compounds"
                placeholder={formData.product_type === 'generic' ? 'e.g., Metformin Hydrochloride' : 'e.g., AST-256'}
                required
              />
              {formData.product_type === 'generic' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  💡 Use the generic name (e.g., Metformin Hydrochloride, not Glucophage)
                </p>
              )}
              
              {/* Formulation Display */}
              {parsedFormulation && (
                <div className="mt-2">
                  <FormulationDisplay parsed={parsedFormulation} compact />
                </div>
              )}
              
              {/* Knowledge Graph Button */}
              {formData.compound_name && formData.compound_name.length >= 3 && (
                <div className="mt-3">
                  <KnowledgeGraphButton 
                    inn={parsedFormulation?.apiName || formData.compound_name}
                    onDataFetched={(data) => {
                      // Auto-populate indication if empty
                      if (!formData.indication && data.indications.length > 0) {
                        setFormData({ 
                          ...formData, 
                          indication: data.indications[0].indication 
                        })
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sponsor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sponsor Organization *
              </label>
              <Input
                required
                value={formData.sponsor}
                onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                placeholder="e.g., Biogen Inc., Pfizer, Novartis"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The organization sponsoring this clinical trial
              </p>
            </div>

            {/* Generic-specific: RLD Information */}
            {formData.product_type === 'generic' && (
              <Card className="bg-blue-50/60 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Reference Listed Drug (RLD) Information</CardTitle>
                  <CardDescription>
                    We'll automatically fetch nonclinical and clinical data from FDA/EMA databases
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      RLD Brand Name *
                    </label>
                    <FieldAutocomplete
                      value={formData.rld_brand_name}
                      onChange={(value) => setFormData({ ...formData, rld_brand_name: value })}
                      endpoint="/api/v1/autocomplete/rld?type=brand"
                      placeholder="e.g., GLUCOPHAGE"
                      required={formData.product_type === 'generic'}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      We'll automatically fetch Application Number and TE Code from FDA Orange Book
                    </p>
                  </div>
                  <p className="text-xs text-blue-800">
                    🤖 Auto-enrichment enabled: We'll fetch pharmacology, PK/PD, safety data, and references from FDA labels,
                    EMA EPAR, and PubMed.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Phase */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phase *
              </label>
              <select
                required
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
                <option value="Phase 4">Phase 4</option>
              </select>
            </div>

            {/* Indication */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Indication *
              </label>
              <FieldAutocomplete
                value={formData.indication}
                onChange={(value) => setFormData({ ...formData, indication: value })}
                endpoint="/api/v1/autocomplete/indications"
                placeholder="e.g., Type 2 Diabetes"
                required
              />
              
              {/* Show suggested indications from selected drug */}
              {suggestedIndications.length > 0 && !formData.indication && (
                <div className="mt-3 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    💡 Common indications for {formData.compound_name}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedIndications.slice(0, 5).map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData({ ...formData, indication: item.indication })}
                        className="px-3 py-1.5 text-sm bg-white border border-blue-300 rounded-md hover:bg-blue-100 hover:border-blue-400 transition-colors"
                      >
                        {item.indication.length > 60 ? item.indication.substring(0, 60) + '...' : item.indication}
                        {item.count && <span className="ml-1 text-xs text-blue-600">({item.count})</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Click to select, or type your own indication above
                  </p>
                </div>
              )}
            </div>

            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Countries
              </label>
              <FieldAutocomplete
                value={formData.countries}
                onChange={(value) => setFormData({ ...formData, countries: value })}
                endpoint="/api/v1/autocomplete/countries"
                placeholder="e.g., USA, Germany, Japan (comma-separated)"
                minChars={2}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                💡 Type to search, select multiple countries separated by commas
              </p>
            </div>

            {/* Study Design */}
            <div className="pt-4">
              <h3 className="text-base font-medium text-foreground mb-3">Study Design</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Design Type
                  </label>
                  <select
                    value={formData.design_type}
                    onChange={(e) => setFormData({ ...formData, design_type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="randomized">Randomized</option>
                    <option value="non-randomized">Non-randomized</option>
                    <option value="observational">Observational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Blinding
                  </label>
                  <select
                    value={formData.blinding}
                    onChange={(e) => setFormData({ ...formData, blinding: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="open-label">Open Label</option>
                    <option value="single-blind">Single Blind</option>
                    <option value="double-blind">Double Blind</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Number of Arms
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.arms}
                    onChange={(e) => setFormData({ ...formData, arms: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Duration (weeks)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration_weeks}
                    onChange={(e) => setFormData({ ...formData, duration_weeks: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Primary Endpoint
                </label>
                <Input
                  value={formData.primary_endpoint}
                  onChange={(e) => setFormData({ ...formData, primary_endpoint: e.target.value })}
                  placeholder="e.g., Change in HbA1c from baseline at Week 24"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  💡 If left empty, we'll automatically use the most common endpoint from similar clinical trials for your indication.
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Secondary Endpoints
                </label>
                <Input
                  value={formData.secondary_endpoints}
                  onChange={(e) => setFormData({ ...formData, secondary_endpoints: e.target.value })}
                  placeholder="e.g., Change in fasting glucose, lipid profile"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: List secondary endpoints separated by semicolons
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Visit Schedule
                </label>
                <Input
                  value={formData.visit_schedule}
                  onChange={(e) => setFormData({ ...formData, visit_schedule: e.target.value })}
                  placeholder="e.g., Screening, Baseline, Week 4, Week 12, Week 24"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: Key visit timepoints (comma-separated)
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Safety Monitoring
                </label>
                <Input
                  value={formData.safety_monitoring}
                  onChange={(e) => setFormData({ ...formData, safety_monitoring: e.target.value })}
                  placeholder="e.g., Vital signs, ECG, laboratory tests"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: Key safety assessments (comma-separated)
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Analysis Populations
                </label>
                <Input
                  value={formData.analysis_populations}
                  onChange={(e) => setFormData({ ...formData, analysis_populations: e.target.value })}
                  placeholder="e.g., ITT, PP, Safety"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: Analysis sets (comma-separated). Defaults to ITT, PP, Safety if empty.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      
      {/* Formulation Debug Panel (DEV mode only) */}
      <FormulationDebugPanel parsed={parsedFormulation} />
    </div>
  )
}
