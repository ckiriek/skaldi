/**
 * Sprint 1, Task 1.4: ProjectOverview Component
 * 
 * Overview tab with project metadata and quick stats
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity,
  Database,
  GitCompareArrows
} from 'lucide-react'

interface ProjectOverviewProps {
  project: {
    id: string
    title: string
    phase?: string | null
    indication?: string | null
    compound_name?: string | null
    sponsor?: string | null
    countries?: string | null
    study_design?: string | null
    primary_endpoint?: string | null
    created_at: string
    updated_at: string
  }
  documents: any[]
  evidenceSources: any[]
}

export function ProjectOverview({ project, documents, evidenceSources }: ProjectOverviewProps) {
  // Calculate stats
  const totalDocuments = documents?.length || 0
  const completedDocuments = documents?.filter(d => d.status === 'approved').length || 0
  const draftDocuments = documents?.filter(d => d.status === 'draft').length || 0
  const reviewDocuments = documents?.filter(d => d.status === 'in_review' || d.status === 'review').length || 0
  
  const totalEvidence = evidenceSources?.length || 0
  
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const updatedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {completedDocuments} approved
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                {reviewDocuments} in review
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evidence Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvidence}</div>
            <p className="text-xs text-muted-foreground mt-2">
              External data sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated {updatedDate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Core information about this clinical trial project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phase</p>
              <p className="text-sm mt-1">{project.phase || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Indication</p>
              <p className="text-sm mt-1">{project.indication || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Compound</p>
              <p className="text-sm mt-1">{project.compound_name || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sponsor</p>
              <p className="text-sm mt-1">{project.sponsor || 'Not specified'}</p>
            </div>
            
            {project.countries && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Countries</p>
                <p className="text-sm mt-1">{project.countries}</p>
              </div>
            )}
            
            {project.study_design && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Design</p>
                <p className="text-sm mt-1">{project.study_design}</p>
              </div>
            )}
          </div>
          
          {project.primary_endpoint && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Primary Endpoint</p>
              <p className="text-sm mt-1">{project.primary_endpoint}</p>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Created on {createdDate}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents && documents.length > 0 ? (
              documents.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-start gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{doc.document_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {doc.status || 'draft'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
