export const CUSTOM_SELECTION_PREFIX = 'custom:'

const MAX_CUSTOM_LABEL_LENGTH = 100

/** True when a selection key was created from the Other field. */
export function isCustomSelectionKey(key: string): boolean {
  return key.startsWith(CUSTOM_SELECTION_PREFIX)
}

/** Display label for a catalog or custom selection key. */
export function customSelectionLabel(key: string): string {
  if (!isCustomSelectionKey(key)) return key
  return key.slice(CUSTOM_SELECTION_PREFIX.length)
}

/** Build a persisted key for a user-defined field or document name. */
export function buildCustomSelectionKey(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) {
    throw new Error('Custom name is required')
  }
  if (trimmed.length > MAX_CUSTOM_LABEL_LENGTH) {
    throw new Error(`Custom name must be ${MAX_CUSTOM_LABEL_LENGTH} characters or fewer`)
  }
  return `${CUSTOM_SELECTION_PREFIX}${trimmed}`
}

/** Validate a custom selection key created from the Other row. */
export function isValidCustomSelectionKey(key: string): boolean {
  if (!isCustomSelectionKey(key)) return false
  const label = customSelectionLabel(key).trim()
  return label.length >= 1 && label.length <= MAX_CUSTOM_LABEL_LENGTH
}

/** True when a key belongs to the catalog or a valid custom selection. */
export function isAllowedSelectionKey(key: string, catalogKeys: readonly string[]): boolean {
  return catalogKeys.includes(key) || isValidCustomSelectionKey(key)
}

/** Collect unique custom selection keys from mandatory and optional lists. */
export function listCustomSelectionKeys(
  mandatory: string[] | undefined,
  optional: string[] | undefined
): string[] {
  const keys = new Set<string>()
  for (const key of [...(mandatory ?? []), ...(optional ?? [])]) {
    if (isCustomSelectionKey(key)) keys.add(key)
  }
  return [...keys]
}

/** Storage-safe path segment for a document type (catalog or custom). */
export function documentTypeStorageSegment(docType: string): string {
  if (!isCustomSelectionKey(docType)) return docType
  const slug = customSelectionLabel(docType)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
  return slug ? `custom/${slug}` : 'custom/other'
}
