const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applySchema() {
  // Read environment variables
  require('dotenv').config({ path: '.env.local' })
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  console.log('Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Apply the INSERT policy fix specifically
    console.log('Adding missing INSERT policy for users table...')
    
    const insertPolicySQL = `
      -- Drop existing policy if it exists
      DROP POLICY IF EXISTS "Users can insert their own data" ON users;
      
      -- Create the missing INSERT policy
      CREATE POLICY "Users can insert their own data" ON users
        FOR INSERT WITH CHECK (auth.uid() = id);
    `
    
    const { error } = await supabase.rpc('exec_sql', { sql: insertPolicySQL })
    
    if (error) {
      console.error('Error applying INSERT policy:', error)
      
      // Try alternative approach with direct SQL execution
      console.log('Trying alternative approach...')
      const { error: altError } = await supabase
        .from('_supabase_admin')
        .select('*')
      
      if (altError) {
        console.log('Direct SQL execution via service role...')
        // Execute each statement separately
        await supabase.rpc('exec_sql', { sql: 'DROP POLICY IF EXISTS "Users can insert their own data" ON users' })
        await supabase.rpc('exec_sql', { sql: 'CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (auth.uid() = id)' })
      }
    } else {
      console.log('✅ Successfully applied INSERT policy fix!')
    }
    
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
applySchema()
