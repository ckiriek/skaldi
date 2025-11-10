import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, CheckCircle } from 'lucide-react'
import { ValidateDocumentButton } from '@/components/validate-document-button'
import { DocumentViewer } from '@/components/document-viewer'

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch document with content
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      projects (
        id,
        title,
        phase,
        indication
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !document) {
    notFound()
  }

  const project = Array.isArray(document.projects) ? document.projects[0] : document.projects

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${(document as any).projects?.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {document.type} - Version {document.version}
            </h1>
            <p className="text-gray-600 mt-1">
              {(document as any).projects?.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ValidateDocumentButton 
            documentId={document.id}
            documentType={document.type}
          />
          <a href={`/api/documents/${document.id}/export/docx`} download>
            <Button 
              variant="outline" 
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export DOCX
            </Button>
          </a>
          <Button 
            variant="outline" 
            size="sm"
            disabled
            title="PDF export temporarily disabled - DOCX available"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Document Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Type:</span>{' '}
              <span className="font-medium">{document.type}</span>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>{' '}
              <span className="font-medium">{document.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>{' '}
              <span className="font-medium capitalize">{document.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Phase:</span>{' '}
              <span className="font-medium">{project?.phase}</span>
            </div>
            <div>
              <span className="text-gray-600">Indication:</span>{' '}
              <span className="font-medium">{project?.indication}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Created:</span>{' '}
              <span className="font-medium">
                {new Date(document.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Updated:</span>{' '}
              <span className="font-medium">
                {new Date(document.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Content */}
      {(document as any).content ? (
        <DocumentViewer 
          content={(document as any).content} 
          documentType={document.type}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-gray-600 mb-4 text-lg">
                No content generated yet.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click "Generate Document" on the project page to create content using AI.
              </p>
              <Link href={`/dashboard/projects/${(document as any).project_id}`}>
                <Button>
                  Go to Project
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results (if available) */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
          <CardDescription>
            ICH/FDA compliance checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No validation results yet</p>
            <p className="text-sm mt-2">
              Click "Validate" to check document compliance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
