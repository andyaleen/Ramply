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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company document vault — one row per document type per company
-- A company uploads their W9 once; it is reused across all share requests.
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'W9',
    'liability_insurance',
    'resale_cert',
    'bank_reference',
    'insurance_cert',
    'articles_of_incorporation',
    'business_license',
    'voided_check'
  )),
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
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
DROP POLICY IF EXISTS "storage_select_requester" ON storage.objects;

-- users policies
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

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

-- Fulfill a share request atomically
CREATE OR REPLACE FUNCTION fulfill_share_request(
  p_share_request_id UUID,
  p_field_data JSONB,
  p_company_document_ids UUID[]
)
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

  IF NOT EXISTS (
    SELECT 1
    FROM share_requests sr
    JOIN users u ON u.id = auth.uid()
    WHERE sr.id = p_share_request_id
      AND sr.recipient_email IS NOT NULL
      AND sr.recipient_email = u.email
      AND sr.status = 'pending'
      AND (sr.expires_at IS NULL OR sr.expires_at > NOW())
  ) THEN
    RAISE EXCEPTION 'share_request_not_allowed';
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

  IF p_company_document_ids IS NOT NULL AND array_length(p_company_document_ids, 1) > 0 THEN
    INSERT INTO shared_documents (share_request_id, company_document_id)
    SELECT p_share_request_id, UNNEST(p_company_document_ids);
  END IF;

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

