'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FieldAutocomplete } from '@/components/forms/field-autocomplete'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    product_type: 'innovator' as 'innovator' | 'generic' | 'hybrid',
    compound_name: '',
    phase: 'Phase 2',
    indication: '',
    drug_class: '',
    countries: '',
    design_type: 'randomized',
    blinding: 'double-blind',
    arms: '2',
    duration_weeks: '24',
    primary_endpoint: '',
    // Generic-specific fields
    rld_brand_name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      }

      // Call Intake Agent API
      const response = await fetch('/api/v1/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          product_type: formData.product_type,
          compound_name: formData.compound_name,
          phase: formData.phase,
          indication: formData.indication,
          drug_class: formData.drug_class || undefined,
          countries: countriesArray,
          design_json: designJson,
          rld_brand_name: formData.product_type === 'generic' ? formData.rld_brand_name : undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        alert(result.errors?.join('\n') || 'Failed to create project')
        return
      }

      // Show success message
      if (result.enrichment_triggered) {
        alert('✅ Project created! Regulatory data enrichment started in background.')
      }

      router.push(`/dashboard/projects/${result.project_id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Project</h1>
        <p className="mt-2 text-gray-600">Create a new clinical trial project</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the basic information about your clinical trial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Type Selection */}
            <div className="space-y-4 pb-6 border-b">
              <div>
                <Label className="text-base font-semibold">Product Type *</Label>
                <p className="text-sm text-gray-500 mt-1">Select the type of product for this project</p>
              </div>
              <RadioGroup
                value={formData.product_type}
                onValueChange={(value: 'innovator' | 'generic' | 'hybrid') => 
                  setFormData({ ...formData, product_type: value })
                }
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="innovator" id="innovator" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="innovator" className="cursor-pointer">
                      <div className="font-semibold text-gray-900">Innovator / Original Compound</div>
                      <p className="text-sm text-gray-500 mt-1">
                        New drug with full nonclinical and clinical data from sponsor
                      </p>
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="generic" id="generic" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="generic" className="cursor-pointer">
                      <div className="font-semibold text-gray-900">Generic Drug</div>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on existing approved product (RLD) — we'll auto-fetch data from FDA/EMA
                      </p>
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="hybrid" id="hybrid" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="hybrid" className="cursor-pointer">
                      <div className="font-semibold text-gray-900">Hybrid / Combination Product</div>
                      <p className="text-sm text-gray-500 mt-1">
                        Modified release, fixed-dose combination, or biosimilar
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="mt-1 text-xs text-gray-500">
                  💡 Use the generic name (e.g., Metformin Hydrochloride, not Glucophage)
                </p>
              )}
            </div>

            {/* Generic-specific: RLD Information */}
            {formData.product_type === 'generic' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Reference Listed Drug (RLD) Information</CardTitle>
                  <CardDescription>
                    We'll automatically fetch nonclinical and clinical data from FDA/EMA databases
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RLD Brand Name *
                    </label>
                    <FieldAutocomplete
                      value={formData.rld_brand_name}
                      onChange={(value) => setFormData({ ...formData, rld_brand_name: value })}
                      endpoint="/api/v1/autocomplete/rld?type=brand"
                      placeholder="e.g., GLUCOPHAGE"
                      required={formData.product_type === 'generic'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      We'll automatically fetch Application Number and TE Code from FDA Orange Book
                    </p>
                  </div>
                  <div className="bg-white border border-blue-300 rounded-md p-3">
                    <p className="text-sm text-blue-900">
                      <strong>🤖 Auto-enrichment enabled:</strong> We'll fetch pharmacology, PK/PD, safety data, 
                      and references from FDA labels, EMA EPAR, and PubMed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indication *
              </label>
              <FieldAutocomplete
                value={formData.indication}
                onChange={(value) => setFormData({ ...formData, indication: value })}
                endpoint="/api/v1/autocomplete/indications"
                placeholder="e.g., Type 2 Diabetes"
                required
              />
            </div>

            {/* Drug Class / Active Ingredient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drug Class / Active Ingredient
              </label>
              <FieldAutocomplete
                value={formData.drug_class}
                onChange={(value) => setFormData({ ...formData, drug_class: value })}
                endpoint="/api/v1/autocomplete/drug-class"
                placeholder="e.g., metformin, DPP-4 inhibitor, SGLT2 inhibitor"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used for safety data search. For investigational drugs, specify the drug class or similar approved drug.
              </p>
            </div>

            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Countries
              </label>
              <FieldAutocomplete
                value={formData.countries}
                onChange={(value) => setFormData({ ...formData, countries: value })}
                endpoint="/api/v1/autocomplete/countries"
                placeholder="e.g., USA, Germany, Japan (comma-separated)"
                minChars={2}
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 Type to search, select multiple countries separated by commas
              </p>
            </div>

            {/* Study Design */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Study Design</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Endpoint
                </label>
                <Input
                  value={formData.primary_endpoint}
                  onChange={(e) => setFormData({ ...formData, primary_endpoint: e.target.value })}
                  placeholder="e.g., Change in HbA1c from baseline at Week 24"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 If left empty, we'll automatically use the most common endpoint from similar clinical trials for your indication.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
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
    </div>
  )
}
