/**
 * Documents Dashboard Component
 * 
 * Overview of all documents with status badges and actions.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Document {
  id: string
  type: string
  status: string
  version: number
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  title: string
  phase: string
  indication: string
}

export function DocumentsDashboard({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project
        const projectRes = await fetch(`/api/v1/projects/${projectId}`)
        const projectData = await projectRes.json()
        if (projectData.success) {
          setProject(projectData.data)
        }

        // Fetch documents
        const docsRes = await fetch(`/api/v1/documents?project_id=${projectId}`)
        const docsData = await docsRes.json()
        if (docsData.success) {
          setDocuments(docsData.data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const documentTypes = ['IB', 'Protocol', 'ICF', 'CSR', 'SAP']

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: string; text: string }> = {
      draft: { color: 'gray', icon: '📝', text: 'Draft' },
      review: { color: 'blue', icon: '👀', text: 'In Review' },
      approved: { color: 'green', icon: '✅', text: 'Approved' },
      outdated: { color: 'yellow', icon: '⚠️', text: 'Outdated' },
    }
    return badges[status] || badges.draft
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      {project && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Phase: {project.phase}</span>
            <span>•</span>
            <span>Indication: {project.indication}</span>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTypes.map((docType) => {
          const doc = documents.find((d) => d.type === docType)
          const badge = doc ? getStatusBadge(doc.status) : null

          return (
            <div
              key={docType}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Document Type */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{docType}</h3>
                  <p className="text-sm text-gray-500">
                    {docType === 'IB' && 'Investigator Brochure'}
                    {docType === 'Protocol' && 'Clinical Study Protocol'}
                    {docType === 'ICF' && 'Informed Consent Form'}
                    {docType === 'CSR' && 'Clinical Study Report'}
                    {docType === 'SAP' && 'Statistical Analysis Plan'}
                  </p>
                </div>
                {badge && (
                  <span
                    className={`
                      px-2 py-1 text-xs font-medium rounded
                      ${badge.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                      ${badge.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                      ${badge.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${badge.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                    `}
                  >
                    {badge.icon} {badge.text}
                  </span>
                )}
              </div>

              {/* Document Info */}
              {doc ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Version: v{doc.version}
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated: {new Date(doc.updated_at).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                    >
                      View
                    </Link>
                    <Link
                      href={`/documents/${doc.id}/edit`}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/v1/export`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              document_id: doc.id,
                              format: 'pdf',
                            }),
                          })
                          const data = await response.json()
                          if (data.success && data.data.url) {
                            window.open(data.data.url, '_blank')
                          }
                        } catch (error) {
                          console.error('Failed to export:', error)
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
                      title="Download PDF"
                    >
                      📥
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Not generated yet</p>

                  {/* Generate Button */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/v1/workflow/start', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            project_id: projectId,
                            document_type: docType.toLowerCase(),
                            auto_execute: true,
                          }),
                        })
                        const data = await response.json()
                        if (data.success) {
                          // Redirect to workflow status page
                          window.location.href = `/workflow/${data.data.execution.id}`
                        }
                      } catch (error) {
                        console.error('Failed to start workflow:', error)
                      }
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Generate {docType}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={async () => {
              try {
                // Generate all documents
                for (const docType of documentTypes) {
                  await fetch('/api/v1/workflow/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      project_id: projectId,
                      document_type: docType.toLowerCase(),
                      auto_execute: true,
                    }),
                  })
                }
                alert('All workflows started!')
              } catch (error) {
                console.error('Failed to start workflows:', error)
              }
            }}
            className="px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            🚀 Generate All Documents
          </button>

          <Link
            href={`/projects/${projectId}/evidence`}
            className="px-4 py-3 text-sm font-medium text-center text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
          >
            📚 View Evidence Locker
          </Link>

          <Link
            href={`/projects/${projectId}/settings`}
            className="px-4 py-3 text-sm font-medium text-center text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
          >
            ⚙️ Project Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
