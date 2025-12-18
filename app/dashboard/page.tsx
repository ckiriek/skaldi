import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProjectActionsMenu } from '@/components/project-actions-menu'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      phase,
      indication,
      countries,
      created_at,
      documents (id, status)
    `)
    .order('created_at', { ascending: false })

  // Calculate if all docs are complete for each project
  const projectsWithStatus = projects?.map(project => {
    const docs = project.documents || []
    const allDocsComplete = docs.length > 0 && docs.every((doc: any) => 
      doc.status === 'completed' || doc.status === 'in_review'
    )
    return {
      ...project,
      docCount: docs.length,
      allDocsComplete
    }
  })

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <Link href="/dashboard/projects/new">
          <Button size="sm" className="gap-1.5 h-7 px-2.5 text-xs">
            <Plus className="h-3 w-3" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Compact Table - No Card Wrapper */}
      {projectsWithStatus && projectsWithStatus.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 text-xs">Project</TableHead>
                <TableHead className="h-9 text-xs">Phase</TableHead>
                <TableHead className="h-9 text-xs">Countries</TableHead>
                <TableHead className="h-9 text-xs">Docs</TableHead>
                <TableHead className="h-9 text-xs">Created</TableHead>
                <TableHead className="h-9 text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithStatus.map((project) => (
                <TableRow key={project.id} className="group">
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1"
                      >
                        {project.title}
                      </Link>
                      {project.indication && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {project.indication}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {project.phase ? (
                      <Badge variant="phase" size="sm" className="text-xs">{project.phase}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {project.countries && project.countries.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {project.countries.slice(0, 2).join(', ')}
                        {project.countries.length > 2 && ` +${project.countries.length - 2}`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {project.docCount}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(project.created_at).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <ProjectActionsMenu 
                      projectId={project.id}
                      projectTitle={project.title}
                      allDocsComplete={project.allDocsComplete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-sm font-medium mb-1">No projects yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Create your first clinical trial project to start generating regulatory documents
          </p>
          <Link href="/dashboard/projects/new">
            <Button size="sm" className="h-7 px-2.5 text-xs">
              <Plus className="h-3 w-3 mr-1.5" />
              Create Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
