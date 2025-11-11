import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin rounded-full border-2 border-current border-t-transparent', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    variant: {
      default: 'text-primary',
      secondary: 'text-gray-500',
      white: 'text-white',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
})

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('inline-flex items-center gap-2', className)} {...props}>
        <div className={cn(spinnerVariants({ size, variant }))} />
        {label && <span className="text-sm text-gray-600">{label}</span>}
      </div>
    )
  }
)
Spinner.displayName = 'Spinner'

// Full-page spinner overlay
const SpinnerOverlay = ({ label }: { label?: string }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner size="xl" label={label} />
    </div>
  )
}

export { Spinner, SpinnerOverlay, spinnerVariants }
