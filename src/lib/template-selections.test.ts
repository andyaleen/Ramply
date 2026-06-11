import { describe, expect, test } from 'vitest'

import { applySelectionMode, getSelectionMode } from './template-selections'

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
})
