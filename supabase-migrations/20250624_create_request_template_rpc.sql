-- Reliable request template creation with public_token generation and RLS repair.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE request_templates
  ADD COLUMN IF NOT EXISTS public_token TEXT;

UPDATE request_templates
SET public_token = encode(extensions.gen_random_bytes(16), 'hex')
WHERE public_token IS NULL;

ALTER TABLE request_templates
  ALTER COLUMN public_token SET DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

ALTER TABLE request_templates
  ALTER COLUMN public_token SET NOT NULL;

DROP POLICY IF EXISTS "request_templates_all_own" ON request_templates;

DROP POLICY IF EXISTS "request_templates_select_own" ON request_templates;
CREATE POLICY "request_templates_select_own" ON request_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "request_templates_insert_own" ON request_templates;
CREATE POLICY "request_templates_insert_own" ON request_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "request_templates_update_own" ON request_templates;
CREATE POLICY "request_templates_update_own" ON request_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "request_templates_delete_own" ON request_templates;
CREATE POLICY "request_templates_delete_own" ON request_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION create_request_template(
  p_name TEXT,
  p_mandatory_fields TEXT[],
  p_optional_fields TEXT[],
  p_mandatory_documents TEXT[],
  p_optional_documents TEXT[]
)
RETURNS request_templates AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_template request_templates;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id INTO v_company_id
  FROM companies
  WHERE owner_user_id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO request_templates (
    company_id,
    name,
    public_token,
    mandatory_fields,
    optional_fields,
    mandatory_documents,
    optional_documents
  ) VALUES (
    v_company_id,
    p_name,
    encode(extensions.gen_random_bytes(16), 'hex'),
    COALESCE(p_mandatory_fields, '{}'),
    COALESCE(p_optional_fields, '{}'),
    COALESCE(p_mandatory_documents, '{}'),
    COALESCE(p_optional_documents, '{}')
  )
  RETURNING * INTO v_template;

  RETURN v_template;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_request_template(TEXT, TEXT[], TEXT[], TEXT[], TEXT[]) TO authenticated;
