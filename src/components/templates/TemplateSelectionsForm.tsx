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
import {
  applySelectionMode,
  getSelectionMode,
  type SelectionMode,
} from '@/lib/template-selections'

export type TemplateSelectionValues = {
  mandatory_fields: string[]
  optional_fields: string[]
  mandatory_documents: string[]
  optional_documents: string[]
}

interface TemplateSelectionsFormProps<T extends TemplateSelectionValues> {
  form: UseFormReturn<T>
}

/** Set required/optional/none for one catalog or custom key. */
function setSelectionMode<T extends TemplateSelectionValues>(
  form: UseFormReturn<T>,
  mandatoryKey: keyof TemplateSelectionValues,
  optionalKey: keyof TemplateSelectionValues,
  value: string,
  mode: SelectionMode
) {
  const mandatory = form.getValues(mandatoryKey as Path<T>) as string[]
  const optional = form.getValues(optionalKey as Path<T>) as string[]
  const next = applySelectionMode(mandatory, optional, value, mode)
  form.setValue(mandatoryKey as Path<T>, next.mandatory as never, {
    shouldDirty: true,
    shouldValidate: true,
  })
  form.setValue(optionalKey as Path<T>, next.optional as never, {
    shouldDirty: true,
    shouldValidate: true,
  })
}

interface SelectionRowProps {
  label: string
  mode: SelectionMode
  onModeChange: (mode: SelectionMode) => void
}

function SelectionRow({ label, mode, onModeChange }: SelectionRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="min-w-0 text-xs font-normal">{label}</span>
      <div className="flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <Checkbox
            checked={mode === 'required'}
            onCheckedChange={(checked) => onModeChange(checked ? 'required' : 'none')}
          />
          Required
        </label>
        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <Checkbox
            checked={mode === 'optional'}
            onCheckedChange={(checked) => onModeChange(checked ? 'optional' : 'none')}
          />
          Optional
        </label>
      </div>
    </div>
  )
}

interface OtherSelectionRowProps {
  draftLabel: string
  mode: SelectionMode
  onDraftLabelChange: (value: string) => void
  onModeChange: (mode: SelectionMode) => void
}

function OtherSelectionRow({
  draftLabel,
  mode,
  onDraftLabelChange,
  onModeChange,
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
          <Checkbox
            checked={mode === 'required'}
            onCheckedChange={(checked) => onModeChange(checked ? 'required' : 'none')}
          />
          Required
        </label>
        <label className="flex items-center gap-1 text-xs">
          <Checkbox
            checked={mode === 'optional'}
            onCheckedChange={(checked) => onModeChange(checked ? 'optional' : 'none')}
          />
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
  const [otherFieldMode, setOtherFieldMode] = useState<SelectionMode>('none')
  const [otherDocumentMode, setOtherDocumentMode] = useState<SelectionMode>('none')

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

  function addCustomField(required: boolean): boolean {
    try {
      const key = buildCustomSelectionKey(otherFieldDraft)
      const mandatory = form.getValues('mandatory_fields' as Path<T>) as string[]
      const optional = form.getValues('optional_fields' as Path<T>) as string[]

      if (mandatory.includes(key) || optional.includes(key)) {
        toast.error('That custom field is already added')
        return false
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
      setOtherFieldMode('none')
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a custom field name')
      setOtherFieldMode('none')
      return false
    }
  }

  function addCustomDocument(required: boolean): boolean {
    try {
      const key = buildCustomSelectionKey(otherDocumentDraft)
      const mandatory = form.getValues('mandatory_documents' as Path<T>) as string[]
      const optional = form.getValues('optional_documents' as Path<T>) as string[]

      if (mandatory.includes(key) || optional.includes(key)) {
        toast.error('That custom document is already added')
        return false
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
      setOtherDocumentMode('none')
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a custom document name')
      setOtherDocumentMode('none')
      return false
    }
  }

  function handleOtherFieldModeChange(mode: SelectionMode) {
    if (mode === 'none') {
      setOtherFieldMode('none')
      return
    }
    setOtherFieldMode(mode)
    if (!addCustomField(mode === 'required')) {
      setOtherFieldMode('none')
    }
  }

  function handleOtherDocumentModeChange(mode: SelectionMode) {
    if (mode === 'none') {
      setOtherDocumentMode('none')
      return
    }
    setOtherDocumentMode(mode)
    if (!addCustomDocument(mode === 'required')) {
      setOtherDocumentMode('none')
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
              mode={getSelectionMode(mandatoryFields, optionalFields, key)}
              onModeChange={(mode) =>
                setSelectionMode(form, 'mandatory_fields', 'optional_fields', key, mode)
              }
            />
          ))}
          {customFieldKeys.map((key) => (
            <SelectionRow
              key={key}
              label={customSelectionLabel(key)}
              mode={getSelectionMode(mandatoryFields, optionalFields, key)}
              onModeChange={(mode) =>
                setSelectionMode(form, 'mandatory_fields', 'optional_fields', key, mode)
              }
            />
          ))}
          <OtherSelectionRow
            draftLabel={otherFieldDraft}
            mode={otherFieldMode}
            onDraftLabelChange={setOtherFieldDraft}
            onModeChange={handleOtherFieldModeChange}
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
              mode={getSelectionMode(mandatoryDocuments, optionalDocuments, key)}
              onModeChange={(mode) =>
                setSelectionMode(form, 'mandatory_documents', 'optional_documents', key, mode)
              }
            />
          ))}
          {customDocumentKeys.map((key) => (
            <SelectionRow
              key={key}
              label={customSelectionLabel(key)}
              mode={getSelectionMode(mandatoryDocuments, optionalDocuments, key)}
              onModeChange={(mode) =>
                setSelectionMode(form, 'mandatory_documents', 'optional_documents', key, mode)
              }
            />
          ))}
          <OtherSelectionRow
            draftLabel={otherDocumentDraft}
            mode={otherDocumentMode}
            onDraftLabelChange={setOtherDocumentDraft}
            onModeChange={handleOtherDocumentModeChange}
          />
        </div>
        {documentsError ? <p className="text-sm text-destructive">{documentsError}</p> : null}
      </div>
    </div>
  )
}
