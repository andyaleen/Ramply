import { z } from "zod";
import { customSelectionLabel, isCustomSelectionKey } from '@/lib/custom-selections'

export const ADDRESS_CATALOG_KEY = 'address' as const

export const CATALOG_FIELDS = [
  { key: 'legal_name',           label: 'Legal Business Name' },
  { key: 'dba_name',             label: 'DBA / Trade Name' },
  { key: 'ein',                  label: 'EIN / Tax ID' },
  { key: 'business_type',        label: 'Business Type' },
  { key: 'naics',                label: 'NAICS Classification' },
  { key: ADDRESS_CATALOG_KEY,    label: 'Business Address' },
  { key: 'contact_name',         label: 'Primary Contact Name' },
  { key: 'contact_email',        label: 'Contact Email' },
  { key: 'contact_phone',        label: 'Contact Phone' },
  { key: 'bank_name',            label: 'Bank Name' },
  { key: 'bank_account_number',  label: 'Bank Account Number' },
  { key: 'bank_routing_number',  label: 'Routing Number' },
  { key: 'website',              label: 'Website' },
  { key: 'year_founded',         label: 'Year Founded' },
  
  // Accounting Information
  { key: 'accounting_name',      label: 'Accounting Contact Name' },
  { key: 'accounting_email',     label: 'Accounting Contact Email' },
  { key: 'accounting_phone',     label: 'Accounting Contact Phone' },
  
  // Payment Details
  { key: 'payment_terms',        label: 'Payment Terms' },
  { key: 'payment_method',       label: 'Preferred Payment Method' },
  
  // Vendor References (Freeform block)
  { key: 'vendor_references',    label: 'Vendor References (Names, Emails, Phones, Years)' },
] as const

export const CATALOG_DOCUMENT_TYPES = [
  { key: 'W9',                       label: 'W-9 Form' },
  { key: 'liability_insurance',      label: 'Liability Insurance' },
  { key: 'resale_cert',              label: 'Resale Certificate' },
  { key: 'bank_reference',           label: 'Bank Reference Letter' },
  { key: 'insurance_cert',           label: 'Certificate of Insurance' },
  { key: 'articles_of_incorporation',label: 'Articles of Incorporation' },
  { key: 'voided_check',             label: 'Voided Check' },
] as const

/** Retired field keys kept for labels and validation on existing requests. */
export const LEGACY_CATALOG_FIELD_KEYS = ['bank_reference_email'] as const

/** Retired document keys kept for labels and validation on existing requests. */
export const LEGACY_CATALOG_DOCUMENT_KEYS = ['business_license'] as const

const LEGACY_FIELD_LABELS: Record<string, string> = {
  bank_reference_email: 'Bank Contact Email',
}

const LEGACY_DOCUMENT_LABELS: Record<string, string> = {
  business_license: 'Business License',
}

export type FieldKey = (typeof CATALOG_FIELDS)[number]["key"];
export type DocumentTypeKey = (typeof CATALOG_DOCUMENT_TYPES)[number]["key"];

// Zod enums for easy validation
export const fieldKeySchema = z.enum([
  CATALOG_FIELDS[0].key,
  ...CATALOG_FIELDS.slice(1).map((f) => f.key),
] as [string, ...string[]]);

export const documentTypeKeySchema = z.enum([
  CATALOG_DOCUMENT_TYPES[0].key,
  ...CATALOG_DOCUMENT_TYPES.slice(1).map((d) => d.key),
] as [string, ...string[]]);

export type CompanyFieldData = Partial<Record<FieldKey, string>>;

// Lookup helpers
export const fieldLabel = (key: FieldKey | string): string => {
  if (isCustomSelectionKey(key)) return customSelectionLabel(key)
  return CATALOG_FIELDS.find((f) => f.key === key)?.label ?? LEGACY_FIELD_LABELS[key] ?? key
}

export const documentTypeLabel = (key: DocumentTypeKey | string): string => {
  if (isCustomSelectionKey(key)) return customSelectionLabel(key)
  return CATALOG_DOCUMENT_TYPES.find((d) => d.key === key)?.label ?? LEGACY_DOCUMENT_LABELS[key] ?? key
}

/** Order requested catalog keys to match the send-request picker layout. */
export function orderCatalogKeys(
  keys: readonly string[],
  catalog: readonly { key: string }[]
): string[] {
  const catalogOrder = new Map(catalog.map((item, index) => [item.key, index]))
  const deduped = [...new Set(keys)]

  return deduped.sort((a, b) => {
    const orderA = catalogOrder.get(a)
    const orderB = catalogOrder.get(b)

    if (orderA !== undefined && orderB !== undefined) return orderA - orderB
    if (orderA !== undefined) return -1
    if (orderB !== undefined) return 1

    return keys.indexOf(a) - keys.indexOf(b)
  })
}

/** Order requested document types to match the send-request picker layout. */
export function orderRequestedDocuments(keys: readonly string[] | null | undefined): string[] {
  return orderCatalogKeys(keys ?? [], CATALOG_DOCUMENT_TYPES)
}
