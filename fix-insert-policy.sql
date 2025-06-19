-- Missing INSERT policy fix for users table
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Create the missing INSERT policy
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify the policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
