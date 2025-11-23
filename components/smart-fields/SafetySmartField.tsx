/**
 * Sprint 1, Task 2.2: SafetySmartField Component
 * 
 * Multi-select smart field for safety assessments
 */

'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Check, X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SafetySmartFieldProps {
  phase?: string
  indication?: string
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  required?: boolean
}

// Standard safety procedures by phase
const STANDARD_SAFETY_PROCEDURES: Record<string, string[]> = {
  'Phase 1': [
    'Vital Signs',
    'Physical Examination',
    'ECG (12-lead)',
    'Clinical Laboratory Tests',
    'Adverse Event Monitoring',
    'Pharmacokinetic Sampling'
  ],
  'Phase 2': [
    'Vital Signs',
    'Physical Examination',
    'ECG (12-lead)',
    'Clinical Laboratory Tests',
    'Adverse Event Monitoring',
    'Serious Adverse Event Reporting',
    'Concomitant Medications'
  ],
  'Phase 3': [
    'Vital Signs',
    'Physical Examination',
    'ECG (12-lead)',
    'Clinical Laboratory Tests (Hematology, Chemistry, Urinalysis)',
    'Adverse Event Monitoring',
    'Serious Adverse Event Reporting',
    'Pregnancy Tests (if applicable)',
    'Concomitant Medications',
    'Prior Medications'
  ],
  'Phase 4': [
    'Vital Signs',
    'Physical Examination',
    'Adverse Event Monitoring',
    'Serious Adverse Event Reporting',
    'Concomitant Medications'
  ]
}

// Additional safety procedures
const ADDITIONAL_PROCEDURES = [
  'Chest X-Ray',
  'Echocardiography',
  'Holter Monitoring',
  'Liver Function Tests',
  'Renal Function Tests',
  'Thyroid Function Tests',
  'Coagulation Tests',
  'Immunogenicity Assessment',
  'Suicidality Assessment (C-SSRS)',
  'Alcohol/Drug Screening'
]

export function SafetySmartField({
  phase,
  indication,
  value,
  onChange,
  label = 'Safety Assessments',
  placeholder = 'Select safety procedures',
  required
}: SafetySmartFieldProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Get phase-appropriate suggestions
  useEffect(() => {
    const phaseProcedures = phase ? STANDARD_SAFETY_PROCEDURES[phase] || [] : []
    const allSuggestions = [...phaseProcedures, ...ADDITIONAL_PROCEDURES]
    setSuggestions(allSuggestions)
  }, [phase])

  // Toggle selection
  const toggleProcedure = (procedure: string) => {
    if (value.includes(procedure)) {
      onChange(value.filter(v => v !== procedure))
    } else {
      onChange([...value, procedure])
    }
  }

  // Remove procedure
  const removeProcedure = (procedure: string) => {
    onChange(value.filter(v => v !== procedure))
  }

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      {/* Selected Procedures */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
          {value.map(procedure => (
            <Badge
              key={procedure}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {procedure}
              <button
                type="button"
                onClick={() => removeProcedure(procedure)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Procedure Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length === 0 ? placeholder : `${value.length} selected`}
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search procedures..." />
            <CommandEmpty>No procedure found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {suggestions.map(procedure => (
                <CommandItem
                  key={procedure}
                  value={procedure}
                  onSelect={() => toggleProcedure(procedure)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(procedure) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {procedure}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        {phase 
          ? `Standard ${phase} safety procedures pre-selected. Add more as needed.`
          : 'Select safety monitoring procedures for your study'}
      </p>
    </div>
  )
}
