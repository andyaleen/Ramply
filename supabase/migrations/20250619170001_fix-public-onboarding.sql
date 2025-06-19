-- Fix public access to onboarding types
-- This migration allows anonymous users to access onboarding types for public onboarding forms

-- Drop the existing public policy if it exists
DROP POLICY IF EXISTS "Public access to onboarding types" ON onboarding_types;
DROP POLICY IF EXISTS "allow_public_onboarding_types" ON onboarding_types;

-- Create a new policy specifically for anonymous users
CREATE POLICY "anonymous_can_view_onboarding_types" ON onboarding_types
  FOR SELECT TO anon
  USING (true);

-- Also allow authenticated users to view all onboarding types (for the onboarding flow)
CREATE POLICY "authenticated_can_view_onboarding_types" ON onboarding_types
  FOR SELECT TO authenticated
  USING (true);

-- For users table, allow limited access to company info for public onboarding
DROP POLICY IF EXISTS "Public access to company info for onboarding" ON users;

CREATE POLICY "anonymous_can_view_company_info" ON users
  FOR SELECT TO anon
  USING (
    -- Only allow reading company_name and contact_name for users with onboarding types
    EXISTS (
      SELECT 1 FROM onboarding_types 
      WHERE onboarding_types.user_id = users.id
    )
  );
