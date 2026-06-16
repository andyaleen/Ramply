import type { ZodError } from 'zod'

/** Turn template API validation payloads into a readable client message. */
export function formatTemplateApiError(payload: { error?: unknown } | null, fallback: string): string {
  const error = payload?.error
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object' && 'formErrors' in error) {
    const flattened = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> }
    const messages = [
      ...(flattened.formErrors ?? []),
      ...Object.values(flattened.fieldErrors ?? {}).flat(),
    ].filter(Boolean)

    if (messages.length > 0) {
      return messages[0]!
    }
  }

  return fallback
}

/** Summarize client-side template validation failures for toast messages. */
export function formatTemplateValidationError(error: ZodError): string {
  const firstIssue = error.issues[0]
  return firstIssue?.message ?? 'Template validation failed.'
}
