/**
 * Reads an environment variable, trimming whitespace and optional wrapping quotes.
 */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim()
  if (!raw) return undefined

  if (
    (raw.startsWith('"') && raw.endsWith('"'))
    || (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim() || undefined
  }

  return raw
}
