'use client'

import type { UseFormReturn, Path } from 'react-hook-form'
import { AddressFieldsSection } from '@/components/address/AddressFieldsSection'
import {
  ADDRESS_COMPONENT_KEYS,
  type AddressComponentKey,
  type AddressComponents,
} from '@/lib/address-fields'

interface AddressProfileFieldsProps<T extends AddressComponents> {
  form: UseFormReturn<T>
  inputClassName?: string
}

/** React Hook Form wrapper for profile address fields. */
export function AddressProfileFields<T extends AddressComponents>({
  form,
  inputClassName,
}: AddressProfileFieldsProps<T>) {
  const components = ADDRESS_COMPONENT_KEYS.reduce((acc, key) => {
    acc[key] = (form.watch(key as Path<T>) as string | undefined) ?? ''
    return acc
  }, {} as AddressComponents)

  return (
    <AddressFieldsSection
      value={components}
      onChange={(updates) => {
        for (const [key, value] of Object.entries(updates) as [AddressComponentKey, string][]) {
          form.setValue(key as Path<T>, (value ?? '') as never, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      }}
      inputClassName={inputClassName}
    />
  )
}
