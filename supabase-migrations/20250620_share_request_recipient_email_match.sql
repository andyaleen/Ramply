-- Case-insensitive recipient matching for share request visibility.

DROP POLICY IF EXISTS "share_requests_select_recipient" ON share_requests;
CREATE POLICY "share_requests_select_recipient" ON share_requests
  FOR SELECT USING (
    recipient_email IS NOT NULL
    AND LOWER(recipient_email) = LOWER((
      SELECT email FROM users WHERE id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "share_requests_update_recipient" ON share_requests;
CREATE POLICY "share_requests_update_recipient" ON share_requests
  FOR UPDATE USING (
    recipient_email IS NOT NULL
    AND LOWER(recipient_email) = LOWER((
      SELECT email FROM users WHERE id = auth.uid()
    ))
  );

CREATE OR REPLACE FUNCTION get_pending_received_share_requests()
RETURNS TABLE (
  id UUID,
  token TEXT,
  created_at TIMESTAMPTZ,
  requester_company_legal_name TEXT,
  requester_company_dba_name TEXT,
  requester_email TEXT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      sr.id,
      sr.token,
      sr.created_at,
      rc.legal_name,
      rc.dba_name,
      ru.email
    FROM share_requests sr
    LEFT JOIN companies rc ON rc.id = sr.requester_company_id
    LEFT JOIN users ru ON ru.id = rc.owner_user_id
    JOIN users u ON u.id = auth.uid()
    WHERE sr.recipient_email IS NOT NULL
      AND LOWER(sr.recipient_email) = LOWER(u.email)
      AND sr.status = 'pending'
      AND (sr.expires_at IS NULL OR sr.expires_at > NOW())
    ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION bootstrap_app_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_user users%ROWTYPE;
  v_company companies%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT LOWER(TRIM(email)) INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'auth_user_not_found';
  END IF;

  INSERT INTO users (id, email, role)
  VALUES (v_uid, v_email, 'external')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW()
  RETURNING * INTO v_user;

  INSERT INTO companies (owner_user_id)
  VALUES (v_uid)
  ON CONFLICT (owner_user_id) DO NOTHING;

  SELECT * INTO v_company
  FROM companies
  WHERE owner_user_id = v_uid;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'company_bootstrap_failed';
  END IF;

  RETURN jsonb_build_object(
    'user', to_jsonb(v_user),
    'company', to_jsonb(v_company)
  );
END;
$$;
