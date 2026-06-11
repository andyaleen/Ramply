export type SelectionMode = 'none' | 'required' | 'optional'

/** Derive how a catalog/custom key is selected in mandatory vs optional lists. */
export function getSelectionMode(
  mandatory: string[] | undefined,
  optional: string[] | undefined,
  value: string
): SelectionMode {
  if (mandatory?.includes(value)) return 'required'
  if (optional?.includes(value)) return 'optional'
  return 'none'
}

/** Apply a single required/optional/none choice, keeping the two lists mutually exclusive. */
export function applySelectionMode(
  mandatory: string[],
  optional: string[],
  value: string,
  mode: SelectionMode
): { mandatory: string[]; optional: string[] } {
  const nextMandatory = mandatory.filter((entry) => entry !== value)
  const nextOptional = optional.filter((entry) => entry !== value)

  if (mode === 'required') nextMandatory.push(value)
  if (mode === 'optional') nextOptional.push(value)

  return { mandatory: nextMandatory, optional: nextOptional }
}
