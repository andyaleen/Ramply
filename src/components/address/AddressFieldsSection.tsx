'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddressAutocompleteInput } from '@/components/address/AddressAutocompleteInput'
import type { AddressComponents } from '@/lib/address-fields'

interface AddressFieldsSectionProps {
  value: AddressComponents
  onChange: (components: AddressComponents) => void
  inputClassName?: string
  showSuiteField?: boolean
  addressLabel?: string
  suiteLabel?: string
  addressInvalid?: boolean
  hideLabel?: boolean
}

/** Address entry with Google autocomplete plus optional Suite / Unit field. */
export function AddressFieldsSection({
  value,
  onChange,
  inputClassName,
  showSuiteField = true,
  addressLabel = 'Address',
  suiteLabel = 'Suite / Unit',
  addressInvalid = false,
  hideLabel = false,
}: AddressFieldsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {hideLabel ? null : <Label>{addressLabel}</Label>}
        <AddressAutocompleteInput
          value={value}
          onChange={onChange}
          className={inputClassName}
          aria-invalid={addressInvalid}
        />
      </div>
      {showSuiteField ? (
        <div className="space-y-2">
          <Label htmlFor="address-suite-unit">{suiteLabel}</Label>
          <Input
            id="address-suite-unit"
            value={value.address_line2 ?? ''}
            onChange={(event) => onChange({ ...value, address_line2: event.target.value })}
            placeholder="Suite 100"
            className={inputClassName}
          />
        </div>
      ) : null}
    </div>
  )
}
