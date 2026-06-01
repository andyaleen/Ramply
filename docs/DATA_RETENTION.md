# Data retention and sensitive fields

## Sensitive company fields

The following fields are stored as plain text in Postgres today:

- `ein`
- `bank_account_number`
- `bank_routing_number`

UI mitigations:

- Edit forms use `type="password"` and `autoComplete="off"`.
- Read-only profile view masks EIN, account number, and routing number.

## OCR / document extractions

- W-9 uploads do not persist full `raw_text` in `document_extractions` (structured extraction only).
- Other document types store up to 50KB of `raw_text`.
- Access is restricted by RLS on `document_extractions` (company owner only).

## Future hardening

- Field-level encryption (Supabase Vault or external KMS)
- Configurable retention and purge jobs for extractions and shared data
