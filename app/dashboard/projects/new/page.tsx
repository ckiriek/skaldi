'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FieldAutocomplete } from '@/components/forms/field-autocomplete'
import { SmartPrefill } from '@/components/forms/SmartPrefill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { normalizeFormulation } from '@/lib/engine/formulation'
import { FormulationDebugPanel } from '@/components/formulation/FormulationDebugPanel'
import { FormulationDisplay } from '@/components/formulation/FormulationDisplay'
// KnowledgeGraphButton removed - now auto-fetches
import { SmartField } from '@/components/knowledge-ui/SmartField'
import { EndpointSmartField, SafetySmartField } from '@/components/smart-fields'
import type { ParsedFormulation } from '@/lib/engine/formulation/types'
import type { EndpointMetadata } from '@/components/smart-fields'

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
    primary_endpoint_metadata: null as EndpointMetadata | null,
    // Generic-specific fields
    rld_brand_name: '',
    // Formulation details (from SmartPrefill)
    dosage_form: '',
    route: '',
    strength: '',
    // New clinical parameters (Step 6)
    visit_schedule: '',
    safety_monitoring: [] as string[],
    secondary_endpoints: [] as string[], // Changed to array for multi-select
    analysis_populations: '',
    // Phase 7: New study design fields
    comparator_type: 'placebo' as 'placebo' | 'active' | 'none',
    comparator_name: '',
    number_of_arms: '2',
    randomization_ratio: '1:1',
    target_sample_size: '',
    rescue_allowed: 'yes' as 'yes' | 'no' | 'conditional',
    rescue_criteria: '',
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
        primary_endpoint_metadata: formData.primary_endpoint_metadata,
        // Formulation details
        dosage_form: formData.dosage_form || undefined,
        route: formData.route || undefined,
        strength: formData.strength || undefined,
        // New clinical parameters
        visit_schedule: formData.visit_schedule || undefined,
        safety_monitoring: formData.safety_monitoring.length > 0 ? formData.safety_monitoring.join(', ') : undefined,
        secondary_endpoints: formData.secondary_endpoints.length > 0 ? formData.secondary_endpoints.join('; ') : undefined,
        analysis_populations: formData.analysis_populations || undefined,
        // Phase 7: New study design fields
        comparator_type: formData.comparator_type,
        comparator_name: formData.comparator_type !== 'none' ? formData.comparator_name : undefined,
        number_of_arms: parseInt(formData.number_of_arms),
        randomization_ratio: formData.randomization_ratio,
        target_sample_size: formData.target_sample_size ? parseInt(formData.target_sample_size) : undefined,
        rescue_allowed: formData.rescue_allowed,
        rescue_criteria: formData.rescue_allowed !== 'no' ? formData.rescue_criteria : undefined,
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
    <div className="max-w-6xl mx-auto space-y-3 px-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new clinical trial project</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the basic information about your clinical trial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {submitError && (
              <Alert variant="error">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            {/* Product Type Selection - Improved UX */}
            <div className="space-y-1.5">
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
                    'flex items-start gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-all',
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
                    'flex items-start gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-all',
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
                    'flex items-start gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-all',
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

            {/* Phase - MOVED UP, required for phase-aware suggestions */}
            <div className="space-y-1.5">
              <div>
                <Label className="text-sm font-medium">Clinical Phase *</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Determines relevant endpoints and study design suggestions</p>
              </div>
              <RadioGroup
                value={formData.phase}
                onValueChange={(value) => setFormData({ ...formData, phase: value })}
                className="grid grid-cols-4 gap-2"
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border px-3 py-2 cursor-pointer transition-all text-center',
                    formData.phase === 'Phase 1'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="Phase 1" id="phase1" className="sr-only" />
                  <Label htmlFor="phase1" className="cursor-pointer text-center">
                    <div className="font-medium text-sm">Phase 1</div>
                    <p className="text-[10px] text-muted-foreground">Safety, PK</p>
                  </Label>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border px-3 py-2 cursor-pointer transition-all text-center',
                    formData.phase === 'Phase 2'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="Phase 2" id="phase2" className="sr-only" />
                  <Label htmlFor="phase2" className="cursor-pointer text-center">
                    <div className="font-medium text-sm">Phase 2</div>
                    <p className="text-[10px] text-muted-foreground">Efficacy signal</p>
                  </Label>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border px-3 py-2 cursor-pointer transition-all text-center',
                    formData.phase === 'Phase 3'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="Phase 3" id="phase3" className="sr-only" />
                  <Label htmlFor="phase3" className="cursor-pointer text-center">
                    <div className="font-medium text-sm">Phase 3</div>
                    <p className="text-[10px] text-muted-foreground">Confirmatory</p>
                  </Label>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border px-3 py-2 cursor-pointer transition-all text-center',
                    formData.phase === 'Phase 4'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  <RadioGroupItem value="Phase 4" id="phase4" className="sr-only" />
                  <Label htmlFor="phase4" className="cursor-pointer text-center">
                    <div className="font-medium text-sm">Phase 4</div>
                    <p className="text-[10px] text-muted-foreground">Post-market</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground mb-1">
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
              
              {/* Smart Prefill - Auto-suggestions based on compound and phase */}
              <SmartPrefill
                compoundName={parsedFormulation?.apiName || formData.compound_name}
                productType={formData.product_type}
                phase={formData.phase}
                selectedIndication={formData.indication}
                selectedPrimaryEndpoint={formData.primary_endpoint}
                selectedSecondaryEndpoints={formData.secondary_endpoints}
                selectedRld={formData.rld_brand_name}
                selectedSafetyTerms={formData.safety_monitoring}
                selectedFormulation={{
                  dosageForm: formData.dosage_form,
                  route: formData.route,
                  strength: formData.strength
                }}
                onSelectRld={(brand) => setFormData({ ...formData, rld_brand_name: brand })}
                onSelectIndication={(indication) => setFormData({ ...formData, indication })}
                onSelectEndpoint={(endpoint) => setFormData({ ...formData, primary_endpoint: endpoint })}
                onSelectSecondaryEndpoint={(endpoints) => setFormData({ ...formData, secondary_endpoints: endpoints })}
                onSelectSafety={(terms) => setFormData({ ...formData, safety_monitoring: terms })}
                onSelectFormulation={(form) => setFormData({ 
                  ...formData, 
                  dosage_form: form.dosageForm,
                  route: form.route,
                  strength: form.strength
                })}
              />
            </div>

            {/* Sponsor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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

            {/* RLD Brand Name - shown only for Generic if not selected via SmartPrefill */}
            {formData.product_type === 'generic' && !formData.rld_brand_name && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  Or select from suggestions above
                </p>
              </div>
            )}
            
            {/* Show selected RLD */}
            {formData.product_type === 'generic' && formData.rld_brand_name && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">RLD Brand:</Label>
                <span className="font-medium text-primary">{formData.rld_brand_name}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFormData({ ...formData, rld_brand_name: '' })}
                  className="text-xs text-muted-foreground"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Indication - Smart Field */}
            <SmartField
              label="Indication"
              value={formData.indication}
              onChange={(value) => setFormData({ ...formData, indication: value })}
              type="indication"
              placeholder="e.g., Type 2 Diabetes Mellitus"
              required
              autoFetch={!!formData.compound_name}
              userContext={{
                compound: parsedFormulation?.apiName || formData.compound_name,
                phase: formData.phase,
                productType: formData.product_type
              }}
              onSuggestionSelect={(suggestion) => {
                console.log('✅ Selected indication:', suggestion)
              }}
            />

            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Design Type
                  </label>
                  <select
                    value={formData.design_type}
                    onChange={(e) => setFormData({ ...formData, design_type: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                  >
                    <option value="randomized">Randomized</option>
                    <option value="non-randomized">Non-randomized</option>
                    <option value="observational">Observational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Blinding
                  </label>
                  <select
                    value={formData.blinding}
                    onChange={(e) => setFormData({ ...formData, blinding: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                  >
                    <option value="open-label">Open Label</option>
                    <option value="single-blind">Single Blind</option>
                    <option value="double-blind">Double Blind</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Number of Arms
                  </label>
                  <select
                    value={formData.number_of_arms}
                    onChange={(e) => setFormData({ ...formData, number_of_arms: e.target.value, arms: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                  >
                    <option value="1">1 (Single arm)</option>
                    <option value="2">2 (Two arms)</option>
                    <option value="3">3 (Three arms)</option>
                    <option value="4">4 (Four arms)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Duration (weeks)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration_weeks}
                    onChange={(e) => setFormData({ ...formData, duration_weeks: e.target.value })}
                  />
                </div>

                {/* Comparator Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Comparator Type
                  </label>
                  <select
                    value={formData.comparator_type}
                    onChange={(e) => setFormData({ ...formData, comparator_type: e.target.value as 'placebo' | 'active' | 'none' })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                  >
                    <option value="placebo">Placebo</option>
                    <option value="active">Active Comparator</option>
                    <option value="none">No Comparator (Single Arm)</option>
                  </select>
                </div>

                {/* Comparator Name - shown only for active comparator */}
                {formData.comparator_type === 'active' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Comparator Name
                    </label>
                    <Input
                      value={formData.comparator_name}
                      onChange={(e) => setFormData({ ...formData, comparator_name: e.target.value })}
                      placeholder="e.g., Metformin 500mg"
                    />
                  </div>
                )}

                {/* Randomization Ratio */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Randomization Ratio
                  </label>
                  <select
                    value={formData.randomization_ratio}
                    onChange={(e) => setFormData({ ...formData, randomization_ratio: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                  >
                    <option value="1:1">1:1</option>
                    <option value="2:1">2:1</option>
                    <option value="3:1">3:1</option>
                    <option value="1:1:1">1:1:1 (3 arms)</option>
                    <option value="2:1:1">2:1:1 (3 arms)</option>
                    <option value="1:1:1:1">1:1:1:1 (4 arms)</option>
                  </select>
                </div>

                {/* Target Sample Size */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Target Sample Size
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.target_sample_size}
                    onChange={(e) => setFormData({ ...formData, target_sample_size: e.target.value })}
                    placeholder="e.g., 300"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total planned enrollment
                  </p>
                </div>
              </div>

              {/* Rescue Therapy Section */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Rescue Therapy</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Rescue Allowed
                    </label>
                    <select
                      value={formData.rescue_allowed}
                      onChange={(e) => setFormData({ ...formData, rescue_allowed: e.target.value as 'yes' | 'no' | 'conditional' })}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="conditional">Conditional</option>
                    </select>
                  </div>
                  
                  {formData.rescue_allowed !== 'no' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Rescue Criteria
                      </label>
                      <Input
                        value={formData.rescue_criteria}
                        onChange={(e) => setFormData({ ...formData, rescue_criteria: e.target.value })}
                        placeholder="e.g., FPG > 270 mg/dL"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <EndpointSmartField
                  indication={formData.indication}
                  phase={formData.phase}
                  value={formData.primary_endpoint}
                  onChange={(value, metadata) => {
                    setFormData({ 
                      ...formData, 
                      primary_endpoint: value,
                      primary_endpoint_metadata: metadata || null
                    })
                  }}
                  label="Primary Endpoint"
                  placeholder="e.g., Change from baseline in HbA1c at Week 24"
                  required
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Secondary Endpoints
                </label>
                <Input
                  value={formData.secondary_endpoints.join('; ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    secondary_endpoints: e.target.value.split(';').map(s => s.trim()).filter(s => s) 
                  })}
                  placeholder="e.g., Change in fasting glucose; lipid profile; body weight"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: List secondary endpoints separated by semicolons
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-1">
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
                <SafetySmartField
                  phase={formData.phase}
                  indication={formData.indication}
                  value={formData.safety_monitoring}
                  onChange={(value) => setFormData({ ...formData, safety_monitoring: value })}
                  label="Safety Monitoring"
                  placeholder="Select safety procedures"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-1">
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
