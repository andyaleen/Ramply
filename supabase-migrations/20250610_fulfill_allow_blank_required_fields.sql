-- Allow recipients to intentionally submit blank values for required fields.

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

  FOR v_field_key IN SELECT jsonb_object_keys(COALESCE(p_field_data, '{}'::jsonb))
  LOOP
    IF NOT (
      v_field_key = ANY(v_sr.mandatory_fields)
      OR v_field_key = ANY(v_sr.optional_fields)
    ) THEN
      RAISE EXCEPTION 'invalid_field_key';
    END IF;
  END LOOP;

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
