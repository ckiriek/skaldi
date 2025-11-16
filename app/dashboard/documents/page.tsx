import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText } from 'lucide-react'

function getDocumentStatusMeta(status: string | null | undefined) {
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

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id,
      type,
      status,
      version,
      created_at,
      updated_at,
      projects (
        id,
        title
      )
    `)
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
        <Link href="/dashboard/projects">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Compact Table */}
      {documents && documents.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 text-xs">Document</TableHead>
                <TableHead className="h-9 text-xs">Project</TableHead>
                <TableHead className="h-9 text-xs">Status</TableHead>
                <TableHead className="h-9 text-xs">Ver</TableHead>
                <TableHead className="h-9 text-xs">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => {
                const project = Array.isArray(doc.projects) ? doc.projects[0] : doc.projects
                const statusMeta = getDocumentStatusMeta(doc.status)

                return (
                  <TableRow key={doc.id} className="group">
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="text-sm font-medium hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1"
                        >
                          {doc.type}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {project ? (
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1"
                        >
                          {project.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge size="sm" variant={statusMeta.variant} className="text-xs">
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">v{doc.version}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(
                          (doc as { updated_at?: string | null; created_at: string }).updated_at ??
                            (doc as { updated_at?: string | null; created_at: string }).created_at
                        ).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-sm font-medium mb-1">No documents yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Generate a document from any project once external data has been fetched.
          </p>
          <Link href="/dashboard/projects">
            <Button size="sm" className="h-7 px-2.5 text-xs">
              Go to Projects
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
