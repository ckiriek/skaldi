'use client'

import { useState } from 'react'
import { FlaskConical, BookOpen, Shield, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EvidenceSource {
  id: string
  source: string
  external_id: string | null
  title: string
  snippet: string | null
  payload_json: any
  created_at: string
}

interface EvidenceDisplayProps {
  evidenceSources: EvidenceSource[]
}

type EvidenceType = 'all' | 'clinical-trials' | 'publications' | 'safety-reports'

export function EvidenceDisplay({ evidenceSources }: EvidenceDisplayProps) {
  const [activeTab, setActiveTab] = useState<EvidenceType>('all')
  const [displayCount, setDisplayCount] = useState(10)

  const clinicalTrials = evidenceSources.filter(e => e.source === 'ClinicalTrials.gov')
  const publications = evidenceSources.filter(e => e.source === 'PubMed')
  const safetyReports = evidenceSources.filter(e => e.source === 'openFDA')

  const getFilteredEvidence = () => {
    switch (activeTab) {
      case 'clinical-trials':
        return clinicalTrials
      case 'publications':
        return publications
      case 'safety-reports':
        return safetyReports
      default:
        return evidenceSources
    }
  }

  const filteredEvidence = getFilteredEvidence()
  const displayedEvidence = filteredEvidence.slice(0, displayCount)
  const hasMore = displayCount < filteredEvidence.length

  const renderClinicalTrial = (evidence: EvidenceSource) => {
    const payload = evidence.payload_json as any
    const nctUrl = `https://clinicaltrials.gov/study/${evidence.external_id}`
    
    return (
      <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                {evidence.external_id}
              </span>
              {payload?.phase && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                  {payload.phase}
                </span>
              )}
              {payload?.overall_status && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                  {payload.overall_status}
                </span>
              )}
            </div>
            <Link 
              href={`/dashboard/evidence/${evidence.id}`}
              className="font-semibold text-blue-600 hover:underline block mb-1"
            >
              {payload?.official_title || evidence.title}
            </Link>
            {payload?.brief_summary && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {payload.brief_summary}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {payload?.start_date && (
                <span>Started: {payload.start_date}</span>
              )}
              {payload?.sponsor && (
                <span>Sponsor: {payload.sponsor}</span>
              )}
              {payload?.condition && Array.isArray(payload.condition) && (
                <span>Conditions: {payload.condition.slice(0, 2).join(', ')}</span>
              )}
            </div>
          </div>
          <a
            href={nctUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  const renderPublication = (evidence: EvidenceSource) => {
    const payload = evidence.payload_json as any
    const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${evidence.external_id}/`
    
    return (
      <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                PMID: {evidence.external_id}
              </span>
              {payload?.publication_year && (
                <span className="text-xs text-gray-500">{payload.publication_year}</span>
              )}
            </div>
            <Link 
              href={`/dashboard/evidence/${evidence.id}`}
              className="font-semibold text-blue-600 hover:underline block mb-1"
            >
              {payload?.article_title || evidence.title}
            </Link>
            {payload?.authors && Array.isArray(payload.authors) && (
              <p className="text-sm text-gray-600 mb-1">
                {payload.authors.slice(0, 3).join(', ')}
                {payload.authors.length > 3 && ` et al.`}
              </p>
            )}
            {payload?.journal && (
              <p className="text-sm text-gray-500 italic mb-2">
                {payload.journal}
                {payload.publication_year && ` (${payload.publication_year})`}
              </p>
            )}
            {payload?.abstract && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {payload.abstract}
              </p>
            )}
          </div>
          <a
            href={pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  const renderSafetyReport = (evidence: EvidenceSource) => {
    const payload = evidence.payload_json as any
    
    return (
      <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                FDA Report
              </span>
              {payload?.serious && (
                <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded">
                  Serious
                </span>
              )}
            </div>
            <Link 
              href={`/dashboard/evidence/${evidence.id}`}
              className="font-semibold text-blue-600 hover:underline block mb-1"
            >
              {payload?.openfda?.brand_name?.[0] || payload?.openfda?.generic_name?.[0] || evidence.title}
            </Link>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              {payload?.receivedate && (
                <span>Reported: {payload.receivedate}</span>
              )}
              {payload?.patient?.patientonsetage && (
                <span>Patient Age: {payload.patient.patientonsetage}</span>
              )}
              {payload?.patient?.patientsex && (
                <span>Sex: {payload.patient.patientsex === '1' ? 'Male' : 'Female'}</span>
              )}
            </div>
            {payload?.patient?.reaction && Array.isArray(payload.patient.reaction) && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Reactions:</p>
                <div className="flex flex-wrap gap-1">
                  {payload.patient.reaction.slice(0, 5).map((reaction: any, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                      {reaction.reactionmeddrapt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderEvidence = (evidence: EvidenceSource) => {
    if (evidence.source === 'ClinicalTrials.gov') {
      return renderClinicalTrial(evidence)
    } else if (evidence.source === 'PubMed') {
      return renderPublication(evidence)
    } else if (evidence.source === 'openFDA') {
      return renderSafetyReport(evidence)
    }
    return null
  }

  return (
    <div>
      {/* Summary Stats */}
      <p className="text-sm font-medium mb-4">
        {evidenceSources.length} evidence sources retrieved
      </p>

      {/* Clickable Counters */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => {
            setActiveTab('clinical-trials')
            setDisplayCount(10)
          }}
          className={`p-4 border rounded-lg transition hover:shadow-md ${
            activeTab === 'clinical-trials' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-gray-500">Clinical Trials</p>
          </div>
          <p className="text-2xl font-bold">{clinicalTrials.length}</p>
        </button>

        <button
          onClick={() => {
            setActiveTab('publications')
            setDisplayCount(10)
          }}
          className={`p-4 border rounded-lg transition hover:shadow-md ${
            activeTab === 'publications' ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-green-600" />
            <p className="text-xs text-gray-500">Publications</p>
          </div>
          <p className="text-2xl font-bold">{publications.length}</p>
        </button>

        <button
          onClick={() => {
            setActiveTab('safety-reports')
            setDisplayCount(10)
          }}
          className={`p-4 border rounded-lg transition hover:shadow-md ${
            activeTab === 'safety-reports' ? 'border-red-500 bg-red-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-red-600" />
            <p className="text-xs text-gray-500">Safety Reports</p>
          </div>
          <p className="text-2xl font-bold">{safetyReports.length}</p>
        </button>
      </div>

      {/* Evidence List */}
      {activeTab !== 'all' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              {activeTab === 'clinical-trials' && 'Clinical Trials'}
              {activeTab === 'publications' && 'Publications'}
              {activeTab === 'safety-reports' && 'Safety Reports'}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveTab('all')
                setDisplayCount(10)
              }}
            >
              Clear filter
            </Button>
          </div>

          {displayedEvidence.map(renderEvidence)}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayCount(prev => prev + 10)}
              >
                Load More ({filteredEvidence.length - displayCount} remaining)
              </Button>
            </div>
          )}

          {displayedEvidence.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No evidence found in this category.
            </p>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <p className="text-sm text-gray-500 text-center py-8">
          Click on a category above to view evidence
        </p>
      )}
    </div>
  )
}
