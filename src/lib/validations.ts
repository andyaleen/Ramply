import { z } from 'zod'
import type { FieldKey, DocumentTypeKey } from './catalog'
import { CATALOG_FIELDS, CATALOG_DOCUMENT_TYPES } from './catalog'

const fieldKeys = CATALOG_FIELDS.map(f => f.key) as [FieldKey, ...FieldKey[]]
const docTypeKeys = CATALOG_DOCUMENT_TYPES.map(d => d.key) as [DocumentTypeKey, ...DocumentTypeKey[]]

// Company profile — all standardized fields, all optional except legal_name
export const CompanyProfileSchema = z.object({
  legal_name: z.string().trim().min(1, 'Legal business name is required'),
  dba_name: z.string().optional(),
  ein: z.string().trim().min(1, 'EIN / Tax ID is required'),
  business_type: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().trim().min(1, 'Contact name is required'),
  contact_email: z.string().email('Valid email required').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_routing_number: z.string().optional(),
  website: z.string().optional(),
  year_founded: z.string().optional(),
})

// Share request — what fields/docs are being requested
export const ShareRequestSchema = z.object({
  request_type: z.string().trim().min(1, 'Type of request is required'),
  recipient_email: z.string().trim().min(1, 'Recipient email is required').email('Valid email is required'),
  mandatory_fields: z.array(z.enum(fieldKeys)).min(0),
  optional_fields: z.array(z.enum(fieldKeys)).min(0),
  mandatory_documents: z.array(z.enum(docTypeKeys)).min(0),
  optional_documents: z.array(z.enum(docTypeKeys)).min(0),
  expires_at: z.string().optional(),
}).superRefine((value, ctx) => {
  const total =
    value.mandatory_fields.length +
    value.optional_fields.length +
    value.mandatory_documents.length +
    value.optional_documents.length

  if (total === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one field or document',
      path: ['mandatory_fields'],
    })
  }

  const overlap = (a: string[], b: string[]) => a.filter((v) => b.includes(v))
  if (overlap(value.mandatory_fields, value.optional_fields).length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fields cannot be both mandatory and optional',
      path: ['optional_fields'],
    })
  }
  if (overlap(value.mandatory_documents, value.optional_documents).length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Documents cannot be both mandatory and optional',
      path: ['optional_documents'],
    })
  }
})

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>
export type ShareRequest = z.infer<typeof ShareRequestSchema>

// Request templates - reusable field/document bundles
export const TemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  mandatory_fields: z.array(z.enum(fieldKeys)).min(0),
  optional_fields: z.array(z.enum(fieldKeys)).min(0),
  mandatory_documents: z.array(z.enum(docTypeKeys)).min(0),
  optional_documents: z.array(z.enum(docTypeKeys)).min(0),
}).superRefine((value, ctx) => {
  const total =
    value.mandatory_fields.length +
    value.optional_fields.length +
    value.mandatory_documents.length +
    value.optional_documents.length

  if (total === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one field or document',
      path: ['mandatory_fields'],
    })
  }

  const overlap = (a: string[], b: string[]) => a.filter((v) => b.includes(v))
  if (overlap(value.mandatory_fields, value.optional_fields).length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fields cannot be both mandatory and optional',
      path: ['optional_fields'],
    })
  }
  if (overlap(value.mandatory_documents, value.optional_documents).length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Documents cannot be both mandatory and optional',
      path: ['optional_documents'],
    })
  }
})
export type TemplateFormValues = z.infer<typeof TemplateSchema>

// Flat arrays of keys for checkbox UIs
export const DOCUMENT_TYPES: string[] = CATALOG_DOCUMENT_TYPES.map(d => d.key)
export const FIELD_TYPES: string[] = CATALOG_FIELDS.map(f => f.key)

// Onboarding type (admin creates these)
export const OnboardingTypeSchema = z.object({
  name: z.string().min(1, 'Flow name is required'),
  description: z.string().optional(),
  required_fields: z.array(z.string()).default([]),
  required_documents: z.array(z.string()).default([]),
})
export type OnboardingType = z.infer<typeof OnboardingTypeSchema>

// Onboarding request (admin sends to a recipient)
export const OnboardingRequestSchema = z.object({
  request_type: z.string().trim().min(1, 'Type of request is required'),
  recipient_email: z.string().trim().min(1, 'Recipient email is required').email('Valid email is required'),
})
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>

