-- Restrict logo_path updates to the owner's canonical logo object in storage.
DROP POLICY IF EXISTS "companies_update_own" ON companies;

CREATE POLICY "companies_update_own" ON companies
  FOR UPDATE USING (auth.uid() = owner_user_id)
  WITH CHECK (
    auth.uid() = owner_user_id
    AND (
      logo_path IS NULL
      OR logo_path ~ ('^' || auth.uid()::text || '/logo/logo\.(png|jpe?g|webp|svg)$')
    )
  );
