/**
 * Evidence Viewer Component
 * 
 * Displays evidence details when clicking on [EV-XX] references.
 */

'use client'

import { useEffect, useState } from 'react'
import type { EvidenceSource } from '@/lib/types/evidence'
import {
  getSourceTypeDisplay,
  getConfidenceLevelColor,
  getDataQualityColor,
  getVerificationStatusDisplay,
  formatEvidenceCitation,
  getEvidenceUrl,
} from '@/lib/types/evidence'

interface EvidenceViewerProps {
  evId: string
  onClose?: () => void
}

export function EvidenceViewer({ evId, onClose }: EvidenceViewerProps) {
  const [evidence, setEvidence] = useState<EvidenceSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const response = await fetch(`/api/v1/evidence/${evId}`)
        const data = await response.json()

        if (data.success) {
          setEvidence(data.data)
        } else {
          setError(data.error?.message || 'Failed to load evidence')
        }
      } catch (err) {
        setError('Failed to load evidence')
      } finally {
        setLoading(false)
      }
    }

    fetchEvidence()
  }, [evId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !evidence) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error || 'Evidence not found'}</p>
      </div>
    )
  }

  const verificationStatus = getVerificationStatusDisplay(evidence)
  const sourceUrl = getEvidenceUrl(evidence)
  const citation = formatEvidenceCitation(evidence)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-blue-600">[{evidence.ev_id}]</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
              {getSourceTypeDisplay(evidence.source_type)}
            </span>
          </div>
          {evidence.title && (
            <h3 className="text-sm font-medium text-gray-900">{evidence.title}</h3>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Snippet */}
        {evidence.snippet && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Excerpt</h4>
            <p className="text-sm text-gray-700 italic border-l-4 border-blue-200 pl-3">
              "{evidence.snippet}"
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Author */}
          {evidence.author && (
            <div>
              <span className="text-gray-500">Author:</span>
              <span className="ml-2 text-gray-900">{evidence.author}</span>
            </div>
          )}

          {/* Publication Date */}
          {evidence.publication_date && (
            <div>
              <span className="text-gray-500">Published:</span>
              <span className="ml-2 text-gray-900">
                {new Date(evidence.publication_date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Source ID */}
          {evidence.source_id && (
            <div>
              <span className="text-gray-500">ID:</span>
              <span className="ml-2 text-gray-900 font-mono text-xs">
                {evidence.source_id}
              </span>
            </div>
          )}

          {/* Access Date */}
          <div>
            <span className="text-gray-500">Accessed:</span>
            <span className="ml-2 text-gray-900">
              {new Date(evidence.access_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="flex gap-2 flex-wrap">
          {/* Verification Status */}
          <span
            className={`
              px-2 py-1 text-xs font-medium rounded
              ${verificationStatus.color === 'green' ? 'bg-green-100 text-green-700' : ''}
              ${verificationStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
              ${verificationStatus.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
            `}
          >
            {verificationStatus.icon} {verificationStatus.text}
          </span>

          {/* Confidence Level */}
          {evidence.confidence_level && (
            <span
              className={`
                px-2 py-1 text-xs font-medium rounded
                ${getConfidenceLevelColor(evidence.confidence_level) === 'green' ? 'bg-green-100 text-green-700' : ''}
                ${getConfidenceLevelColor(evidence.confidence_level) === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${getConfidenceLevelColor(evidence.confidence_level) === 'red' ? 'bg-red-100 text-red-700' : ''}
              `}
            >
              Confidence: {evidence.confidence_level}
            </span>
          )}

          {/* Data Quality */}
          {evidence.data_quality && (
            <span
              className={`
                px-2 py-1 text-xs font-medium rounded
                ${getDataQualityColor(evidence.data_quality) === 'green' ? 'bg-green-100 text-green-700' : ''}
                ${getDataQualityColor(evidence.data_quality) === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                ${getDataQualityColor(evidence.data_quality) === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${getDataQualityColor(evidence.data_quality) === 'red' ? 'bg-red-100 text-red-700' : ''}
              `}
            >
              Quality: {evidence.data_quality}
            </span>
          )}
        </div>

        {/* Tags */}
        {evidence.tags && evidence.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Tags</h4>
            <div className="flex gap-1 flex-wrap">
              {evidence.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Citation */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Citation</h4>
          <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded">
            {citation}
          </p>
        </div>

        {/* Verification Notes */}
        {evidence.verification_notes && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Verification Notes
            </h4>
            <p className="text-sm text-gray-700">{evidence.verification_notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
          >
            View Source →
          </a>
        )}
        {!evidence.verified && (
          <button
            onClick={async () => {
              try {
                await fetch(`/api/v1/evidence/${evidence.ev_id}/verify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                })
                // Refresh evidence
                window.location.reload()
              } catch (error) {
                console.error('Failed to verify evidence:', error)
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            Mark as Verified
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Evidence Popover Component
 * 
 * Shows evidence in a popover when hovering over [EV-XX] reference.
 */
export function EvidencePopover({ evId, children }: { evId: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
      >
        {children}
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <EvidenceViewer evId={evId} />
        </div>
      )}
    </div>
  )
}
