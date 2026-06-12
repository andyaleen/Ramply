'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fieldLabel } from '@/lib/catalog'
import {
  getFieldInputConfig,
  getFieldSelectValues,
  sanitizeFieldValue,
} from '@/lib/field-inputs'

interface CompanyFieldInputProps {
  fieldKey: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  selectTriggerClassName?: string
  id?: string
  'aria-invalid'?: boolean
}

/** Renders the correct input control for a standardized company profile field. */
export function CompanyFieldInput({
  fieldKey,
  value,
  onChange,
  placeholder,
  className,
  selectTriggerClassName,
  id,
  'aria-invalid': ariaInvalid,
}: CompanyFieldInputProps) {
  const config = getFieldInputConfig(fieldKey)
  const resolvedPlaceholder =
    placeholder ?? config.placeholder ?? `Enter ${fieldLabel(fieldKey)}`

  if (config.kind === 'select' && config.options) {
    const allowedValues = getFieldSelectValues(fieldKey) ?? new Set<string>()
    const showLegacyValue = !!value && !allowedValues.has(value)

    return (
      <Select onValueChange={onChange} value={value ?? ''}>
        <SelectTrigger
          id={id}
          className={selectTriggerClassName ?? className}
          aria-invalid={ariaInvalid}
        >
          <SelectValue placeholder={resolvedPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {showLegacyValue ? (
            <SelectItem value={value}>{value}</SelectItem>
          ) : null}
          {config.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const handleChange = (nextValue: string) => {
    onChange(sanitizeFieldValue(fieldKey, nextValue))
  }

  return (
    <Input
      id={id}
      type={config.kind === 'text' ? 'text' : config.kind}
      inputMode={config.digitsOnly ? 'numeric' : undefined}
      maxLength={config.maxLength}
      value={value ?? ''}
      onChange={(event) => handleChange(event.target.value)}
      placeholder={resolvedPlaceholder}
      className={className}
      aria-invalid={ariaInvalid}
    />
  )
}
