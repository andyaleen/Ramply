-- Pending sent share requests for the requester, with recipient company when known.

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
