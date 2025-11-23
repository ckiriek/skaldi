/**
 * Sprint 1, Task 1.2: ProjectHeader Component
 * 
 * Project header with metadata, status, and actions
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle2, Settings, Download, Edit3, Database } from 'lucide-react'
import { KnowledgeGraphPanel } from '@/components/knowledge'
import Link from 'next/link'

interface ProjectHeaderProps {
  project: {
    id: string
    title: string
    phase?: string | null
    indication?: string | null
    compound_name?: string | null
    rld_brand_name?: string | null
    enrichment_status?: string | null
    icon_name?: string | null
  }
  IconComponent: React.ComponentType<{ className?: string }>
  enrichmentStatus: {
    variant: 'success' | 'info' | 'secondary' | 'warning'
    label: string
  }
  hasExternalData: boolean
  onEditProtocol?: () => void
  onExport?: () => void
  onSettings?: () => void
}

export function ProjectHeader({
  project,
  IconComponent,
  enrichmentStatus,
  hasExternalData,
  onEditProtocol,
  onExport,
  onSettings
}: ProjectHeaderProps) {
  const [kgModalOpen, setKgModalOpen] = useState(false)
  
  // Extract INN from compound name (simplified)
  const inn = project.compound_name?.split(' ')[0] || ''
  
  return (
    <div className="flex items-start justify-between">
      {/* Left: Project Info */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <IconComponent className="h-6 w-6 text-primary" />
        </div>
        
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          
          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {project.phase && (
              <span>Phase: {project.phase}</span>
            )}
            
            {project.indication && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span>Indication: {project.indication}</span>
              </>
            )}
            
            {project.compound_name && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span>Compound: {project.compound_name}</span>
              </>
            )}
            
            {project.rld_brand_name && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span>RLD: {project.rld_brand_name}</span>
              </>
            )}
            
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-1">
              {enrichmentStatus.variant === 'success' && (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              )}
              <Badge variant={enrichmentStatus.variant} size="sm">
                {enrichmentStatus.label}
              </Badge>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Knowledge Graph Button */}
        {inn && (
          <Dialog open={kgModalOpen} onOpenChange={setKgModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Knowledge Graph</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Knowledge Graph: {inn}</DialogTitle>
              </DialogHeader>
              <KnowledgeGraphPanel inn={inn} autoFetch />
            </DialogContent>
          </Dialog>
        )}
        
        {hasExternalData && onEditProtocol && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditProtocol}
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Protocol</span>
          </Button>
        )}
        
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}
        
        {onSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}
      </div>
    </div>
  )
}
