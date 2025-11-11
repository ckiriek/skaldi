import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm transition-smooth placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-y',
  {
    variants: {
      variant: {
        default: 'border-input focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        error: 'border-error focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
        success: 'border-success focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean
  success?: boolean
  maxLength?: number
  showCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, error, success, maxLength, showCount, ...props }, ref) => {
    const [count, setCount] = React.useState(0)
    const finalVariant = error ? 'error' : success ? 'success' : variant

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCount) {
        setCount(e.target.value.length)
      }
      props.onChange?.(e)
    }

    return (
      <div className="relative w-full">
        <textarea
          className={cn(textareaVariants({ variant: finalVariant }), className)}
          ref={ref}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {count}/{maxLength}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea, textareaVariants }
