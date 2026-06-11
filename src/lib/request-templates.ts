import type { RequestTemplateRow } from '@/lib/database.types'
import type { TemplateFormValues } from '@/lib/validations'

/** React Query key scoped to the signed-in company so account switches never reuse cache. */
export function requestTemplatesQueryKey(companyId: string | undefined) {
  return ['request-templates', companyId] as const
}

/**
 * Load all saved request templates for the current company.
 */
export async function fetchRequestTemplates(): Promise<RequestTemplateRow[]> {
  const res = await fetch('/api/templates', { credentials: 'include' })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? 'Failed to load templates')
  }
  return res.json() as Promise<RequestTemplateRow[]>
}

/**
 * Create or update a request template.
 */
export async function saveRequestTemplate(
  values: TemplateFormValues,
  templateId?: string
): Promise<RequestTemplateRow> {
  const url = templateId ? `/api/templates?id=${templateId}` : '/api/templates'
  const method = templateId ? 'PUT' : 'POST'
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(values),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(typeof err.error === 'string' ? err.error : 'Failed to save template')
  }

  return res.json() as Promise<RequestTemplateRow>
}

/**
 * Delete a request template by ID.
 */
export async function removeRequestTemplate(templateId: string) {
  const res = await fetch(`/api/templates?id=${templateId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete template')
  }
}

/**
 * Count the number of selected fields and documents on a template.
 */
export function countTemplateSelections(template: RequestTemplateRow): { fields: number; documents: number } {
  return {
    fields: (template.mandatory_fields?.length ?? 0) + (template.optional_fields?.length ?? 0),
    documents: (template.mandatory_documents?.length ?? 0) + (template.optional_documents?.length ?? 0),
  }
}
