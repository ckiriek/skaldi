import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const inputVariants = cva(
  'flex w-full rounded-md border bg-background text-sm transition-smooth file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        error: 'border-error focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
        success: 'border-success focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2',
      },
      inputSize: {
        sm: 'h-7 px-2 py-0.5 text-xs',
        default: 'h-8 px-2.5 py-1 text-sm',
        lg: 'h-10 px-3 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  success?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, error, success, leftIcon, rightIcon, ...props }, ref) => {
    // Determine variant based on error/success props
    const finalVariant = error ? 'error' : success ? 'success' : variant

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: finalVariant, inputSize }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
