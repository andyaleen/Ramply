-- Allow requesters to cancel pending share requests they sent.

ALTER TABLE share_requests DROP CONSTRAINT IF EXISTS share_requests_status_check;

ALTER TABLE share_requests
  ADD CONSTRAINT share_requests_status_check
  CHECK (status IN ('pending', 'completed', 'expired', 'denied', 'cancelled'));

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
