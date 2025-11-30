/**
 * Sprint 1, Task 1.1: ProjectTabs Component
 * 
 * Reusable tabs component for project navigation
 */

'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PROJECT_TAB_ICONS } from './constants'

export interface ProjectTab {
  id: string
  label: string
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
          // Resolve icon from constants based on tab ID
          const Icon = PROJECT_TAB_ICONS[tab.id as keyof typeof PROJECT_TAB_ICONS]
          
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

