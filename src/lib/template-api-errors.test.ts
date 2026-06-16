import { describe, expect, test } from 'vitest'

import { isMissingCreateTemplateRpc } from '@/lib/create-request-template'
import { formatTemplateApiError, formatTemplateValidationError } from '@/lib/template-api-errors'
import { TemplateSchema } from '@/lib/validations'

describe('template API helpers', () => {
  test('detects a missing create_request_template RPC', () => {
    expect(isMissingCreateTemplateRpc({ code: 'PGRST202' })).toBe(true)
    expect(isMissingCreateTemplateRpc({ message: 'create_request_template not found' })).toBe(true)
    expect(isMissingCreateTemplateRpc({ message: 'other error' })).toBe(false)
  })

  test('formats flattened validation errors from the API', () => {
    expect(
      formatTemplateApiError(
        {
          error: {
            formErrors: [],
            fieldErrors: {
              mandatory_fields: ['Select at least one field or document'],
            },
          },
        },
        'Failed to save template'
      )
    ).toBe('Select at least one field or document')
  })

  test('requires at least one field or document when saving a template', () => {
    const parsed = TemplateSchema.safeParse({
      name: 'Vendor basics',
      mandatory_fields: [],
      optional_fields: [],
      mandatory_documents: [],
      optional_documents: [],
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(formatTemplateValidationError(parsed.error)).toMatch(/at least one field or document/i)
    }
  })
})
