/**
 * Document Status Banner
 * Shows validation status with color-coded alerts
 */

'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react'

interface ValidationSummary {
  studyflow?: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  crossdoc?: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  total?: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

interface DocumentStatusBannerProps {
  status: 'clean' | 'warning' | 'error' | 'critical' | 'pending'
  summary?: ValidationSummary
  onViewDetails?: () => void
  onApplyAutoFix?: () => void
  showAutoFix?: boolean
}

export function DocumentStatusBanner({
  status,
  summary,
  onViewDetails,
  onApplyAutoFix,
  showAutoFix = false,
}: DocumentStatusBannerProps) {
  // Calculate totals
  const totalCritical = summary?.total?.critical || 0
  const totalError = summary?.total?.error || 0
  const totalWarning = summary?.total?.warning || 0
  const totalInfo = summary?.total?.info || 0
  const totalIssues = totalCritical + totalError + totalWarning + totalInfo

  // Determine variant and content
  const getVariantAndContent = () => {
    switch (status) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-5 w-5" />,
          title: 'Critical Issues Detected',
          description: `${totalCritical} critical cross-document issues must be resolved before submission.`,
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-900',
        }
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Document May Be Inconsistent',
          description: `${totalError} errors detected. Review and resolve before finalizing.`,
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          borderColor: 'border-orange-200 dark:border-orange-900',
        }
      case 'warning':
        return {
          variant: 'default' as const,
          icon: <Info className="h-5 w-5 text-yellow-600" />,
          title: 'Recommended Improvements Available',
          description: `${totalWarning} warnings found. Consider addressing for optimal quality.`,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-900',
        }
      case 'clean':
        return {
          variant: 'default' as const,
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          title: 'Document Validated',
          description: 'No issues detected. Document is ready for review.',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200 dark:border-green-900',
        }
      case 'pending':
      default:
        return {
          variant: 'default' as const,
          icon: <Info className="h-5 w-5 text-blue-600" />,
          title: 'Validation Pending',
          description: 'Document has not been validated yet.',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-900',
        }
    }
  }

  const { variant, icon, title, description, bgColor, borderColor } = getVariantAndContent()

  if (status === 'pending') {
    return null // Don't show banner for pending status
  }

  return (
    <Alert variant={variant} className={`${bgColor} ${borderColor}`}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <AlertTitle className="mb-1 font-semibold">{title}</AlertTitle>
          <AlertDescription className="text-sm">{description}</AlertDescription>

          {/* Issue breakdown */}
          {totalIssues > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {totalCritical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totalCritical} Critical
                </Badge>
              )}
              {totalError > 0 && (
                <Badge variant="destructive" className="bg-orange-600 text-xs">
                  {totalError} Errors
                </Badge>
              )}
              {totalWarning > 0 && (
                <Badge variant="outline" className="border-yellow-600 text-yellow-700 text-xs">
                  {totalWarning} Warnings
                </Badge>
              )}
              {totalInfo > 0 && (
                <Badge variant="outline" className="text-xs">
                  {totalInfo} Info
                </Badge>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            {onViewDetails && (
              <Button size="sm" variant="outline" onClick={onViewDetails}>
                View Details
              </Button>
            )}
            {showAutoFix && onApplyAutoFix && (status === 'critical' || status === 'error' || status === 'warning') && (
              <Button size="sm" variant="default" onClick={onApplyAutoFix}>
                <Zap className="mr-2 h-4 w-4" />
                Apply Auto-Fix
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  )
}
