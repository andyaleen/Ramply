import { describe, expect, test } from 'vitest'

import {
  buildLogoStoragePath,
  isUserOwnedLogoPath,
  validateLogoFile,
} from './company-logo-upload'

describe('validateLogoFile', () => {
  test('accepts supported image types within the size limit', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' })
    expect(validateLogoFile(file)).toBeNull()
  })

  test('rejects unsupported mime types', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.pdf', { type: 'application/pdf' })
    expect(validateLogoFile(file)).toContain('PNG')
  })
})

describe('buildLogoStoragePath', () => {
  test('stores logos in the user logo folder with a stable filename', () => {
    const file = new File([new Uint8Array([1])], 'Brand Logo.png', { type: 'image/png' })
    expect(buildLogoStoragePath('user-123', file)).toBe('user-123/logo/logo.png')
  })
})

describe('isUserOwnedLogoPath', () => {
  test('accepts only logo paths in the signed-in user folder', () => {
    expect(isUserOwnedLogoPath('user-123/logo/logo.png', 'user-123')).toBe(true)
    expect(isUserOwnedLogoPath('other-user/logo/logo.png', 'user-123')).toBe(false)
  })
})
