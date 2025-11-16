/**
 * Documents Dashboard Component
 * 
 * Overview of all documents with status badges and actions.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { FileText, Download, Edit, Rocket, Database, Settings } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

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
  const { toast } = useToast()

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
        <Spinner size="lg" />
      </div>
    )
  }

  const documentTypes = ['IB', 'Protocol', 'ICF', 'CSR', 'SAP']

  const getDocumentStatusMeta = (status: string | null | undefined) => {
    const normalized = (status || '').toLowerCase()

    if (normalized === 'approved') {
      return { variant: 'success' as const, label: 'Approved' }
    }
    if (normalized === 'review' || normalized === 'in_review') {
      return { variant: 'info' as const, label: 'In Review' }
    }
    if (normalized === 'draft') {
      return { variant: 'secondary' as const, label: 'Draft' }
    }
    if (normalized === 'outdated' || normalized === 'archived') {
      return { variant: 'warning' as const, label: 'Outdated' }
    }

    return { variant: 'secondary' as const, label: 'Unknown' }
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      {project && (
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-3xl font-semibold tracking-tight mb-3">{project.title}</h1>
            <div className="flex items-center gap-3">
              <Badge size="lg">{project.phase}</Badge>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-muted-foreground">{project.indication}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {documentTypes.map((docType, index) => {
          const doc = documents.find((d) => d.type === docType)
          const statusMeta = doc ? getDocumentStatusMeta(doc.status) : null

          return (
            <Card
              key={docType}
              className="hover-lift"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{docType}</CardTitle>
                      <CardDescription className="text-xs">
                        {docType === 'IB' && 'Investigator Brochure'}
                        {docType === 'Protocol' && 'Clinical Study Protocol'}
                        {docType === 'ICF' && 'Informed Consent Form'}
                        {docType === 'CSR' && 'Clinical Study Report'}
                        {docType === 'SAP' && 'Statistical Analysis Plan'}
                      </CardDescription>
                    </div>
                  </div>
                  {statusMeta && (
                    <Badge
                      variant={statusMeta.variant}
                      size="sm"
                    >
                      {statusMeta.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {doc ? (
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version:</span>
                        <span className="font-medium">v{doc.version}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium text-xs">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/dashboard/documents/${doc.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full gap-2">
                          <FileText className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
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
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Not generated yet</p>

                    {/* Generate Button */}
                    <Button
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
                            window.location.href = `/workflow/${data.data.execution.id}`
                          }
                        } catch (error) {
                          console.error('Failed to start workflow:', error)
                        }
                      }}
                      className="w-full gap-2"
                      size="sm"
                    >
                      <Rocket className="h-4 w-4" />
                      Generate {docType}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Batch operations and project management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={async () => {
                try {
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
                  toast({
                    variant: 'success',
                    title: 'Workflows started',
                    description: 'All document workflows have been started in the background.',
                  })
                } catch (error) {
                  console.error('Failed to start workflows:', error)
                  toast({
                    variant: 'error',
                    title: 'Failed to start workflows',
                    description: 'Please try again or check the logs.',
                  })
                }
              }}
              size="lg"
              className="gap-2"
            >
              <Rocket className="h-5 w-5" />
              Generate All Documents
            </Button>

            <Link href={`/projects/${projectId}/evidence`}>
              <Button variant="outline" className="w-full gap-2">
                <Database className="h-5 w-5" />
                View Evidence Locker
              </Button>
            </Link>

            <Link href={`/projects/${projectId}/settings`}>
              <Button variant="outline" className="w-full gap-2">
                <Settings className="h-5 w-5" />
                Project Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
