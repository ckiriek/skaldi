/**
 * Sprint 1, Task 1.1: ProjectTabs Component
 * 
 * Reusable tabs component for project navigation
 */

'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, Database, Activity, GitCompareArrows, CheckCircle2, Edit3 } from 'lucide-react'

export interface ProjectTab {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  content?: React.ReactNode
}

interface ProjectTabsProps {
  defaultTab?: string
  tabs: ProjectTab[]
  className?: string
}

export function ProjectTabs({ defaultTab = 'overview', tabs, className }: ProjectTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className={className}>
      <TabsList className="w-full h-9 grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 text-xs"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.id} value={tab.id} className="pt-2">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

// Predefined tab configurations
export const PROJECT_TAB_IDS = {
  OVERVIEW: 'overview',
  DOCUMENTS: 'documents',
  FILES: 'files',
  EVIDENCE: 'evidence',
  STUDY_FLOW: 'studyflow',
  CROSS_DOC: 'crossdoc',
  VALIDATION: 'validation',
  PROTOCOL_EDITOR: 'protocol-editor'
} as const

export const PROJECT_TAB_ICONS = {
  [PROJECT_TAB_IDS.OVERVIEW]: Activity,
  [PROJECT_TAB_IDS.DOCUMENTS]: FileText,
  [PROJECT_TAB_IDS.FILES]: FileText,
  [PROJECT_TAB_IDS.EVIDENCE]: Database,
  [PROJECT_TAB_IDS.STUDY_FLOW]: Activity,
  [PROJECT_TAB_IDS.CROSS_DOC]: GitCompareArrows,
  [PROJECT_TAB_IDS.VALIDATION]: CheckCircle2,
  [PROJECT_TAB_IDS.PROTOCOL_EDITOR]: Edit3
}
