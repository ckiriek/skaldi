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

export function SmartPrefill({
  compoundName,
  productType,
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

  // Fetch all data when compound changes
  const fetchSmartData = useCallback(async (compound: string) => {
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
      // Fetch in parallel
      const [indicationsRes, rldRes, kgRes] = await Promise.all([
        fetch(`/api/v1/drugs/indications?drug=${encodeURIComponent(compound)}`),
        productType === 'generic' 
          ? fetch(`/api/v1/autocomplete/rld?type=brand&q=${encodeURIComponent(compound)}`)
          : Promise.resolve(null),
        // Knowledge Graph for formulations and safety
        fetch('/api/knowledge/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inn: compound })
        })
      ])

      const indicationsData = await indicationsRes.json()
      const rldData = rldRes ? await rldRes.json() : { success: false }
      const kgData = await kgRes.json()

      // Extract formulations from Knowledge Graph
      let formulations: FormulationOption[] = []
      let safetySignals: Array<{ term: string; frequency?: number }> = []
      
      if (kgData.success && kgData.data) {
        // Formulations
        if (kgData.data.formulations && Array.isArray(kgData.data.formulations)) {
          formulations = kgData.data.formulations.slice(0, 4).map((f: any) => ({
            dosageForm: f.dosageForms?.[0] || 'Tablet',
            route: f.routes?.[0] || 'Oral',
            strengths: f.strengths || []
          }))
        }
        // Safety signals
        if (kgData.data.safetySignals) {
          safetySignals = kgData.data.safetySignals.slice(0, 8)
        }
      }

      setData({
        formulations,
        rldBrands: rldData.success ? rldData.data?.slice(0, 5) || [] : [],
        indications: indicationsData.success ? indicationsData.data?.slice(0, 5) || [] : [],
        primaryEndpoints: [], // Will be fetched when indication is selected
        secondaryEndpoints: [],
        safetySignals,
        isLoading: false,
        error: null
      })

      console.log('✅ Smart prefill data loaded:', {
        formulations: formulations.length,
        rldBrands: rldData.success ? rldData.data?.length : 0,
        indications: indicationsData.success ? indicationsData.data?.length : 0,
        safetySignals: safetySignals.length
      })

    } catch (error) {
      console.error('❌ Smart prefill error:', error)
      setData(prev => ({ ...prev, isLoading: false, error: 'Failed to fetch suggestions' }))
    }
  }, [productType])

  // Fetch endpoints when indication changes
  const fetchEndpoints = useCallback(async (indication: string) => {
    if (!indication || indication.length < 3 || !compoundName) return

    try {
      // Search ClinicalTrials.gov for common endpoints for this indication
      const response = await fetch(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(indication)}&query.intr=${encodeURIComponent(compoundName)}&pageSize=15`
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
  }, [compoundName])

  // Effect: fetch data when compound changes
  useEffect(() => {
    const timer = setTimeout(() => fetchSmartData(compoundName), 600)
    return () => clearTimeout(timer)
  }, [compoundName, fetchSmartData])

  // Effect: fetch endpoints when indication changes
  useEffect(() => {
    if (selectedIndication) {
      fetchEndpoints(selectedIndication)
    }
  }, [selectedIndication, fetchEndpoints])

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

      {/* RLD Brands (for Generic) */}
      {productType === 'generic' && data.rldBrands.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Reference Listed Drug (RLD)</div>
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
      {selectedIndication && data.primaryEndpoints.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Primary Endpoints for {selectedIndication}</div>
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
      {selectedIndication && data.secondaryEndpoints.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Secondary Endpoints (select multiple)</div>
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
