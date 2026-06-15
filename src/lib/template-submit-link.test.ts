import { describe, expect, it } from 'vitest'
import { buildTemplateSubmitUrl } from '@/lib/template-submit-link'

describe('buildTemplateSubmitUrl', () => {
  it('builds a submit URL from a public token', () => {
    expect(buildTemplateSubmitUrl('abc123', 'https://ramply.org')).toBe('https://ramply.org/submit/abc123')
  })

  it('strips trailing slashes from the origin', () => {
    expect(buildTemplateSubmitUrl('abc123', 'https://ramply.org/')).toBe('https://ramply.org/submit/abc123')
  })
})
