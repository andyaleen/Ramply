-- Production may predate extracted_fields / approval columns on company_documents.
-- Safe to run multiple times.

ALTER TABLE company_documents
  ADD COLUMN IF NOT EXISTS extracted_fields JSONB NOT NULL DEFAULT '{}';

ALTER TABLE company_documents
  ADD COLUMN IF NOT EXISTS approved_fields JSONB;

ALTER TABLE company_documents
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Refresh PostgREST schema cache (Supabase Dashboard → Settings → API → Reload schema
-- if inserts still report missing columns).
