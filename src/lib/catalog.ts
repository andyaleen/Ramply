import { z } from "zod";
import { customSelectionLabel, isCustomSelectionKey } from '@/lib/custom-selections'
import { ADDRESS_CATALOG_KEY } from '@/lib/address-fields'

export const CATALOG_FIELDS = [
  { key: 'legal_name',           label: 'Legal Business Name' },
  { key: 'dba_name',             label: 'DBA / Trade Name' },
  { key: 'ein',                  label: 'EIN / Tax ID' },
  { key: 'business_type',        label: 'Business Type' },
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
  
  // Bank Reference Additions
  { key: 'bank_reference_email', label: 'Bank Contact Email' },
  
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
  { key: 'business_license',         label: 'Business License' },
  { key: 'voided_check',             label: 'Voided Check' },
] as const

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
  return CATALOG_FIELDS.find((f) => f.key === key)?.label ?? key
}

export const documentTypeLabel = (key: DocumentTypeKey | string): string => {
  if (isCustomSelectionKey(key)) return customSelectionLabel(key)
  return CATALOG_DOCUMENT_TYPES.find((d) => d.key === key)?.label ?? key
}
