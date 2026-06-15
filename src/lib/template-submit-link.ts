/** Builds the permanent public URL for a saved request template. */
export function buildTemplateSubmitUrl(publicToken: string, origin?: string): string {
  const base = (origin ?? (typeof window !== 'undefined' ? window.location.origin : ''))
    .replace(/\/$/, '')
  return `${base}/submit/${publicToken}`
}
