-- ============================================================
-- RAMPLY — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- DEPRECATION — drop legacy tables from the old onboarding flow
-- These were replaced by share_requests / shared_data / shared_documents
-- ============================================================

DROP TABLE IF EXISTS onboarding_consent CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS onboarding_requests CASCADE;
DROP TABLE IF EXISTS onboarding_types CASCADE;


-- ============================================================
-- TABLES
-- ============================================================

-- Users table — auth identity + role only
-- Company profile data lives in the companies table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'external' CHECK (role IN ('admin', 'external')),
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table — standardized profile data for every company
-- One company per user (1:1). All fields use the same keys as catalog.ts.
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_name TEXT,
  dba_name TEXT,
  ein TEXT,
  business_type TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  bank_reference_email TEXT,
  website TEXT,
  year_founded TEXT,
  accounting_name TEXT,
  accounting_email TEXT,
  accounting_phone TEXT,
  vendor_references TEXT,
  payment_terms TEXT,
  payment_method TEXT,
  -- Stripe billing fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT,               -- 'active' | 'trialing' | 'past_due' | 'canceled' | NULL
  subscription_price_id TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  logo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company document vault — one row per document type per company
-- A company uploads their W9 once; it is reused across all share requests.
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
    'W9',
    'liability_insurance',
    'resale_cert',
    'bank_reference',
    'insurance_cert',
    'articles_of_incorporation',
    'business_license',
    'voided_check'
    )
    OR document_type LIKE 'custom:%'
  ),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT,           -- SHA-256 of file contents for deduplication
  version INT NOT NULL DEFAULT 1,
  superseded_by UUID REFERENCES company_documents(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  extracted_fields JSONB NOT NULL DEFAULT '{}',
  approved_fields JSONB,
  approved_at TIMESTAMPTZ
  -- No UNIQUE constraint here: versioning allows multiple rows per (company, type).
  -- "Active" document = latest version = one with no superseded_by pointing to another.
);

-- Document extractions — OCR outputs per company document
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_document_id UUID NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  raw_text TEXT,
  structured_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_extractions_company_document_idx
  ON document_extractions(company_document_id);

-- Share requests — Company A requests specific fields/docs from Company B
-- mandatory_fields, optional_fields, mandatory_documents, optional_documents contain keys from catalog.ts
CREATE TABLE IF NOT EXISTS share_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  recipient_email TEXT,
  mandatory_fields TEXT[] NOT NULL DEFAULT '{}',    -- e.g. ARRAY['legal_name','ein']
  mandatory_documents TEXT[] NOT NULL DEFAULT '{}', -- e.g. ARRAY['W9','resale_cert']
  optional_fields TEXT[] NOT NULL DEFAULT '{}',
  optional_documents TEXT[] NOT NULL DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'denied', 'cancelled')),
  completed_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denied_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE share_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT;

UPDATE share_requests
SET request_type = CASE
  WHEN request_type IS NOT NULL AND BTRIM(request_type) <> '' THEN request_type
  WHEN recipient_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN 'General Request'
  ELSE COALESCE(NULLIF(BTRIM(recipient_email), ''), 'General Request')
END
WHERE request_type IS NULL OR BTRIM(request_type) = '';

UPDATE share_requests
SET recipient_email = NULL
WHERE recipient_email IS NOT NULL
  AND recipient_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$';

ALTER TABLE share_requests
  ALTER COLUMN request_type SET NOT NULL;

ALTER TABLE share_requests
  ALTER COLUMN recipient_email DROP NOT NULL;

-- Request templates — reusable field/doc bundles saved by an admin
CREATE TABLE IF NOT EXISTS request_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mandatory_fields TEXT[] NOT NULL DEFAULT '{}',
  mandatory_documents TEXT[] NOT NULL DEFAULT '{}',
  optional_fields TEXT[] NOT NULL DEFAULT '{}',
  optional_documents TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared data — snapshot of field values at the time of sharing
-- One row per fulfilled share request
CREATE TABLE IF NOT EXISTS shared_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_request_id UUID UNIQUE NOT NULL REFERENCES share_requests(id) ON DELETE CASCADE,
  sharing_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_data JSONB NOT NULL DEFAULT '{}',  -- { legal_name: "Acme Inc", ein: "12-3456789", ... }
  shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared documents — which company_documents were shared for a given request
CREATE TABLE IF NOT EXISTS shared_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_request_id UUID NOT NULL REFERENCES share_requests(id) ON DELETE CASCADE,
  company_document_id UUID NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (share_request_id, company_document_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow clean re-runs
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

DROP POLICY IF EXISTS "companies_select_own" ON companies;
DROP POLICY IF EXISTS "companies_insert_own" ON companies;
DROP POLICY IF EXISTS "companies_update_own" ON companies;
DROP POLICY IF EXISTS "companies_select_as_requester" ON companies;

DROP POLICY IF EXISTS "company_documents_all_own" ON company_documents;
DROP POLICY IF EXISTS "company_documents_insert_own" ON company_documents;
DROP POLICY IF EXISTS "company_documents_update_own" ON company_documents;
DROP POLICY IF EXISTS "company_documents_select_requester" ON company_documents;

DROP POLICY IF EXISTS "document_extractions_all_own" ON document_extractions;

DROP POLICY IF EXISTS "request_templates_all_own" ON request_templates;

DROP POLICY IF EXISTS "share_requests_all_requester" ON share_requests;
DROP POLICY IF EXISTS "share_requests_select_recipient" ON share_requests;
DROP POLICY IF EXISTS "share_requests_update_recipient" ON share_requests;
DROP POLICY IF EXISTS "share_requests_select_by_token_public" ON share_requests;

DROP POLICY IF EXISTS "shared_data_select_parties" ON shared_data;
DROP POLICY IF EXISTS "shared_data_insert_sharer" ON shared_data;

DROP POLICY IF EXISTS "shared_documents_select_parties" ON shared_documents;
DROP POLICY IF EXISTS "shared_documents_insert_sharer" ON shared_documents;

DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_requester" ON storage.objects;

-- users policies
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id AND role = 'external');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- companies policies
CREATE POLICY "companies_select_own" ON companies
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "companies_insert_own" ON companies
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "companies_update_own" ON companies
  FOR UPDATE USING (auth.uid() = owner_user_id);

-- Requesters can see the company profile of companies that fulfilled their requests.
-- Uses JOIN instead of subquery on companies to avoid infinite RLS recursion.
CREATE POLICY "companies_select_as_requester" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM share_requests sr
      JOIN companies requester ON requester.owner_user_id = auth.uid()
      WHERE sr.completed_by_company_id = companies.id
        AND sr.requester_company_id = requester.id
    )
  );

-- company_documents policies
CREATE POLICY "company_documents_all_own" ON company_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies WHERE companies.id = company_documents.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "company_documents_insert_own" ON company_documents
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "company_documents_update_own" ON company_documents
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())
  );

-- Requesters can read documents that were shared with them
CREATE POLICY "company_documents_select_requester" ON company_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_documents sd
      JOIN share_requests sr ON sd.share_request_id = sr.id
      JOIN companies rc ON sr.requester_company_id = rc.id
      WHERE sd.company_document_id = company_documents.id
        AND rc.owner_user_id = auth.uid()
    )
  );

-- document_extractions policies
CREATE POLICY "document_extractions_all_own" ON document_extractions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies WHERE companies.id = document_extractions.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

-- share_requests policies
-- Requesters have full access to requests they created
-- Templates are fully owned by the company that created them
CREATE POLICY "request_templates_all_own" ON request_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "share_requests_all_requester" ON share_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies WHERE companies.id = share_requests.requester_company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

-- Recipients can read their own requests
CREATE POLICY "share_requests_select_recipient" ON share_requests
  FOR SELECT USING (
    recipient_email IS NOT NULL
    AND recipient_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Recipients can update status to 'completed'
CREATE POLICY "share_requests_update_recipient" ON share_requests
  FOR UPDATE USING (
    recipient_email IS NOT NULL
    AND recipient_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- shared_data policies
-- Both requester and sharer can read
CREATE POLICY "shared_data_select_parties" ON shared_data
  FOR SELECT USING (
    -- sharer
    EXISTS (
      SELECT 1 FROM companies WHERE id = shared_data.sharing_company_id
        AND owner_user_id = auth.uid()
    )
    OR
    -- requester
    EXISTS (
      SELECT 1 FROM share_requests sr
      JOIN companies rc ON sr.requester_company_id = rc.id
      WHERE sr.id = shared_data.share_request_id
        AND rc.owner_user_id = auth.uid()
    )
  );

-- Only the sharer can insert
CREATE POLICY "shared_data_insert_sharer" ON shared_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies WHERE id = sharing_company_id
        AND owner_user_id = auth.uid()
    )
  );

-- shared_documents policies
CREATE POLICY "shared_documents_select_parties" ON shared_documents
  FOR SELECT USING (
    -- sharer (owns the document)
    EXISTS (
      SELECT 1 FROM company_documents cd
      JOIN companies c ON cd.company_id = c.id
      WHERE cd.id = shared_documents.company_document_id
        AND c.owner_user_id = auth.uid()
    )
    OR
    -- requester
    EXISTS (
      SELECT 1 FROM share_requests sr
      JOIN companies rc ON sr.requester_company_id = rc.id
      WHERE sr.id = shared_documents.share_request_id
        AND rc.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "shared_documents_insert_sharer" ON shared_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_documents cd
      JOIN companies c ON cd.company_id = c.id
      WHERE cd.id = company_document_id
        AND c.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE
-- ============================================================

-- Documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- File paths must follow: {user_id}/{document_type}/{filename}
-- RLS enforces that users can only upload/read their own folder

DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_requester" ON storage.objects;

CREATE POLICY "storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Requesters can read files that were shared with them
CREATE POLICY "storage_select_requester" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM company_documents cd
      JOIN shared_documents sd ON sd.company_document_id = cd.id
      JOIN share_requests sr ON sd.share_request_id = sr.id
      JOIN companies rc ON sr.requester_company_id = rc.id
      WHERE cd.file_path = name
        AND rc.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTION: auto-create user row on signup
-- ============================================================

-- Read a share request by token (safe for unauthenticated recipients)
CREATE OR REPLACE FUNCTION get_share_request_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  requester_company_id UUID,
  request_type TEXT,
  recipient_email TEXT,
  mandatory_fields TEXT[],
  mandatory_documents TEXT[],
  optional_fields TEXT[],
  optional_documents TEXT[],
  expires_at TIMESTAMPTZ,
  status TEXT,
  completed_by_company_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  requester_company_legal_name TEXT
) AS $$
BEGIN
  UPDATE share_requests sr
  SET opened_at = NOW(),
      updated_at = NOW()
  WHERE sr.token = p_token
    AND sr.status = 'pending'
    AND sr.opened_at IS NULL
    AND (sr.expires_at IS NULL OR sr.expires_at > NOW());

  RETURN QUERY
    SELECT
      sr.id,
      sr.requester_company_id,
      sr.request_type,
      sr.recipient_email,
      sr.mandatory_fields,
      sr.mandatory_documents,
      sr.optional_fields,
      sr.optional_documents,
      sr.expires_at,
      -- Synthesize 'expired' from expires_at so the client never needs a background job
      CASE
        WHEN sr.expires_at IS NOT NULL AND sr.expires_at < NOW() THEN 'expired'
        ELSE sr.status
      END AS status,
      sr.completed_by_company_id,
      sr.completed_at,
      sr.created_at,
      sr.updated_at,
      rc.legal_name
    FROM share_requests sr
    LEFT JOIN companies rc ON rc.id = sr.requester_company_id
    WHERE sr.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_share_request_by_token(TEXT) TO anon, authenticated;

-- List pending share requests addressed to the signed-in recipient.
DROP FUNCTION IF EXISTS get_pending_received_share_requests();

CREATE OR REPLACE FUNCTION get_pending_received_share_requests()
RETURNS TABLE (
  id UUID,
  token TEXT,
  created_at TIMESTAMPTZ,
  requester_company_legal_name TEXT,
  requester_company_dba_name TEXT,
  requester_email TEXT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      sr.id,
      sr.token,
      sr.created_at,
      rc.legal_name,
      rc.dba_name,
      ru.email
    FROM share_requests sr
    LEFT JOIN companies rc ON rc.id = sr.requester_company_id
    LEFT JOIN users ru ON ru.id = rc.owner_user_id
    JOIN users u ON u.id = auth.uid()
    WHERE sr.recipient_email IS NOT NULL
      AND LOWER(sr.recipient_email) = LOWER(u.email)
      AND sr.status = 'pending'
      AND (sr.expires_at IS NULL OR sr.expires_at > NOW())
    ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_pending_received_share_requests() TO authenticated;

-- List completed share requests addressed to the signed-in recipient.
DROP FUNCTION IF EXISTS get_completed_received_share_requests();

CREATE OR REPLACE FUNCTION get_completed_received_share_requests()
RETURNS TABLE (
  id UUID,
  token TEXT,
  request_type TEXT,
  mandatory_fields TEXT[],
  optional_fields TEXT[],
  mandatory_documents TEXT[],
  optional_documents TEXT[],
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  requester_company_legal_name TEXT,
  requester_company_dba_name TEXT,
  requester_email TEXT,
  recipient_email TEXT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      sr.id,
      sr.token,
      sr.request_type,
      sr.mandatory_fields,
      sr.optional_fields,
      sr.mandatory_documents,
      sr.optional_documents,
      sr.created_at,
      sr.completed_at,
      rc.legal_name,
      rc.dba_name,
      ru.email,
      sr.recipient_email
    FROM share_requests sr
    LEFT JOIN companies rc ON rc.id = sr.requester_company_id
    LEFT JOIN users ru ON ru.id = rc.owner_user_id
    JOIN users u ON u.id = auth.uid()
    WHERE sr.recipient_email IS NOT NULL
      AND LOWER(sr.recipient_email) = LOWER(u.email)
      AND sr.status = 'completed'
    ORDER BY sr.completed_at DESC NULLS LAST, sr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_completed_received_share_requests() TO authenticated;

-- Let recipients reliably read their own completed submission details.
CREATE OR REPLACE FUNCTION get_recipient_submission_details(p_share_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM share_requests sr
    JOIN users u ON u.id = auth.uid()
    LEFT JOIN companies completed ON completed.id = sr.completed_by_company_id
    WHERE sr.id = p_share_request_id
      AND sr.status = 'completed'
      AND (
        LOWER(sr.recipient_email) = LOWER(u.email)
        OR completed.owner_user_id = auth.uid()
      )
  ) THEN
    RAISE EXCEPTION 'share_request_not_allowed';
  END IF;

  SELECT jsonb_build_object(
    'field_data', COALESCE(sd.field_data, '{}'::jsonb),
    'documents', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cd.id,
            'company_id', cd.company_id,
            'document_type', cd.document_type,
            'file_path', cd.file_path,
            'file_name', cd.file_name,
            'file_size', cd.file_size,
            'mime_type', cd.mime_type,
            'file_hash', cd.file_hash,
            'version', cd.version,
            'superseded_by', cd.superseded_by,
            'uploaded_at', cd.uploaded_at
          )
          ORDER BY cd.uploaded_at DESC
        )
        FROM shared_documents sdoc
        JOIN company_documents cd ON cd.id = sdoc.company_document_id
        WHERE sdoc.share_request_id = p_share_request_id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM shared_data sd
  WHERE sd.share_request_id = p_share_request_id;

  RETURN COALESCE(
    v_result,
    jsonb_build_object('field_data', '{}'::jsonb, 'documents', '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_recipient_submission_details(UUID) TO authenticated;

-- Fulfill a share request atomically
CREATE OR REPLACE FUNCTION fulfill_share_request(
  p_share_request_id UUID,
  p_field_data JSONB,
  p_company_document_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
  v_sr share_requests%ROWTYPE;
  v_field_key TEXT;
  v_doc_type TEXT;
  v_doc_count INT;
  v_owned_count INT;
BEGIN
  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  SELECT sr.* INTO v_sr
  FROM share_requests sr
  JOIN users u ON u.id = auth.uid()
  WHERE sr.id = p_share_request_id
    AND sr.recipient_email IS NOT NULL
    AND sr.recipient_email = u.email
    AND sr.status = 'pending'
    AND (sr.expires_at IS NULL OR sr.expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'share_request_not_allowed';
  END IF;

  -- Validate field keys are part of the request
  FOR v_field_key IN SELECT jsonb_object_keys(COALESCE(p_field_data, '{}'::jsonb))
  LOOP
    IF NOT (
      v_field_key = ANY(v_sr.mandatory_fields)
      OR v_field_key = ANY(v_sr.optional_fields)
    ) THEN
      RAISE EXCEPTION 'invalid_field_key';
    END IF;
  END LOOP;

  -- Mandatory documents must be provided
  IF array_length(v_sr.mandatory_documents, 1) > 0 THEN
    IF p_company_document_ids IS NULL OR array_length(p_company_document_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'missing_mandatory_documents';
    END IF;

    FOREACH v_doc_type IN ARRAY v_sr.mandatory_documents
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM company_documents cd
        WHERE cd.company_id = v_company_id
          AND cd.document_type = v_doc_type
          AND cd.id = ANY(p_company_document_ids)
          AND cd.superseded_by IS NULL
      ) THEN
        RAISE EXCEPTION 'missing_mandatory_documents';
      END IF;
    END LOOP;
  END IF;

  -- All document IDs must belong to the fulfiller's company
  IF p_company_document_ids IS NOT NULL AND array_length(p_company_document_ids, 1) > 0 THEN
    SELECT COUNT(*) INTO v_doc_count FROM UNNEST(p_company_document_ids) AS doc_id;
    SELECT COUNT(*) INTO v_owned_count
    FROM company_documents cd
    WHERE cd.company_id = v_company_id
      AND cd.id = ANY(p_company_document_ids)
      AND cd.superseded_by IS NULL;

    IF v_owned_count <> v_doc_count THEN
      RAISE EXCEPTION 'invalid_document_ids';
    END IF;

    INSERT INTO shared_documents (share_request_id, company_document_id)
    SELECT p_share_request_id, UNNEST(p_company_document_ids);
  END IF;

  INSERT INTO shared_data (
    share_request_id,
    sharing_company_id,
    field_data
  ) VALUES (
    p_share_request_id,
    v_company_id,
    COALESCE(p_field_data, '{}'::jsonb)
  );

  UPDATE share_requests
  SET status = 'completed',
      completed_by_company_id = v_company_id,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_share_request_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fulfill_share_request(UUID, JSONB, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION deny_share_request(p_share_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  UPDATE share_requests
  SET status = 'denied',
      denied_at = NOW(),
      denied_by_company_id = v_company_id,
      updated_at = NOW()
  WHERE id = p_share_request_id
    AND recipient_email IS NOT NULL
    AND LOWER(recipient_email) = LOWER((SELECT email FROM users WHERE id = auth.uid()))
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'share_request_not_allowed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION deny_share_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION cancel_share_request(p_share_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  UPDATE share_requests
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_share_request_id
    AND requester_company_id = v_company_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'share_request_not_allowed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION cancel_share_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION get_pending_sent_share_requests()
RETURNS TABLE (
  id UUID,
  request_type TEXT,
  recipient_email TEXT,
  mandatory_fields TEXT[],
  optional_fields TEXT[],
  mandatory_documents TEXT[],
  optional_documents TEXT[],
  expires_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  recipient_company_legal_name TEXT,
  recipient_company_dba_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.request_type,
    sr.recipient_email,
    sr.mandatory_fields,
    sr.optional_fields,
    sr.mandatory_documents,
    sr.optional_documents,
    sr.expires_at,
    sr.opened_at,
    sr.created_at,
    rc.legal_name,
    rc.dba_name
  FROM share_requests sr
  JOIN companies requester ON requester.owner_user_id = auth.uid()
  LEFT JOIN users recipient_user
    ON sr.recipient_email IS NOT NULL
    AND LOWER(recipient_user.email) = LOWER(sr.recipient_email)
  LEFT JOIN companies rc ON rc.owner_user_id = recipient_user.id
  WHERE sr.requester_company_id = requester.id
    AND sr.status = 'pending'
  ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_pending_sent_share_requests() TO authenticated;

CREATE OR REPLACE FUNCTION get_requester_shared_documents(p_share_request_ids UUID[])
RETURNS TABLE (
  share_request_id UUID,
  id UUID,
  company_id UUID,
  document_type TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT,
  version INT,
  superseded_by UUID,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.share_request_id,
    cd.id,
    cd.company_id,
    cd.document_type,
    cd.file_path,
    cd.file_name,
    cd.file_size,
    cd.mime_type,
    cd.file_hash,
    cd.version,
    cd.superseded_by,
    cd.uploaded_at
  FROM shared_documents sd
  JOIN company_documents cd ON cd.id = sd.company_document_id
  JOIN share_requests sr ON sr.id = sd.share_request_id
  JOIN companies requester ON sr.requester_company_id = requester.id
  WHERE requester.owner_user_id = auth.uid()
    AND sd.share_request_id = ANY(p_share_request_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_requester_shared_documents(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION get_requester_shared_companies(p_company_ids UUID[])
RETURNS TABLE (
  id UUID,
  legal_name TEXT,
  dba_name TEXT,
  owner_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id, c.legal_name, c.dba_name, c.owner_user_id
  FROM companies c
  JOIN share_requests sr ON sr.completed_by_company_id = c.id
  JOIN companies requester ON sr.requester_company_id = requester.id
  WHERE requester.owner_user_id = auth.uid()
    AND c.id = ANY(p_company_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_requester_shared_companies(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION get_my_active_vault_documents()
RETURNS SETOF company_documents AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cd.*
  FROM company_documents cd
  WHERE cd.company_id = v_company_id
    AND cd.superseded_by IS NULL
  ORDER BY cd.document_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_active_vault_documents() TO authenticated;

DROP FUNCTION IF EXISTS complete_vault_document_upload(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION complete_vault_document_upload(
  p_document_type TEXT,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size BIGINT,
  p_mime_type TEXT,
  p_file_hash TEXT
)
RETURNS company_documents AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_existing company_documents%ROWTYPE;
  v_new company_documents%ROWTYPE;
  v_had_existing BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT (
    p_document_type IN (
      'W9',
      'liability_insurance',
      'resale_cert',
      'bank_reference',
      'insurance_cert',
      'articles_of_incorporation',
      'business_license',
      'voided_check'
    )
    OR p_document_type LIKE 'custom:%'
  ) THEN
    RAISE EXCEPTION 'invalid_document_type';
  END IF;

  IF split_part(p_file_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'invalid_file_path';
  END IF;

  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  SELECT * INTO v_existing
  FROM company_documents
  WHERE company_id = v_company_id
    AND document_type = p_document_type
    AND superseded_by IS NULL;

  v_had_existing := FOUND;

  IF v_had_existing AND v_existing.file_hash IS NOT DISTINCT FROM p_file_hash THEN
    RETURN v_existing;
  END IF;

  INSERT INTO company_documents (
    company_id,
    document_type,
    file_path,
    file_name,
    file_size,
    mime_type,
    file_hash,
    version
  ) VALUES (
    v_company_id,
    p_document_type,
    p_file_path,
    p_file_name,
    p_file_size,
    COALESCE(NULLIF(p_mime_type, ''), 'application/octet-stream'),
    p_file_hash,
    COALESCE(v_existing.version, 0) + 1
  )
  RETURNING * INTO v_new;

  IF v_had_existing THEN
    UPDATE company_documents
    SET superseded_by = v_new.id
    WHERE id = v_existing.id;
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION complete_vault_document_upload(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION set_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_role NOT IN ('admin', 'external') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  UPDATE users
  SET role = p_role,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_user_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

