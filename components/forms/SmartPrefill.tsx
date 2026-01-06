/**
 * Smart Prefill Component
 * 
 * Auto-fetches and suggests data based on compound name:
 * - Formulations (dosage form, route, strengths) from Knowledge Graph
 * - RLD brands (for generic drugs)
 * - Indications (from ClinicalTrials.gov)
 * - Primary & Secondary Endpoints (based on indication)
 * - Safety monitoring (from FDA FAERS)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Check, Plus, Pill, Syringe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormulationOption {
  dosageForm: string
  route: string
  strengths: string[]
}

interface SmartPrefillData {
  formulations: FormulationOption[]
  rldBrands: Array<{ brand_name: string; application_number?: string; te_code?: string }>
  indications: Array<{ indication: string; count?: number; confidence?: number }>
  primaryEndpoints: Array<{ endpoint: string; type?: string; count?: number }>
  secondaryEndpoints: Array<{ endpoint: string; count?: number }>
  safetySignals: Array<{ term: string; frequency?: number }>
  isLoading: boolean
  error: string | null
}

interface SmartPrefillProps {
  compoundName: string
  productType: 'generic' | 'innovator' | 'hybrid'
  phase: string
  selectedIndication?: string
  selectedPrimaryEndpoint?: string
  selectedSecondaryEndpoints?: string[]
  onSelectRld?: (brand: string) => void
  onSelectIndication?: (indication: string) => void
  onSelectEndpoint?: (endpoint: string) => void
  onSelectSecondaryEndpoint?: (endpoints: string[]) => void
  onSelectSafety?: (terms: string[]) => void
  onSelectFormulation?: (form: { dosageForm: string; route: string; strength: string }) => void
  selectedRld?: string
  selectedSafetyTerms?: string[]
  selectedFormulation?: { dosageForm?: string; route?: string; strength?: string }
}

// Map phase names to ClinicalTrials.gov phase codes
function mapPhaseToCTGov(phase: string): string {
  const phaseMap: Record<string, string> = {
    'Phase 1': 'PHASE1',
    'Phase 2': 'PHASE2', 
    'Phase 3': 'PHASE3',
    'Phase 4': 'PHASE4'
  }
  return phaseMap[phase] || 'PHASE2'
}

// Standard BE (Bioequivalence) endpoints for generic drugs
const BE_PRIMARY_ENDPOINTS = [
  { endpoint: 'Cmax (Maximum Plasma Concentration)', type: 'pk', count: 100 },
  { endpoint: 'AUC0-t (Area Under Curve to Last Measurable Concentration)', type: 'pk', count: 100 },
  { endpoint: 'AUC0-∞ (Area Under Curve Extrapolated to Infinity)', type: 'pk', count: 95 },
]

const BE_SECONDARY_ENDPOINTS = [
  { endpoint: 'Tmax (Time to Maximum Concentration)', count: 90 },
  { endpoint: 't½ (Elimination Half-life)', count: 85 },
  { endpoint: 'Kel (Elimination Rate Constant)', count: 70 },
  { endpoint: 'MRT (Mean Residence Time)', count: 60 },
]

// Standard endpoints for biosimilar/hybrid products
const BIOSIMILAR_PRIMARY_ENDPOINTS = [
  { endpoint: 'Comparative PK: AUC Ratio (90% CI within 80-125%)', type: 'pk', count: 100 },
  { endpoint: 'Comparative PK: Cmax Ratio (90% CI within 80-125%)', type: 'pk', count: 100 },
  { endpoint: 'Clinical Efficacy Equivalence Margin', type: 'efficacy', count: 90 },
]

const BIOSIMILAR_SECONDARY_ENDPOINTS = [
  { endpoint: 'Immunogenicity: Anti-Drug Antibodies (ADA) Incidence', count: 95 },
  { endpoint: 'Immunogenicity: Neutralizing Antibodies', count: 85 },
  { endpoint: 'Comparative Safety Profile', count: 90 },
  { endpoint: 'PD Biomarker Response (if applicable)', count: 70 },
]

// Get default endpoints based on product type
function getDefaultEndpoints(productType: string, phase: string): {
  primary: Array<{ endpoint: string; type?: string; count?: number }>,
  secondary: Array<{ endpoint: string; count?: number }>
} {
  // Generic drugs: BE endpoints (typically Phase 1)
  if (productType === 'generic') {
    return {
      primary: BE_PRIMARY_ENDPOINTS,
      secondary: BE_SECONDARY_ENDPOINTS
    }
  }
  
  // Biosimilar/Hybrid: Comparative endpoints
  if (productType === 'hybrid') {
    return {
      primary: BIOSIMILAR_PRIMARY_ENDPOINTS,
      secondary: BIOSIMILAR_SECONDARY_ENDPOINTS
    }
  }
  
  // Innovator: No default endpoints, will be fetched from ClinicalTrials.gov
  return { primary: [], secondary: [] }
}

export function SmartPrefill({
  compoundName,
  productType,
  phase,
  selectedIndication,
  selectedPrimaryEndpoint,
  selectedSecondaryEndpoints = [],
  onSelectRld,
  onSelectIndication,
  onSelectEndpoint,
  onSelectSecondaryEndpoint,
  onSelectSafety,
  onSelectFormulation,
  selectedRld,
  selectedSafetyTerms = [],
  selectedFormulation
}: SmartPrefillProps) {
  const [data, setData] = useState<SmartPrefillData>({
    formulations: [],
    rldBrands: [],
    indications: [],
    primaryEndpoints: [],
    secondaryEndpoints: [],
    safetySignals: [],
    isLoading: false,
    error: null
  })

  // Fetch all data when compound or phase changes
  const fetchSmartData = useCallback(async (compound: string, currentPhase: string) => {
    if (!compound || compound.length < 3) {
      setData(prev => ({ 
        ...prev, 
        formulations: [],
        rldBrands: [], 
        indications: [], 
        primaryEndpoints: [],
        secondaryEndpoints: [],
        safetySignals: [], 
        isLoading: false 
      }))
      return
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Map phase to ClinicalTrials.gov format
      const ctPhase = mapPhaseToCTGov(currentPhase)
      
      // Fetch in parallel - pass phase to APIs
      // Generic and Hybrid/Biosimilar need RLD, Innovator does not
      const needsRld = productType === 'generic' || productType === 'hybrid'
      
      // For generic/hybrid: don't filter indications by phase (BE studies are usually Phase 1)
      // For innovator: filter by selected phase
      const indicationsUrl = productType === 'innovator'
        ? `/api/v1/drugs/indications?drug=${encodeURIComponent(compound)}&phase=${ctPhase}`
        : `/api/v1/drugs/indications?drug=${encodeURIComponent(compound)}`
      
      const [indicationsRes, rldRes, kgRes] = await Promise.all([
        fetch(indicationsUrl),
        needsRld
          ? fetch(`/api/v1/autocomplete/rld?type=brand&q=${encodeURIComponent(compound)}`)
          : Promise.resolve(null),
        // Knowledge Graph for formulations, safety, and phase-specific data
        fetch('/api/knowledge/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inn: compound, phase: currentPhase })
        })
      ])

      const indicationsData = await indicationsRes.json()
      const rldData = rldRes ? await rldRes.json() : { success: false }
      const kgData = await kgRes.json()

      // Extract formulations from Knowledge Graph
      let formulations: FormulationOption[] = []
      let safetySignals: Array<{ term: string; frequency?: number }> = []
      
      if (kgData.success && kgData.data) {
        // Formulations - deduplicate by route and show all unique routes
        if (kgData.data.formulations && Array.isArray(kgData.data.formulations)) {
          const seenRoutes = new Set<string>()
          const uniqueFormulations: FormulationOption[] = []
          
          for (const f of kgData.data.formulations) {
            const route = f.routes?.[0]?.toUpperCase()?.trim() || ''
            const dosageForm = f.dosageForms?.[0]?.trim() || ''
            
            // Skip if no route AND no dosage form, or if either is "Unknown" or empty
            if (!route && !dosageForm) continue
            if (route === 'UNKNOWN' || dosageForm.toUpperCase() === 'UNKNOWN') continue
            
            // Skip generic "POWDER" without route context (likely incomplete data)
            if (dosageForm.toUpperCase() === 'POWDER' && !route) continue
            
            // Create unique key based on route + dosageForm
            const key = `${route}:${dosageForm}`
            if (!seenRoutes.has(key)) {
              seenRoutes.add(key)
              uniqueFormulations.push({
                dosageForm: dosageForm || route, // Use route as fallback
                route: route || 'ORAL', // Default to ORAL if missing
                strengths: f.strengths || []
              })
            }
          }
          
          // Sort to prioritize common routes: ORAL, INTRAVENOUS, then others
          const routePriority: Record<string, number> = {
            'ORAL': 1,
            'INTRAVENOUS': 2,
            'INTRAMUSCULAR': 3,
            'SUBCUTANEOUS': 4,
            'OPHTHALMIC': 5,
            'TOPICAL': 6
          }
          uniqueFormulations.sort((a, b) => {
            const priorityA = routePriority[a.route] || 99
            const priorityB = routePriority[b.route] || 99
            return priorityA - priorityB
          })
          
          formulations = uniqueFormulations.slice(0, 6) // Show up to 6 formulations
        }
        // Safety signals
        if (kgData.data.safetySignals) {
          safetySignals = kgData.data.safetySignals.slice(0, 8)
        }
      }

      // Get default endpoints based on product type (BE for generic, biosimilar for hybrid)
      const defaultEndpoints = getDefaultEndpoints(productType, currentPhase)

      setData({
        formulations,
        rldBrands: rldData.success ? rldData.data || [] : [], // Show all RLDs from Orange Book
        indications: indicationsData.success ? indicationsData.data?.slice(0, 12) || [] : [], // Show up to 12 indications
        primaryEndpoints: defaultEndpoints.primary, // Pre-populate with BE/biosimilar endpoints
        secondaryEndpoints: defaultEndpoints.secondary,
        safetySignals,
        isLoading: false,
        error: null
      })

      console.log('✅ Smart prefill data loaded:', {
        formulations: formulations.length,
        rldBrands: rldData.success ? rldData.data?.length : 0,
        indications: indicationsData.success ? indicationsData.data?.length : 0,
        safetySignals: safetySignals.length,
        productType,
        defaultEndpoints: defaultEndpoints.primary.length
      })

    } catch (error) {
      console.error('❌ Smart prefill error:', error)
      setData(prev => ({ ...prev, isLoading: false, error: 'Failed to fetch suggestions' }))
    }
  }, [productType])

  // Fetch endpoints when indication changes - filter by phase
  // For generic/hybrid: keep default BE/biosimilar endpoints
  // For innovator: fetch clinical endpoints from ClinicalTrials.gov
  const fetchEndpoints = useCallback(async (indication: string, currentPhase: string) => {
    if (!indication || indication.length < 3 || !compoundName) return

    // Generic and Hybrid already have default endpoints (BE/biosimilar)
    // Only fetch from ClinicalTrials.gov for innovator products
    if (productType !== 'innovator') {
      console.log(`📊 Using default ${productType} endpoints (BE/biosimilar)`)
      return
    }

    try {
      // Map phase to ClinicalTrials.gov format
      const ctPhase = mapPhaseToCTGov(currentPhase)
      
      console.log(`📊 Fetching innovator endpoints for ${indication} (${ctPhase})`)
      
      // Search ClinicalTrials.gov for common endpoints for this indication and phase
      const response = await fetch(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(indication)}&query.intr=${encodeURIComponent(compoundName)}&filter.phase=${ctPhase}&pageSize=20`
      )
      
      if (response.ok) {
        const ctData = await response.json()
        const primaryCounts = new Map<string, number>()
        const secondaryCounts = new Map<string, number>()

        for (const study of ctData.studies || []) {
          // Primary outcomes
          const primaryOutcomes = study.protocolSection?.outcomesModule?.primaryOutcomes || []
          for (const outcome of primaryOutcomes) {
            if (outcome.measure) {
              primaryCounts.set(outcome.measure, (primaryCounts.get(outcome.measure) || 0) + 1)
            }
          }
          // Secondary outcomes
          const secondaryOutcomes = study.protocolSection?.outcomesModule?.secondaryOutcomes || []
          for (const outcome of secondaryOutcomes) {
            if (outcome.measure) {
              secondaryCounts.set(outcome.measure, (secondaryCounts.get(outcome.measure) || 0) + 1)
            }
          }
        }

        const sortedPrimary = Array.from(primaryCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([endpoint, count]) => ({ endpoint, count }))

        const sortedSecondary = Array.from(secondaryCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([endpoint, count]) => ({ endpoint, count }))

        setData(prev => ({ 
          ...prev, 
          primaryEndpoints: sortedPrimary,
          secondaryEndpoints: sortedSecondary
        }))
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error)
    }
  }, [compoundName, phase, productType])

  // Effect: fetch data when compound or phase changes
  useEffect(() => {
    const timer = setTimeout(() => fetchSmartData(compoundName, phase), 600)
    return () => clearTimeout(timer)
  }, [compoundName, phase, fetchSmartData])

  // Effect: fetch endpoints when indication or phase changes
  useEffect(() => {
    if (selectedIndication) {
      fetchEndpoints(selectedIndication, phase)
    }
  }, [selectedIndication, phase, fetchEndpoints])

  // Don't render if no compound or loading initial
  if (!compoundName || compoundName.length < 3) return null

  const hasAnyData = data.formulations.length > 0 || data.rldBrands.length > 0 || data.indications.length > 0 || data.safetySignals.length > 0

  if (data.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Finding suggestions for {compoundName}...</span>
      </div>
    )
  }

  if (!hasAnyData) return null

  return (
    <div className="space-y-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" />
        <span>Smart suggestions for {compoundName}</span>
      </div>

      {/* Formulations (Dosage Form, Route, Strength) */}
      {data.formulations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Pill className="h-3 w-3" />
            Available Formulations
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.formulations.map((form, i) => {
              const isSelected = selectedFormulation?.dosageForm === form.dosageForm && 
                                 selectedFormulation?.route === form.route
              return (
                <div key={i} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onSelectFormulation?.({ 
                      dosageForm: form.dosageForm, 
                      route: form.route,
                      strength: form.strengths[0] || ''
                    })}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:border-primary hover:bg-primary/5"
                    )}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    <span>{form.dosageForm}</span>
                    <span className="text-[10px] opacity-70">({form.route})</span>
                  </button>
                  {/* Strengths as sub-options */}
                  {isSelected && form.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {form.strengths.slice(0, 4).map((str, si) => (
                        <button
                          key={si}
                          type="button"
                          onClick={() => onSelectFormulation?.({ 
                            dosageForm: form.dosageForm, 
                            route: form.route,
                            strength: str
                          })}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                            selectedFormulation?.strength === str
                              ? "bg-primary/80 text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {str}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* RLD Brands (for Generic and Hybrid/Biosimilar) */}
      {(productType === 'generic' || productType === 'hybrid') && data.rldBrands.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            {productType === 'hybrid' ? 'Reference Product' : 'Reference Listed Drug (RLD)'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.rldBrands.map((rld, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectRld?.(rld.brand_name)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  selectedRld === rld.brand_name
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:border-primary hover:bg-primary/5"
                )}
              >
                {selectedRld === rld.brand_name ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {rld.brand_name}
                {rld.te_code && <span className="text-[10px] opacity-70">({rld.te_code})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indications */}
      {data.indications.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Common Indications</div>
          <div className="flex flex-wrap gap-1.5">
            {data.indications.map((ind, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectIndication?.(ind.indication)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  selectedIndication === ind.indication
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:border-primary hover:bg-primary/5"
                )}
              >
                {selectedIndication === ind.indication ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {ind.indication}
                {ind.count && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{ind.count}</Badge>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary Endpoints - VERTICAL LIST, full text */}
      {data.primaryEndpoints.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            {productType === 'generic' 
              ? 'Bioequivalence (BE) Primary Endpoints'
              : productType === 'hybrid'
                ? 'Biosimilarity Primary Endpoints'
                : `Primary Endpoints${selectedIndication ? ` for ${selectedIndication}` : ''}`
            }
          </div>
          <div className="flex flex-col gap-1">
            {data.primaryEndpoints.map((ep, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectEndpoint?.(ep.endpoint)}
                className={cn(
                  "flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left w-full",
                  selectedPrimaryEndpoint === ep.endpoint
                    ? "bg-green-600 text-white"
                    : "bg-background border border-border hover:border-green-500 hover:bg-green-50"
                )}
              >
                {selectedPrimaryEndpoint === ep.endpoint ? (
                  <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <Plus className="h-3 w-3 mt-0.5 flex-shrink-0" />
                )}
                <span className="flex-1">{ep.endpoint}</span>
                {ep.count && <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">{ep.count}</Badge>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Endpoints - VERTICAL LIST, multi-select */}
      {data.secondaryEndpoints.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            {productType === 'generic' 
              ? 'PK Secondary Parameters'
              : productType === 'hybrid'
                ? 'Biosimilarity Secondary Endpoints'
                : 'Secondary Endpoints (select multiple)'
            }
          </div>
          <div className="flex flex-col gap-1">
            {data.secondaryEndpoints.map((ep, i) => {
              const isSelected = selectedSecondaryEndpoints.includes(ep.endpoint)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const newEndpoints = isSelected
                      ? selectedSecondaryEndpoints.filter(e => e !== ep.endpoint)
                      : [...selectedSecondaryEndpoints, ep.endpoint]
                    onSelectSecondaryEndpoint?.(newEndpoints)
                  }}
                  className={cn(
                    "flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left w-full",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-background border border-border hover:border-blue-500 hover:bg-blue-50"
                  )}
                >
                  {isSelected ? (
                    <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Plus className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="flex-1">{ep.endpoint}</span>
                  {ep.count && <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">{ep.count}</Badge>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Safety Signals */}
      {data.safetySignals.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Known Safety Signals (for monitoring)</div>
          <div className="flex flex-wrap gap-1.5">
            {data.safetySignals.map((signal, i) => {
              const isSelected = selectedSafetyTerms.includes(signal.term)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const newTerms = isSelected
                      ? selectedSafetyTerms.filter(t => t !== signal.term)
                      : [...selectedSafetyTerms, signal.term]
                    onSelectSafety?.(newTerms)
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    isSelected
                      ? "bg-amber-500 text-white"
                      : "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                  )}
                >
                  {isSelected ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {signal.term}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
