import { describe, expect, it } from 'vitest'

import {
  buildCustomSelectionKey,
  customSelectionLabel,
  documentTypeStorageSegment,
  isValidCustomSelectionKey,
} from '@/lib/custom-selections'

describe('custom selections', () => {
  it('builds and reads custom keys', () => {
    const key = buildCustomSelectionKey('Safety Certificate')
    expect(key).toBe('custom:Safety Certificate')
    expect(customSelectionLabel(key)).toBe('Safety Certificate')
    expect(isValidCustomSelectionKey(key)).toBe(true)
  })

  it('creates a safe storage segment for custom documents', () => {
    expect(documentTypeStorageSegment('custom:Safety Certificate')).toBe('custom/safety-certificate')
    expect(documentTypeStorageSegment('W9')).toBe('W9')
  })
})
