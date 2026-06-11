-- Prevent authenticated users from changing their own role (or id) via direct updates.
-- Role changes must go through set_user_role(), which runs as SECURITY DEFINER.
CREATE OR REPLACE FUNCTION prevent_self_user_privilege_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'users cannot change their own role';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'users cannot change their own id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_prevent_self_privilege_change ON users;

CREATE TRIGGER users_prevent_self_privilege_change
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_user_privilege_change();
