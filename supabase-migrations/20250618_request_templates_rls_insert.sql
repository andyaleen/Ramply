-- Ensure request template inserts/updates pass RLS for the owning company.
DROP POLICY IF EXISTS "request_templates_all_own" ON request_templates;

CREATE POLICY "request_templates_select_own" ON request_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "request_templates_insert_own" ON request_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "request_templates_update_own" ON request_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "request_templates_delete_own" ON request_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = request_templates.company_id
        AND companies.owner_user_id = auth.uid()
    )
  );
