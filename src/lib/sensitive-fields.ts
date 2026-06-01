/** Masks a sensitive string for display, showing only the last few characters. */
export function maskSensitiveValue(
  value: string | null | undefined,
  visibleTail = 4
): string {
  if (!value?.trim()) return ''
  const trimmed = value.trim()
  if (trimmed.length <= visibleTail) {
    return '•'.repeat(trimmed.length)
  }
  return `${'•'.repeat(trimmed.length - visibleTail)}${trimmed.slice(-visibleTail)}`
}

/** Masks an EIN for display (e.g. ••-•••6789). */
export function maskEin(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return maskSensitiveValue(value.replace(/\D/g, ''), 4)
}
