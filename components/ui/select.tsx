'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  placeholder?: string
  error?: boolean
  success?: boolean
  onChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, success, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value)
    }

    const borderColor = error
      ? 'border-error focus-visible:border-error focus-visible:ring-error'
      : success
      ? 'border-success focus-visible:border-success focus-visible:ring-success'
      : 'border-input focus-visible:border-primary focus-visible:ring-ring'

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-background px-3 py-2 pr-10 text-sm transition-smooth',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            borderColor,
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
