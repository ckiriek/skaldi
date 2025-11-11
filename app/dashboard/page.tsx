import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, FolderOpen, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/ui/stats-card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'

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
    <div className="space-y-8 fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome to Asetria - Clinical Trial Documentation Platform
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button size="lg" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Stats Grid - Using New StatsCard Component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <Card className="hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Projects</CardTitle>
              <CardDescription>Your latest clinical trial projects</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-accent hover:border-primary transition-smooth slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{project.title}</h3>
                        <Badge variant="secondary" size="sm">
                          {project.phase}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.indication}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              title="No projects yet"
              description="Get started by creating your first clinical trial project"
              action={{
                label: 'Create Project',
                onClick: () => window.location.href = '/dashboard/projects/new'
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-lift cursor-pointer" onClick={() => window.location.href = '/dashboard/projects/new'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">New Project</h3>
                <p className="text-sm text-muted-foreground">Start a new clinical trial</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift cursor-pointer" onClick={() => window.location.href = '/dashboard/documents'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">View Documents</h3>
                <p className="text-sm text-muted-foreground">Browse all documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift cursor-pointer" onClick={() => window.location.href = '/dashboard/projects'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
                <Activity className="h-6 w-6 text-info" />
              </div>
              <div>
                <h3 className="font-semibold">All Projects</h3>
                <p className="text-sm text-muted-foreground">Manage your projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
