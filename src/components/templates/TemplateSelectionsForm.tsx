'use client'

import { useState } from 'react'
import type { Path, UseFormReturn } from 'react-hook-form'
import { CATALOG_FIELDS, CATALOG_DOCUMENT_TYPES } from '@/lib/catalog'
import {
  buildCustomSelectionKey,
  customSelectionLabel,
  listCustomSelectionKeys,
} from '@/lib/custom-selections'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export type TemplateSelectionValues = {
  mandatory_fields: string[]
  optional_fields: string[]
  mandatory_documents: string[]
  optional_documents: string[]
}

interface TemplateSelectionsFormProps<T extends TemplateSelectionValues> {
  form: UseFormReturn<T>
}

/** Toggle a value on/off in a string list. */
function toggleValue(current: string[], value: string, add: boolean): string[] {
  return add ? [...current, value] : current.filter((k) => k !== value)
}

/** Ensure a value is only in one of the two lists. */
function toggleExclusive<T extends TemplateSelectionValues>(
  form: UseFormReturn<T>,
  listKey: keyof TemplateSelectionValues,
  otherKey: keyof TemplateSelectionValues,
  value: string,
  add: boolean
) {
  const current = form.getValues(listKey as Path<T>) as string[]
  const other = form.getValues(otherKey as Path<T>) as string[]
  const nextCurrent = toggleValue(current, value, add)
  const nextOther = add ? other.filter((v) => v !== value) : other
  form.setValue(listKey as Path<T>, nextCurrent as never, { shouldDirty: true, shouldValidate: true })
  if (add) {
    form.setValue(otherKey as Path<T>, nextOther as never, { shouldDirty: true, shouldValidate: true })
  }
}

interface SelectionRowProps {
  label: string
  isRequired: boolean
  isOptional: boolean
  onRequiredChange: (checked: boolean) => void
  onOptionalChange: (checked: boolean) => void
}

function SelectionRow({
  label,
  isRequired,
  isOptional,
  onRequiredChange,
  onOptionalChange,
}: SelectionRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="min-w-0 text-xs font-normal">{label}</span>
      <div className="flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <Checkbox checked={isRequired} onCheckedChange={(checked) => onRequiredChange(!!checked)} />
          Required
        </label>
        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <Checkbox checked={isOptional} onCheckedChange={(checked) => onOptionalChange(!!checked)} />
          Optional
        </label>
      </div>
    </div>
  )
}

interface OtherSelectionRowProps {
  draftLabel: string
  onDraftLabelChange: (value: string) => void
  onRequiredChange: (checked: boolean) => void
  onOptionalChange: (checked: boolean) => void
}

function OtherSelectionRow({
  draftLabel,
  onDraftLabelChange,
  onRequiredChange,
  onOptionalChange,
}: OtherSelectionRowProps) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-xs font-normal">Other:</span>
        <Input
          value={draftLabel}
          onChange={(event) => onDraftLabelChange(event.target.value)}
          placeholder="Enter a custom name"
          className="h-8 text-xs"
        />
      </div>
      <div className="flex items-center gap-3 sm:shrink-0">
        <label className="flex items-center gap-1 text-xs">
          <Checkbox onCheckedChange={(checked) => onRequiredChange(!!checked)} />
          Required
        </label>
        <label className="flex items-center gap-1 text-xs">
          <Checkbox onCheckedChange={(checked) => onOptionalChange(!!checked)} />
          Optional
        </label>
      </div>
    </div>
  )
}

/** Shared field/document selector for template-based forms. */
export function TemplateSelectionsForm<T extends TemplateSelectionValues>({
  form,
}: TemplateSelectionsFormProps<T>) {
  const [otherFieldDraft, setOtherFieldDraft] = useState('')
  const [otherDocumentDraft, setOtherDocumentDraft] = useState('')

  const mandatoryFields = form.watch('mandatory_fields' as Path<T>) as string[] | undefined
  const optionalFields = form.watch('optional_fields' as Path<T>) as string[] | undefined
  const mandatoryDocuments = form.watch('mandatory_documents' as Path<T>) as string[] | undefined
  const optionalDocuments = form.watch('optional_documents' as Path<T>) as string[] | undefined
  const fieldsError = (form.formState.errors.mandatory_fields?.message
    ?? form.formState.errors.optional_fields?.message) as string | undefined
  const documentsError = (form.formState.errors.mandatory_documents?.message
    ?? form.formState.errors.optional_documents?.message) as string | undefined

  const customFieldKeys = listCustomSelectionKeys(mandatoryFields, optionalFields)
  const customDocumentKeys = listCustomSelectionKeys(mandatoryDocuments, optionalDocuments)

  function addCustomField(required: boolean) {
    try {
      const key = buildCustomSelectionKey(otherFieldDraft)
      const mandatory = form.getValues('mandatory_fields' as Path<T>) as string[]
      const optional = form.getValues('optional_fields' as Path<T>) as string[]

      if (mandatory.includes(key) || optional.includes(key)) {
        toast.error('That custom field is already added')
        return
      }

      if (required) {
        form.setValue('mandatory_fields' as Path<T>, [...mandatory, key] as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      } else {
        form.setValue('optional_fields' as Path<T>, [...optional, key] as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      setOtherFieldDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a custom field name')
    }
  }

  function addCustomDocument(required: boolean) {
    try {
      const key = buildCustomSelectionKey(otherDocumentDraft)
      const mandatory = form.getValues('mandatory_documents' as Path<T>) as string[]
      const optional = form.getValues('optional_documents' as Path<T>) as string[]

      if (mandatory.includes(key) || optional.includes(key)) {
        toast.error('That custom document is already added')
        return
      }

      if (required) {
        form.setValue('mandatory_documents' as Path<T>, [...mandatory, key] as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      } else {
        form.setValue('optional_documents' as Path<T>, [...optional, key] as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      setOtherDocumentDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a custom document name')
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Information Fields</Label>
        <p className="text-xs text-muted-foreground">Mark each field as required or optional</p>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
          {CATALOG_FIELDS.map(({ key, label }) => (
            <SelectionRow
              key={key}
              label={label}
              isRequired={mandatoryFields?.includes(key) ?? false}
              isOptional={optionalFields?.includes(key) ?? false}
              onRequiredChange={(checked) =>
                toggleExclusive(form, 'mandatory_fields', 'optional_fields', key, checked)
              }
              onOptionalChange={(checked) =>
                toggleExclusive(form, 'optional_fields', 'mandatory_fields', key, checked)
              }
            />
          ))}
          {customFieldKeys.map((key) => (
            <SelectionRow
              key={key}
              label={customSelectionLabel(key)}
              isRequired={mandatoryFields?.includes(key) ?? false}
              isOptional={optionalFields?.includes(key) ?? false}
              onRequiredChange={(checked) =>
                toggleExclusive(form, 'mandatory_fields', 'optional_fields', key, checked)
              }
              onOptionalChange={(checked) =>
                toggleExclusive(form, 'optional_fields', 'mandatory_fields', key, checked)
              }
            />
          ))}
          <OtherSelectionRow
            draftLabel={otherFieldDraft}
            onDraftLabelChange={setOtherFieldDraft}
            onRequiredChange={(checked) => {
              if (checked) addCustomField(true)
            }}
            onOptionalChange={(checked) => {
              if (checked) addCustomField(false)
            }}
          />
        </div>
        {fieldsError ? <p className="text-sm text-destructive">{fieldsError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Documents</Label>
        <p className="text-xs text-muted-foreground">Mark each document as required or optional</p>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
          {CATALOG_DOCUMENT_TYPES.map(({ key, label }) => (
            <SelectionRow
              key={key}
              label={label}
              isRequired={mandatoryDocuments?.includes(key) ?? false}
              isOptional={optionalDocuments?.includes(key) ?? false}
              onRequiredChange={(checked) =>
                toggleExclusive(form, 'mandatory_documents', 'optional_documents', key, checked)
              }
              onOptionalChange={(checked) =>
                toggleExclusive(form, 'optional_documents', 'mandatory_documents', key, checked)
              }
            />
          ))}
          {customDocumentKeys.map((key) => (
            <SelectionRow
              key={key}
              label={customSelectionLabel(key)}
              isRequired={mandatoryDocuments?.includes(key) ?? false}
              isOptional={optionalDocuments?.includes(key) ?? false}
              onRequiredChange={(checked) =>
                toggleExclusive(form, 'mandatory_documents', 'optional_documents', key, checked)
              }
              onOptionalChange={(checked) =>
                toggleExclusive(form, 'optional_documents', 'mandatory_documents', key, checked)
              }
            />
          ))}
          <OtherSelectionRow
            draftLabel={otherDocumentDraft}
            onDraftLabelChange={setOtherDocumentDraft}
            onRequiredChange={(checked) => {
              if (checked) addCustomDocument(true)
            }}
            onOptionalChange={(checked) => {
              if (checked) addCustomDocument(false)
            }}
          />
        </div>
        {documentsError ? <p className="text-sm text-destructive">{documentsError}</p> : null}
      </div>
    </div>
  )
}
