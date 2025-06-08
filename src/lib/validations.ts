import { z } from 'zod'

export const UserProfileSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email('Valid email is required'),
  tax_id: z.string().optional(),
  business_type: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

export const OnboardingTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  required_fields: z.array(z.string()),
  required_documents: z.array(z.string()),
})

export const OnboardingRequestSchema = z.object({
  onboarding_type_id: z.string().uuid(),
  recipient_email: z.string().email('Valid email is required'),
  expires_at: z.string().optional(),
})

export const DocumentUploadSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  file: z.any(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>
export type OnboardingType = z.infer<typeof OnboardingTypeSchema>
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>

// Predefined document types
export const DOCUMENT_TYPES = [
  'W9',
  'Insurance Certificate',
  'Business License',
  'Tax Certificate',
  'Resale Certificate',
  'Credit References',
  'Bank Information',
  'Other',
] as const

// Predefined field types
export const FIELD_TYPES = [
  'Company Information',
  'Contact Details',
  'Tax Information',
  'Banking Information',
  'Insurance Information',
  'Certifications',
] as const
