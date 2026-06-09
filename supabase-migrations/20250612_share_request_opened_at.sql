-- Track when a recipient first opens a share request link.

ALTER TABLE share_requests
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_share_request_by_token(TEXT) TO anon, authenticated;
