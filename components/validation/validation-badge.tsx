'use client'

/**
 * Validation Badge Component
 * 
 * Shows severity level badge
 */

interface ValidationBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export function ValidationBadge({ severity }: ValidationBadgeProps) {
  const styles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  }[severity]

  const label = severity.toUpperCase()

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
      {label}
    </span>
  )
}
