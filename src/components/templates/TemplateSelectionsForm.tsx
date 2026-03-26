'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { FieldKey, DocumentTypeKey } from '@/lib/catalog'
import { CATALOG_FIELDS, CATALOG_DOCUMENT_TYPES } from '@/lib/catalog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export type TemplateSelectionValues = {
  mandatory_fields: FieldKey[]
  optional_fields: FieldKey[]
  mandatory_documents: DocumentTypeKey[]
  optional_documents: DocumentTypeKey[]
}

interface TemplateSelectionsFormProps {
  form: UseFormReturn<TemplateSelectionValues>
}

/** Toggle a field value on/off in a list. */
function toggleFieldValue(current: FieldKey[], value: FieldKey, add: boolean): FieldKey[] {
  return add ? [...current, value] : current.filter((k) => k !== value)
}

/** Toggle a document value on/off in a list. */
function toggleDocValue(current: DocumentTypeKey[], value: DocumentTypeKey, add: boolean): DocumentTypeKey[] {
  return add ? [...current, value] : current.filter((k) => k !== value)
}

/** Ensure a field is only in one of the two lists. */
function toggleFieldExclusive(
  form: UseFormReturn<TemplateSelectionValues>,
  listKey: 'mandatory_fields' | 'optional_fields',
  otherKey: 'mandatory_fields' | 'optional_fields',
  value: FieldKey,
  add: boolean
) {
  const current = form.getValues(listKey)
  const other = form.getValues(otherKey)
  const nextCurrent = toggleFieldValue(current, value, add)
  const nextOther = add ? other.filter((v) => v !== value) : other
  form.setValue(listKey, nextCurrent, { shouldDirty: true })
  if (add) {
    form.setValue(otherKey, nextOther, { shouldDirty: true })
  }
}

/** Ensure a document is only in one of the two lists. */
function toggleDocExclusive(
  form: UseFormReturn<TemplateSelectionValues>,
  listKey: 'mandatory_documents' | 'optional_documents',
  otherKey: 'mandatory_documents' | 'optional_documents',
  value: DocumentTypeKey,
  add: boolean
) {
  const current = form.getValues(listKey)
  const other = form.getValues(otherKey)
  const nextCurrent = toggleDocValue(current, value, add)
  const nextOther = add ? other.filter((v) => v !== value) : other
  form.setValue(listKey, nextCurrent, { shouldDirty: true })
  if (add) {
    form.setValue(otherKey, nextOther, { shouldDirty: true })
  }
}

/** Shared field/document selector for template-based forms. */
export function TemplateSelectionsForm({
  form,
}: TemplateSelectionsFormProps) {
  const mandatoryFields = form.watch('mandatory_fields')
  const optionalFields = form.watch('optional_fields')
  const mandatoryDocuments = form.watch('mandatory_documents')
  const optionalDocuments = form.watch('optional_documents')
  const fieldsError = (form.formState.errors.mandatory_fields?.message
    ?? form.formState.errors.optional_fields?.message) as string | undefined
  const documentsError = (form.formState.errors.mandatory_documents?.message
    ?? form.formState.errors.optional_documents?.message) as string | undefined

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Information Fields</Label>
        <p className="text-xs text-muted-foreground">Mark each field as required or optional</p>
        <div className="space-y-2 max-h-56 overflow-y-auto border rounded-md p-3">
          {CATALOG_FIELDS.map(({ key, label }) => {
            const isRequired = mandatoryFields?.includes(key as FieldKey)
            const isOptional = optionalFields?.includes(key as FieldKey)
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-xs font-normal">{label}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={isRequired}
                      onCheckedChange={(checked) =>
                        toggleFieldExclusive(form, 'mandatory_fields', 'optional_fields', key as FieldKey, !!checked)
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={isOptional}
                      onCheckedChange={(checked) =>
                        toggleFieldExclusive(form, 'optional_fields', 'mandatory_fields', key as FieldKey, !!checked)
                      }
                    />
                    Optional
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        {fieldsError && (
          <p className="text-sm text-destructive">{fieldsError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Documents</Label>
        <p className="text-xs text-muted-foreground">Mark each document as required or optional</p>
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {CATALOG_DOCUMENT_TYPES.map(({ key, label }) => {
            const isRequired = mandatoryDocuments?.includes(key as DocumentTypeKey)
            const isOptional = optionalDocuments?.includes(key as DocumentTypeKey)
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-xs font-normal">{label}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={isRequired}
                      onCheckedChange={(checked) =>
                        toggleDocExclusive(form, 'mandatory_documents', 'optional_documents', key as DocumentTypeKey, !!checked)
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={isOptional}
                      onCheckedChange={(checked) =>
                        toggleDocExclusive(form, 'optional_documents', 'mandatory_documents', key as DocumentTypeKey, !!checked)
                      }
                    />
                    Optional
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        {documentsError && (
          <p className="text-sm text-destructive">{documentsError}</p>
        )}
      </div>
    </div>
  )
}
