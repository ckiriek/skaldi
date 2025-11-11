/**
 * Version History Component
 * 
 * Displays document version history with diff viewing.
 */

'use client'

import { useEffect, useState } from 'react'
import type { DocumentVersion } from '@/lib/types/versioning'
import {
  getVersionStatusDisplay,
  formatVersionNumber,
  formatVersionMetadata,
  getVersionAge,
} from '@/lib/types/versioning'

interface VersionHistoryProps {
  documentId: string
  onVersionSelect?: (version: DocumentVersion) => void
}

export function VersionHistory({ documentId, onVersionSelect }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/v1/versions?document_id=${documentId}`)
      const data = await response.json()

      if (data.success) {
        setVersions(data.data.versions)
        setCurrentVersion(data.data.current_version)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVersionClick = (version: DocumentVersion) => {
    setSelectedVersion(version)
    onVersionSelect?.(version)
  }

  const handleApprove = async (versionId: string) => {
    try {
      const response = await fetch(`/api/v1/versions/${versionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_notes: 'Approved via UI',
        }),
      })

      if (response.ok) {
        fetchVersions()
      }
    } catch (error) {
      console.error('Failed to approve version:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Version History</h3>
        <span className="text-sm text-gray-500">{versions.length} versions</span>
      </div>

      {/* Current Version Badge */}
      {currentVersion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-900">Current Version</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
              {formatVersionNumber(currentVersion.version_number)}
            </span>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            {formatVersionMetadata(currentVersion).map((meta, i) => (
              <div key={i}>{meta}</div>
            ))}
          </div>
        </div>
      )}

      {/* Version List */}
      <div className="space-y-2">
        {versions.map((version) => {
          const statusDisplay = getVersionStatusDisplay(version.status)
          const isCurrent = version.is_current
          const isSelected = selectedVersion?.id === version.id
          const age = getVersionAge(version)

          return (
            <div
              key={version.id}
              onClick={() => handleVersionClick(version)}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${isCurrent ? 'ring-2 ring-blue-200' : ''}
              `}
            >
              {/* Version Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatVersionNumber(version.version_number)}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                      Current
                    </span>
                  )}
                  <span
                    className={`
                      px-2 py-0.5 text-xs font-medium rounded
                      ${statusDisplay.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                      ${statusDisplay.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                      ${statusDisplay.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${statusDisplay.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                    `}
                  >
                    {statusDisplay.icon} {statusDisplay.text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{age} days ago</span>
              </div>

              {/* Version Metadata */}
              <div className="text-xs text-gray-600 space-y-1">
                {formatVersionMetadata(version).map((meta, i) => (
                  <div key={i}>{meta}</div>
                ))}
                <div>Created: {new Date(version.created_at).toLocaleString()}</div>
              </div>

              {/* Approval Info */}
              {version.approved_at && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-green-700">
                    ✓ Approved {new Date(version.approved_at).toLocaleString()}
                  </div>
                  {version.approval_notes && (
                    <div className="text-xs text-gray-600 mt-1">{version.approval_notes}</div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleVersionClick(version)
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                >
                  View
                </button>
                {version.status === 'review' && !version.approved_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleApprove(version.id)
                    }}
                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                  >
                    Approve
                  </button>
                )}
                {version.version_number > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Show diff
                    }}
                    className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded border border-gray-300"
                  >
                    Show Changes
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {versions.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No versions yet
        </div>
      )}

      {/* Selected Version Preview */}
      {selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {formatVersionNumber(selectedVersion.version_number)} Preview
              </h3>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedVersion.content}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
              <button
                onClick={() => setSelectedVersion(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
              >
                Close
              </button>
              {selectedVersion.status === 'review' && (
                <button
                  onClick={() => {
                    handleApprove(selectedVersion.id)
                    setSelectedVersion(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Approve Version
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
