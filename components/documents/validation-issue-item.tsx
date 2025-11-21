'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { XCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { ValidationIssue } from './validation-results-card'

interface ValidationIssueItemProps {
  issue: ValidationIssue
  onSectionClick?: (sectionId: string) => void
}

export function ValidationIssueItem({ issue, onSectionClick }: ValidationIssueItemProps) {
  const { severity, message, section_id, rule_id } = issue

  // Severity styling
  const severityConfig = {
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800 hover:bg-red-100'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
    }
  }

  const config = severityConfig[severity]
  const Icon = config.icon

  // Format section ID for display
  const formatSectionId = (id?: string) => {
    if (!id) return null
    // Convert protocol_synopsis -> Protocol Synopsis
    return id
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const sectionName = formatSectionId(section_id)

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
        
        <div className="flex-1 space-y-2">
          {/* Severity Badge */}
          <Badge variant="secondary" className={config.badge}>
            {severity.toUpperCase()}
          </Badge>

          {/* Message */}
          <p className="text-sm text-gray-900">{message}</p>

          {/* Section and Rule Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {section_id && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Section:</span>
                {onSectionClick ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onSectionClick(section_id)}
                  >
                    {sectionName}
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <span>{sectionName}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">Rule:</span>
              <span className="font-mono">{rule_id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
