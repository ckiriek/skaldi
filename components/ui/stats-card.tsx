import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown } from 'lucide-react'

export interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down'
  }
  icon?: React.ReactNode
  description?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  description,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn('hover-lift', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">{value}</p>
          {change && (
            <div className="flex items-center gap-1 text-sm">
              {change.trend === 'up' ? (
                <ArrowUp className="h-4 w-4 text-success" />
              ) : (
                <ArrowDown className="h-4 w-4 text-error" />
              )}
              <span
                className={cn(
                  'font-medium',
                  change.trend === 'up' ? 'text-success' : 'text-error'
                )}
              >
                {Math.abs(change.value)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
