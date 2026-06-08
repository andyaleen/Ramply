-- Allow recipients to decline a pending share request.

ALTER TABLE share_requests
  ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS denied_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE share_requests DROP CONSTRAINT IF EXISTS share_requests_status_check;

ALTER TABLE share_requests
  ADD CONSTRAINT share_requests_status_check
  CHECK (status IN ('pending', 'completed', 'expired', 'denied'));

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
