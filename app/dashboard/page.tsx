import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, FolderOpen, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/ui/stats-card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch stats
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .limit(100)

  const { data: documents } = await supabase
    .from('documents')
    .select('id, status')
    .limit(100)

  const projectCount = projects?.length || 0
  const documentCount = documents?.length || 0
  const draftCount = documents?.filter(d => d.status === 'draft').length || 0
  const approvedCount = documents?.filter(d => d.status === 'approved').length || 0

  // Fetch recent projects
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, title, phase, indication, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-4 fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to Asetria - Clinical Trial Documentation Platform
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button size="default" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Projects"
          value={projectCount}
          change={{ value: 12, trend: 'up' }}
          icon={<FolderOpen className="h-5 w-5" />}
          description="Active clinical trials"
        />

        <StatsCard
          title="Documents"
          value={documentCount}
          change={{ value: 8, trend: 'up' }}
          icon={<FileText className="h-5 w-5" />}
          description="Total documents generated"
        />

        <StatsCard
          title="In Draft"
          value={draftCount}
          icon={<Clock className="h-5 w-5" />}
          description="Pending review"
        />

        <StatsCard
          title="Approved"
          value={approvedCount}
          change={{ value: 15, trend: 'up' }}
          icon={<CheckCircle className="h-5 w-5" />}
          description="Ready for submission"
        />
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Recent Projects</CardTitle>
            <CardDescription className="text-sm">Your latest clinical trial projects</CardDescription>
          </div>
          <Link href="/dashboard/projects">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="group flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-smooth hover-lift"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {project.indication}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first clinical trial project
              </p>
              <Link href="/dashboard/projects/new">
                <Button>Create Project</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/projects/new">
          <Card className="hover-lift cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">New Project</h3>
                  <p className="text-xs text-muted-foreground">Start a new clinical trial</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Temporarily disabled - page not yet implemented */}
        {/* <Link href="/dashboard/documents">
          <Card className="hover-lift cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">View Documents</h3>
                  <p className="text-xs text-muted-foreground">Browse all documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link> */}

        <Link href="/dashboard/projects">
          <Card className="hover-lift cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <Activity className="h-5 w-5 text-info" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">All Projects</h3>
                  <p className="text-xs text-muted-foreground">Manage your projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
