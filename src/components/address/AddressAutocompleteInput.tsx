'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AddressComponents } from '@/lib/address-fields'
import { loadGooglePlacesLibrary, resolveGooglePlacesApiKey } from '@/lib/google-maps-loader'
import {
  isStreetLevelAddress,
  mergeAddressComponents,
  parseAddressComponentsFromGoogle,
} from '@/lib/parse-google-address'

const manualInputClassName =
  'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive'

interface AddressAutocompleteInputProps {
  value: AddressComponents
  onChange: (components: AddressComponents) => void
  placeholder?: string
  className?: string
  id?: string
  'aria-invalid'?: boolean
}

type InputMode = 'loading' | 'widget' | 'manual'

/** Keep suite/unit while clearing other fields so a new search does not reuse old city/state. */
function clearAddressForNewSearch(current: AddressComponents): AddressComponents {
  const suite = current.address_line2?.trim()
  return suite ? { address_line2: suite } : {}
}

/** Address field powered by Google Places (New) with manual text fallback. */
export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = 'Start typing your address…',
  className,
  id,
  'aria-invalid': ariaInvalid,
}: AddressAutocompleteInputProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const widgetRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const clearedForSearchRef = useRef(false)
  const userEditingRef = useRef(false)

  const [mode, setMode] = useState<InputMode>('loading')

  valueRef.current = value
  onChangeRef.current = onChange

  useEffect(() => {
    let active = true

    const mountWidget = async () => {
      const apiKey = await resolveGooglePlacesApiKey()
      if (!active) return

      if (!apiKey) {
        setMode('manual')
        return
      }

      try {
        const placesLibrary = await loadGooglePlacesLibrary()
        if (!active || !hostRef.current) return

        const PlaceAutocompleteElement = placesLibrary.PlaceAutocompleteElement
        if (!PlaceAutocompleteElement) {
          setMode('manual')
          return
        }

        const widget = new PlaceAutocompleteElement({
          includedRegionCodes: ['us'],
        })
        widget.placeholder = placeholder

        const handleSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
          const place = event.placePrediction?.toPlace()
          if (!place) return

          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress'],
          })

          const parsed = parseAddressComponentsFromGoogle(place.addressComponents)
          if (!isStreetLevelAddress(parsed)) return

          const merged = mergeAddressComponents(valueRef.current, parsed)
          onChangeRef.current(merged)
          clearedForSearchRef.current = false
          userEditingRef.current = false
        }

        const handleInput = () => {
          userEditingRef.current = true
          if (!clearedForSearchRef.current) {
            clearedForSearchRef.current = true
            onChangeRef.current(clearAddressForNewSearch(valueRef.current))
          }
        }

        const handleError = (event: Event) => {
          console.error('Google Places autocomplete error:', event)
        }

        widget.addEventListener('gmp-select', handleSelect)
        widget.addEventListener('input', handleInput)
        widget.addEventListener('gmp-error', handleError)

        hostRef.current.replaceChildren(widget)
        widgetRef.current = widget
        setMode('widget')
      } catch (error) {
        console.error('Failed to load Google Places autocomplete:', error)
        if (active) setMode('manual')
      }
    }

    void mountWidget()

    return () => {
      active = false
      widgetRef.current = null
    }
  }, [placeholder])

  useEffect(() => {
    if (mode !== 'manual' || userEditingRef.current || !manualInputRef.current) return

    const nextValue = value.address_line1?.trim() ?? ''
    if (manualInputRef.current.value !== nextValue) {
      manualInputRef.current.value = nextValue
    }
  }, [mode, value.address_line1])

  const handleManualFocus = () => {
    userEditingRef.current = true
    manualInputRef.current?.select()
  }

  const handleManualBlur = () => {
    userEditingRef.current = false
  }

  const handleManualInput = () => {
    userEditingRef.current = true

    if (!clearedForSearchRef.current) {
      clearedForSearchRef.current = true
      onChangeRef.current(clearAddressForNewSearch(valueRef.current))
    }
  }

  const handleManualChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    userEditingRef.current = true
    const nextLine1 = event.target.value

    if (!clearedForSearchRef.current) {
      clearedForSearchRef.current = true
      const cleared = clearAddressForNewSearch(valueRef.current)
      onChangeRef.current({ ...cleared, address_line1: nextLine1 })
      return
    }

    onChangeRef.current({ ...valueRef.current, address_line1: nextLine1 })
  }

  if (mode === 'manual') {
    return (
      <input
        ref={manualInputRef}
        id={id}
        type="text"
        defaultValue={value.address_line1 ?? ''}
        onFocus={handleManualFocus}
        onBlur={handleManualBlur}
        onInput={handleManualInput}
        onChange={handleManualChange}
        placeholder={placeholder}
        className={cn(manualInputClassName, className)}
        aria-invalid={ariaInvalid}
        autoComplete="off"
      />
    )
  }

  return (
    <div
      ref={hostRef}
      id={id}
      className={cn('address-autocomplete-host min-h-9', className)}
      aria-invalid={ariaInvalid}
      aria-busy={mode === 'loading'}
    />
  )
}
