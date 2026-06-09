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
