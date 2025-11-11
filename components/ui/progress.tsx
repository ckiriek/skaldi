'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressVariants = cva('relative w-full overflow-hidden rounded-full bg-secondary', {
  variants: {
    size: {
      sm: 'h-2',
      default: 'h-4',
      lg: 'h-6',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

const indicatorVariants = cva('h-full w-full flex-1 transition-all', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  showLabel?: boolean
  label?: string
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, showLabel, label, ...props }, ref) => (
  <div className="w-full space-y-1">
    {(showLabel || label) && (
      <div className="flex justify-between text-sm text-gray-600">
        <span>{label || 'Progress'}</span>
        {showLabel && <span>{value}%</span>}
      </div>
    )}
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(indicatorVariants({ variant }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular progress component
export interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

const CircularProgress = ({
  value,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  className,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const colorMap = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-300', colorMap[variant])}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xl font-semibold">{value}%</span>
      )}
    </div>
  )
}

export { Progress, CircularProgress, progressVariants, indicatorVariants }
