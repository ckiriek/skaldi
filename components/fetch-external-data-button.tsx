'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Database, Loader2, FlaskConical, BookOpen, Shield, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FetchExternalDataButtonProps {
  projectId: string
}

type SourceStatus = 'pending' | 'loading' | 'success' | 'error'

interface ProgressState {
  clinicalTrials: SourceStatus
  publications: SourceStatus
  safetyData: SourceStatus
}

export function FetchExternalDataButton({ projectId }: FetchExternalDataButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progressState, setProgressState] = useState<ProgressState>({
    clinicalTrials: 'pending',
    publications: 'pending',
    safetyData: 'pending',
  })
  const [results, setResults] = useState<any>(null)

  const calculateProgress = () => {
    const statuses = Object.values(progressState)
    const completed = statuses.filter(s => s === 'success' || s === 'error').length
    return (completed / statuses.length) * 100
  }

  const handleFetch = async () => {
    setLoading(true)
    setProgressState({
      clinicalTrials: 'loading',
      publications: 'pending',
      safetyData: 'pending',
    })
    setResults(null)

    try {
      // Simulate progress updates (in real app, use streaming or polling)
      setTimeout(() => {
        setProgressState(prev => ({ ...prev, clinicalTrials: 'success', publications: 'loading' }))
      }, 1000)
      
      setTimeout(() => {
        setProgressState(prev => ({ ...prev, publications: 'success', safetyData: 'loading' }))
      }, 2000)

      const response = await fetch('/api/integrations/fetch-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch external data')
      }

      const data = await response.json()

      if (data.success) {
        setProgressState({
          clinicalTrials: 'success',
          publications: 'success',
          safetyData: 'success',
        })
        setResults(data.data)
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          setLoading(false)
          router.refresh()
        }, 2000)
      } else {
        setProgressState({
          clinicalTrials: 'error',
          publications: 'error',
          safetyData: 'error',
        })
        setTimeout(() => setLoading(false), 2000)
      }
    } catch (error) {
      console.error('Error fetching external data:', error)
      setProgressState({
        clinicalTrials: 'error',
        publications: 'error',
        safetyData: 'error',
      })
      setTimeout(() => setLoading(false), 2000)
    }
  }

  return (
    <>
      <Button 
        onClick={handleFetch} 
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <Database className="w-4 h-4 mr-2" />
        Fetch External Data
      </Button>

      <Dialog open={loading} onOpenChange={setLoading}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fetching External Data</DialogTitle>
            <DialogDescription>
              Please wait while we gather data from multiple sources...
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* ClinicalTrials.gov */}
            <div className="flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-blue-500" />
              <span className="flex-1 text-sm font-medium">ClinicalTrials.gov</span>
              {progressState.clinicalTrials === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {progressState.clinicalTrials === 'loading' && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              )}
              {progressState.clinicalTrials === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {progressState.clinicalTrials === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            {/* PubMed */}
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <span className="flex-1 text-sm font-medium">PubMed</span>
              {progressState.publications === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {progressState.publications === 'loading' && (
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              )}
              {progressState.publications === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {progressState.publications === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            {/* openFDA */}
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <span className="flex-1 text-sm font-medium">openFDA</span>
              {progressState.safetyData === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {progressState.safetyData === 'loading' && (
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              )}
              {progressState.safetyData === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {progressState.safetyData === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            {/* Progress Bar */}
            <div className="pt-2">
              <Progress value={calculateProgress()} className="h-2" />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {Math.round(calculateProgress())}% complete
              </p>
            </div>

            {/* Results Summary */}
            {results && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Results:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>✅ {results.clinicalTrials} clinical trials</p>
                  <p>✅ {results.publications} publications</p>
                  <p>✅ {results.safetyData} safety reports</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
