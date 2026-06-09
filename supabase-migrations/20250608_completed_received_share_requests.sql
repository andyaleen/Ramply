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
