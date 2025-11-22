'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { SampleSizeParameters, SampleSizeResult, ValidationWarning } from '@/lib/engine/statistics/types'

export function StatisticsPanel() {
  const [endpointType, setEndpointType] = useState<'continuous' | 'binary' | 'time_to_event'>('continuous')
  const [power, setPower] = useState('0.90')
  const [alpha, setAlpha] = useState('0.05')
  const [effectSize, setEffectSize] = useState('')
  const [standardDeviation, setStandardDeviation] = useState('')
  const [eventRate, setEventRate] = useState('')
  const [hazardRatio, setHazardRatio] = useState('')
  const [dropoutRate, setDropoutRate] = useState('0.15')
  const [numberOfArms, setNumberOfArms] = useState('2')
  
  const [result, setResult] = useState<SampleSizeResult | null>(null)
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)
    setWarnings([])

    try {
      const params: SampleSizeParameters = {
        power: parseFloat(power),
        alpha: parseFloat(alpha),
        effectSize: parseFloat(effectSize),
        numberOfArms: parseInt(numberOfArms),
        endpointType,
        dropoutRate: parseFloat(dropoutRate) || undefined,
      }

      // Add endpoint-specific parameters
      if (endpointType === 'continuous' && standardDeviation) {
        params.standardDeviation = parseFloat(standardDeviation)
      } else if (endpointType === 'binary' && eventRate) {
        params.eventRate = parseFloat(eventRate)
      } else if (endpointType === 'time_to_event' && hazardRatio) {
        params.hazardRatio = parseFloat(hazardRatio)
      }

      const response = await fetch('/api/statistics/sample-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Calculation failed')
        if (data.errors) {
          setError(data.errors.map((e: any) => e.message).join(', '))
        }
      } else {
        setResult(data.result)
        setWarnings(data.warnings || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Sample Size Calculator
          </CardTitle>
          <CardDescription>
            Calculate sample size for clinical trials based on ICH E9 principles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint Type */}
          <div className="space-y-2">
            <Label>Endpoint Type</Label>
            <Select value={endpointType} onValueChange={(v: any) => setEndpointType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continuous">Continuous (e.g., change in HbA1c)</SelectItem>
                <SelectItem value="binary">Binary (e.g., response rate)</SelectItem>
                <SelectItem value="time_to_event">Time-to-Event (e.g., survival)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Power and Alpha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Power (1-β)</Label>
              <Select value={power} onValueChange={setPower}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.80">80%</SelectItem>
                  <SelectItem value="0.90">90%</SelectItem>
                  <SelectItem value="0.95">95%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alpha (α)</Label>
              <Select value={alpha} onValueChange={setAlpha}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.05">0.05 (two-sided)</SelectItem>
                  <SelectItem value="0.01">0.01 (two-sided)</SelectItem>
                  <SelectItem value="0.025">0.025 (one-sided)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Endpoint-specific parameters */}
          {endpointType === 'continuous' && (
            <>
              <div className="space-y-2">
                <Label>Mean Difference (Effect Size)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={effectSize}
                  onChange={(e) => setEffectSize(e.target.value)}
                  placeholder="e.g., 0.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Standard Deviation</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={standardDeviation}
                  onChange={(e) => setStandardDeviation(e.target.value)}
                  placeholder="e.g., 1.0"
                />
              </div>
            </>
          )}

          {endpointType === 'binary' && (
            <>
              <div className="space-y-2">
                <Label>Control Proportion</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={eventRate}
                  onChange={(e) => setEventRate(e.target.value)}
                  placeholder="e.g., 0.30"
                />
              </div>
              <div className="space-y-2">
                <Label>Treatment Proportion</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={effectSize}
                  onChange={(e) => setEffectSize(e.target.value)}
                  placeholder="e.g., 0.45"
                />
              </div>
            </>
          )}

          {endpointType === 'time_to_event' && (
            <div className="space-y-2">
              <Label>Hazard Ratio</Label>
              <Input
                type="number"
                step="0.01"
                value={hazardRatio}
                onChange={(e) => setHazardRatio(e.target.value)}
                placeholder="e.g., 0.70"
              />
            </div>
          )}

          {/* Dropout Rate */}
          <div className="space-y-2">
            <Label>Expected Dropout Rate</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={dropoutRate}
              onChange={(e) => setDropoutRate(e.target.value)}
              placeholder="e.g., 0.15"
            />
          </div>

          {/* Number of Arms */}
          <div className="space-y-2">
            <Label>Number of Arms</Label>
            <Input
              type="number"
              min="2"
              value={numberOfArms}
              onChange={(e) => setNumberOfArms(e.target.value)}
            />
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? 'Calculating...' : 'Calculate Sample Size'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Sample Size Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total Sample Size</div>
                <div className="text-3xl font-bold">{result.totalSampleSize}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Per Arm</div>
                <div className="text-3xl font-bold">
                  {result.sampleSizePerArm.join(' / ')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Method</div>
              <div className="text-sm text-muted-foreground">{result.method}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Assumptions</div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {result.assumptions.map((assumption, i) => (
                  <li key={i}>{assumption}</li>
                ))}
              </ul>
            </div>

            {result.adjustments && Object.keys(result.adjustments).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Adjustments Applied</div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {result.adjustments.dropout && (
                    <li>Dropout: {(result.adjustments.dropout * 100).toFixed(1)}%</li>
                  )}
                  {result.adjustments.multiplicity && (
                    <li>Multiplicity: {result.adjustments.multiplicity} comparisons</li>
                  )}
                  {result.adjustments.interim && (
                    <li>Interim analyses: {result.adjustments.interim}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-semibold mb-2">Warnings</div>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>
                  <strong>{warning.code}:</strong> {warning.message}
                  {warning.recommendation && (
                    <div className="text-sm mt-1">→ {warning.recommendation}</div>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Note:</strong> Sample size calculations are based on ICH E9 statistical principles.
          Always consult with a biostatistician for final sample size determination.
        </AlertDescription>
      </Alert>
    </div>
  )
}
