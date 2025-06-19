-- Migration to fix public onboarding access
-- This allows anonymous users to access company information for onboarding

-- Add policy to allow public read access to users table for onboarding
DROP POLICY IF EXISTS "Public access to company info for onboarding" ON users;

CREATE POLICY "Public access to company info for onboarding" ON users
  FOR SELECT 
  TO anon, authenticated
  USING (
    -- Allow reading company info for users who have onboarding types
    EXISTS (
      SELECT 1 FROM onboarding_types 
      WHERE onboarding_types.user_id = users.id
    )
  );

-- Ensure the anon role can access the tables
GRANT SELECT ON onboarding_types TO anon;
GRANT SELECT ON users TO anon;
