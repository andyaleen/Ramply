import { describe, expect, test } from 'vitest'

import {
  applyBulkOptionalSelection,
  applyBulkRequiredSelection,
  applySelectionMode,
  getBulkOptionalState,
  getBulkRequiredState,
  getSelectionMode,
} from './template-selections'

describe('template selections', () => {
  test('getSelectionMode prefers required when a key appears in both lists', () => {
    expect(getSelectionMode(['legal_name'], ['legal_name'], 'legal_name')).toBe('required')
  })

  test('applySelectionMode keeps required and optional mutually exclusive', () => {
    let mandatory = ['legal_name']
    let optional = ['legal_name', 'ein']

    ;({ mandatory, optional } = applySelectionMode(mandatory, optional, 'legal_name', 'optional'))
    expect(mandatory).toEqual([])
    expect(optional).toEqual(['ein', 'legal_name'])

    ;({ mandatory, optional } = applySelectionMode(mandatory, optional, 'ein', 'required'))
    expect(mandatory).toEqual(['ein'])
    expect(optional).toEqual(['legal_name'])

    ;({ mandatory, optional } = applySelectionMode(mandatory, optional, 'ein', 'none'))
    expect(mandatory).toEqual([])
    expect(optional).toEqual(['legal_name'])
  })

  test('bulk required selection marks every key required and clears optional overlaps', () => {
    const result = applyBulkRequiredSelection([], ['legal_name', 'ein'], ['legal_name', 'ein', 'dba_name'], true)

    expect(result.mandatory).toEqual(['legal_name', 'ein', 'dba_name'])
    expect(result.optional).toEqual([])
  })

  test('bulk optional selection marks every key optional and clears required', () => {
    const result = applyBulkOptionalSelection(['legal_name'], ['ein'], ['legal_name', 'dba_name'], true)

    expect(result.mandatory).toEqual([])
    expect(result.optional).toEqual(['ein', 'legal_name', 'dba_name'])
  })

  test('bulk state reflects partial selections as indeterminate', () => {
    expect(getBulkRequiredState(['legal_name', 'ein'], ['legal_name'], [])).toBe('indeterminate')
    expect(getBulkOptionalState(['legal_name', 'ein'], [], ['ein'])).toBe('indeterminate')
    expect(getBulkRequiredState(['legal_name', 'ein'], ['legal_name', 'ein'], [])).toBe(true)
  })
})
