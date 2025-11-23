/**
 * Phase H.UI v4: Study Designer Wizard
 * 
 * AI-driven study design wizard
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { SmartField } from '@/components/knowledge-ui/SmartField'

type WizardStep = 'basic' | 'strategy' | 'constraints' | 'outputs' | 'generating' | 'complete'

interface StudyDesignData {
  // Basic Info
  compound: string
  indication: string
  phase: string
  geography: string[]
  population: string
  
  // Strategy
  primaryObjectiveType: 'efficacy' | 'safety' | 'non-inferiority' | 'pk-pd'
  comparatorStrategy: 'placebo' | 'active' | 'add-on'
  randomization: boolean
  blinding: 'open-label' | 'single-blind' | 'double-blind'
  
  // Constraints
  maxDuration: number
  budgetLevel: 'low' | 'medium' | 'high'
  regulatoryFocus: 'fda' | 'ema' | 'generic'
  
  // Outputs
  generateProtocol: boolean
  generateIB: boolean
  generateSAP: boolean
  generateICF: boolean
  detailLevel: 'skeleton' | 'full-draft'
}

export function StudyDesignerWizard() {
  const [step, setStep] = useState<WizardStep>('basic')
  const [data, setData] = useState<Partial<StudyDesignData>>({})
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const updateData = (updates: Partial<StudyDesignData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const handleGenerate = async () => {
    setStep('generating')
    setLoading(true)

    try {
      const response = await fetch('/api/study-designer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedProjectId(result.projectId)
        setStep('complete')
      }
    } catch (error) {
      console.error('Study design generation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const progress = {
    'basic': 25,
    'strategy': 50,
    'constraints': 75,
    'outputs': 90,
    'generating': 95,
    'complete': 100
  }[step]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Study Designer</h1>
        <p className="text-muted-foreground mt-2">
          Design your clinical study with AI assistance
        </p>
      </div>

      <Progress value={progress} className="w-full" />

      {/* Step 1: Basic Info */}
      {step === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SmartField
              label="Drug / Compound"
              value={data.compound || ''}
              onChange={(value) => updateData({ compound: value })}
              type="formulation"
              placeholder="e.g., Metformin Hydrochloride"
              required
            />

            <SmartField
              label="Indication"
              value={data.indication || ''}
              onChange={(value) => updateData({ indication: value })}
              type="indication"
              placeholder="e.g., Type 2 Diabetes Mellitus"
              required
              autoFetch={!!data.compound}
              userContext={{ compound: data.compound }}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Phase</label>
              <select
                value={data.phase || 'Phase 2'}
                onChange={(e) => updateData({ phase: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
                <option value="Phase 4">Phase 4</option>
              </select>
            </div>

            <Button 
              onClick={() => setStep('strategy')}
              disabled={!data.compound || !data.indication}
            >
              Next: Study Strategy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Strategy */}
      {step === 'strategy' && (
        <Card>
          <CardHeader>
            <CardTitle>Study Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Objective Type</label>
              <select
                value={data.primaryObjectiveType || 'efficacy'}
                onChange={(e) => updateData({ primaryObjectiveType: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="efficacy">Efficacy</option>
                <option value="safety">Safety</option>
                <option value="non-inferiority">Non-Inferiority</option>
                <option value="pk-pd">PK/PD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Comparator Strategy</label>
              <select
                value={data.comparatorStrategy || 'placebo'}
                onChange={(e) => updateData({ comparatorStrategy: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="placebo">Placebo</option>
                <option value="active">Active Comparator</option>
                <option value="add-on">Add-on Therapy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Blinding</label>
              <select
                value={data.blinding || 'double-blind'}
                onChange={(e) => updateData({ blinding: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="open-label">Open Label</option>
                <option value="single-blind">Single Blind</option>
                <option value="double-blind">Double Blind</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('basic')}>
                Back
              </Button>
              <Button onClick={() => setStep('constraints')}>
                Next: Constraints
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Constraints */}
      {step === 'constraints' && (
        <Card>
          <CardHeader>
            <CardTitle>Constraints & Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Duration (weeks)</label>
              <input
                type="number"
                value={data.maxDuration || 24}
                onChange={(e) => updateData({ maxDuration: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget Level</label>
              <select
                value={data.budgetLevel || 'medium'}
                onChange={(e) => updateData({ budgetLevel: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low (Lean procedures)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="high">High (Comprehensive)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Regulatory Focus</label>
              <select
                value={data.regulatoryFocus || 'fda'}
                onChange={(e) => updateData({ regulatoryFocus: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="fda">FDA Focus</option>
                <option value="ema">EMA Focus</option>
                <option value="generic">Generic/Phase 4</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('strategy')}>
                Back
              </Button>
              <Button onClick={() => setStep('outputs')}>
                Next: Outputs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Outputs */}
      {step === 'outputs' && (
        <Card>
          <CardHeader>
            <CardTitle>Output Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.generateProtocol !== false}
                  onChange={(e) => updateData({ generateProtocol: e.target.checked })}
                />
                <span>Generate Protocol</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.generateIB !== false}
                  onChange={(e) => updateData({ generateIB: e.target.checked })}
                />
                <span>Generate Investigator's Brochure</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.generateSAP !== false}
                  onChange={(e) => updateData({ generateSAP: e.target.checked })}
                />
                <span>Generate Statistical Analysis Plan</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.generateICF || false}
                  onChange={(e) => updateData({ generateICF: e.target.checked })}
                />
                <span>Generate ICF Skeleton</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Detail Level</label>
              <select
                value={data.detailLevel || 'full-draft'}
                onChange={(e) => updateData({ detailLevel: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="skeleton">Skeleton Only</option>
                <option value="full-draft">Full Draft</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('constraints')}>
                Back
              </Button>
              <Button onClick={handleGenerate}>
                Generate Study Design
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Study Design...</h3>
            <p className="text-muted-foreground">
              This may take a few moments. We're building your protocol, study flow, and statistics.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete */}
      {step === 'complete' && generatedProjectId && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Study Design Complete!</h3>
            <p className="text-muted-foreground mb-4">
              Your study has been designed and all documents generated.
            </p>
            <Button onClick={() => window.location.href = `/dashboard/projects/${generatedProjectId}`}>
              View Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
