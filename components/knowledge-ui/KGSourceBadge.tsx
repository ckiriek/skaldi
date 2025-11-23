/**
 * Phase H.UI v2: KG Source Badge
 * 
 * Displays source badge with icon
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { FileText, Database, Beaker, Globe, Brain, Clock } from 'lucide-react'

interface Props {
  source: string
}

export function KGSourceBadge({ source }: Props) {
  const sourceType = source.split(':')[0]
  
  const config = getSourceConfig(sourceType)
  
  return (
    <Badge 
      variant="outline" 
      className="text-xs"
      style={{ 
        borderColor: config.color,
        color: config.color 
      }}
    >
      <config.icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function getSourceConfig(sourceType: string) {
  switch (sourceType) {
    case 'fda_label':
      return {
        label: 'FDA',
        icon: FileText,
        color: '#2563eb' // blue
      }
    case 'fda_ndc':
      return {
        label: 'FDA NDC',
        icon: Database,
        color: '#2563eb'
      }
    case 'dailymed':
      return {
        label: 'DailyMed',
        icon: FileText,
        color: '#16a34a' // green
      }
    case 'ctgov':
      return {
        label: 'CT.gov',
        icon: Beaker,
        color: '#9333ea' // purple
      }
    case 'ema':
      return {
        label: 'EMA',
        icon: Globe,
        color: '#ea580c' // orange
      }
    case 'rag':
      return {
        label: 'RAG',
        icon: Brain,
        color: '#ec4899' // pink
      }
    case 'memory':
      return {
        label: 'Memory',
        icon: Clock,
        color: '#6366f1' // indigo
      }
    default:
      return {
        label: sourceType.toUpperCase(),
        icon: Database,
        color: '#64748b' // gray
      }
  }
}
