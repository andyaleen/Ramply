-- Idempotent user + company provisioning for authenticated sessions.
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

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  IF v_email IS NULL THEN
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

GRANT EXECUTE ON FUNCTION bootstrap_app_user() TO authenticated;

-- New auth users get both rows at insert time; RPC remains the idempotent ensure+fetch path.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO companies (owner_user_id)
  VALUES (NEW.id)
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
