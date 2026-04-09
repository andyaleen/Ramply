import { US_STATES } from '@/lib/us-states'
import type { FieldKey } from '@/lib/catalog'

type TextAnchor = {
  textSegments?: Array<{ startIndex?: number; endIndex?: number }>
}

type DocumentPageLine = {
  layout?: {
    textAnchor?: TextAnchor
  }
}

type DocumentPage = {
  lines?: DocumentPageLine[]
}

type DocumentAiJson = {
  text?: string
  pages?: DocumentPage[]
}

const STATE_BY_LABEL = new Map(
  US_STATES.map((state) => [state.label.toLowerCase(), state.value])
)

function textFromAnchor(text: string, anchor?: TextAnchor): string {
  if (!anchor?.textSegments?.length) return ''
  return anchor.textSegments
    .map((segment) => text.slice(segment.startIndex ?? 0, segment.endIndex ?? 0))
    .join('')
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function collectLines(doc: DocumentAiJson): string[] {
  const text = doc.text ?? ''
  const pages = doc.pages ?? []
  const lines: string[] = []

  for (const page of pages) {
    for (const line of page.lines ?? []) {
      const raw = textFromAnchor(text, line.layout?.textAnchor)
      const normalized = normalizeLine(raw)
      if (normalized) lines.push(normalized)
    }
  }

  return lines
}

function findLineAfter(lines: string[], matcher: RegExp): string | null {
  const index = lines.findIndex((line) => matcher.test(line))
  if (index === -1) return null
  for (let i = index + 1; i < lines.length; i += 1) {
    if (lines[i]) return lines[i]
  }
  return null
}

function normalizeState(stateText: string): string {
  const trimmed = stateText.trim()
  const upper = trimmed.toUpperCase()
  if (upper.length === 2) return upper
  return STATE_BY_LABEL.get(trimmed.toLowerCase()) ?? trimmed
}

function extractEinFromText(text: string): string | null {
  const match = text.match(/\b(\d{2})[- ]?(\d{7})\b/)
  if (!match) return null
  return `${match[1]}-${match[2]}`
}

function extractEinFromLines(lines: string[]): string | null {
  const index = lines.findIndex((line) => line === 'Employer identification number')
  if (index === -1) return null

  const window = lines.slice(index + 1, index + 6)
  const digits = window
    .flatMap((line) => line.split(/\s+/))
    .filter((token) => /^\d+$/.test(token))
    .join('')

  if (digits.length < 9) return null
  const einDigits = digits.slice(0, 9)
  return `${einDigits.slice(0, 2)}-${einDigits.slice(2)}`
}

function parseCityStateZip(value: string): {
  city?: string
  state?: string
  postal_code?: string
} {
  const match = value.match(/^(.+),\s*([A-Za-z]{2,})\s+(\d{5}(?:-\d{4})?)$/)
  if (!match) return {}

  return {
    city: match[1].trim(),
    state: normalizeState(match[2]),
    postal_code: match[3],
  }
}

/**
 * Extracts normalized fields from a W-9 Document AI JSON payload.
 * Returns only fields that were found.
 */
export function extractW9Fields(
  documentJson: Record<string, unknown>,
  rawText: string
): Partial<Record<FieldKey, string>> {
  const doc = documentJson as DocumentAiJson
  const lines = collectLines(doc)

  const legalName = findLineAfter(
    lines,
    /^1 Name of entity\/individual/i
  )

  const dbaName = findLineAfter(
    lines,
    /^2 Business name\/disregarded entity name/i
  )

  const addressLine1 = findLineAfter(
    lines,
    /^5 Address \(number, street, and apt\. or suite no\.\)/i
  )

  const cityStateZipLine = findLineAfter(
    lines,
    /^6 City, state, and ZIP code/i
  )

  const { city, state, postal_code } = cityStateZipLine
    ? parseCityStateZip(cityStateZipLine)
    : {}

  const ein = extractEinFromText(rawText) ?? extractEinFromLines(lines)

  const fields: Partial<Record<FieldKey, string>> = {}

  if (legalName) fields.legal_name = legalName
  fields.dba_name = dbaName ?? ''
  if (ein) fields.ein = ein
  if (addressLine1) fields.address_line1 = addressLine1
  if (city) fields.city = city
  if (state) fields.state = state
  if (postal_code) fields.postal_code = postal_code

  return fields
}
