'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AddressComponents } from '@/lib/address-fields'
import {
  isStreetLevelAddress,
  mergeAddressComponents,
  parseAddressComponentsFromGoogle,
} from '@/lib/parse-google-address'

const inputClassName =
  'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive'

interface AddressAutocompleteInputProps {
  value: AddressComponents
  onChange: (components: AddressComponents) => void
  placeholder?: string
  className?: string
  id?: string
  'aria-invalid'?: boolean
}

type PlaceSuggestion = {
  placeResourceName: string
  label: string
}

/** Keep suite/unit while clearing other fields so a new search does not reuse old city/state. */
function clearAddressForNewSearch(current: AddressComponents): AddressComponents {
  const suite = current.address_line2?.trim()
  return suite ? { address_line2: suite } : {}
}

/** Address field with server-proxied Google Places autocomplete. */
export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = 'Start typing your address…',
  className,
  id,
  'aria-invalid': ariaInvalid,
}: AddressAutocompleteInputProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const clearedForSearchRef = useRef(false)
  const userEditingRef = useRef(false)
  const debounceRef = useRef<number | null>(null)

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  valueRef.current = value
  onChangeRef.current = onChange

  useEffect(() => {
    let active = true

    fetch('/api/places/autocomplete', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return { enabled: false }
        return response.json() as Promise<{ enabled?: boolean }>
      })
      .then((payload) => {
        if (active) setEnabled(Boolean(payload.enabled))
      })
      .catch(() => {
        if (active) setEnabled(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!userEditingRef.current || !inputRef.current) return
    const nextValue = value.address_line1?.trim() ?? ''
    if (inputRef.current.value !== nextValue) {
      inputRef.current.value = nextValue
    }
  }, [value.address_line1])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/places/autocomplete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query }),
      })

      const payload = (await response.json()) as {
        suggestions?: PlaceSuggestion[]
        error?: string
      }

      if (!response.ok) {
        console.error('Address autocomplete failed:', payload.error)
        setSuggestions([])
        setOpen(false)
        return
      }

      const nextSuggestions = payload.suggestions ?? []
      setSuggestions(nextSuggestions)
      setOpen(nextSuggestions.length > 0)
      setActiveIndex(-1)
    } catch (error) {
      console.error('Address autocomplete failed:', error)
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const scheduleSuggestions = useCallback((query: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(query)
    }, 250)
  }, [fetchSuggestions])

  const selectSuggestion = useCallback(async (suggestion: PlaceSuggestion) => {
    setOpen(false)
    setSuggestions([])

    try {
      const response = await fetch(
        `/api/places/details?place=${encodeURIComponent(suggestion.placeResourceName)}`,
        { credentials: 'same-origin' }
      )
      const payload = (await response.json()) as { addressComponents?: unknown; error?: string }
      if (!response.ok) {
        console.error('Place details failed:', payload.error)
        return
      }

      const parsed = parseAddressComponentsFromGoogle(payload.addressComponents)
      if (!isStreetLevelAddress(parsed)) return

      onChangeRef.current(mergeAddressComponents(valueRef.current, parsed))
      clearedForSearchRef.current = false
      userEditingRef.current = false

      if (inputRef.current) {
        inputRef.current.value = parsed.address_line1?.trim() ?? suggestion.label
      }
    } catch (error) {
      console.error('Place details failed:', error)
    }
  }, [])

  const handleFocus = () => {
    userEditingRef.current = true
    inputRef.current?.select()
  }

  const handleBlur = () => {
    userEditingRef.current = false
  }

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    userEditingRef.current = true
    const nextLine1 = event.currentTarget.value

    if (!clearedForSearchRef.current) {
      clearedForSearchRef.current = true
      onChangeRef.current(clearAddressForNewSearch(valueRef.current))
    }

    onChangeRef.current({ ...valueRef.current, address_line1: nextLine1 })

    if (enabled) {
      scheduleSuggestions(nextLine1)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      void selectSuggestion(suggestions[activeIndex])
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        defaultValue={value.address_line1 ?? ''}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(inputClassName, className)}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-busy={enabled === null || loading}
      />

      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-[10050] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-popover py-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeResourceName} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  index === activeIndex && 'bg-accent text-accent-foreground'
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
