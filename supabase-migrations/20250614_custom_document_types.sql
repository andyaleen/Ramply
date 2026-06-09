-- Allow custom document types requested via Share Requests (custom:Label keys).

ALTER TABLE company_documents DROP CONSTRAINT IF EXISTS company_documents_document_type_check;

ALTER TABLE company_documents
  ADD CONSTRAINT company_documents_document_type_check
  CHECK (
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
  );

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
