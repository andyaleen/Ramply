const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function setupDatabase() {
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
    // Read and execute the comprehensive RLS fix
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-rls-policies-comprehensive.sql'), 'utf8')
    
    console.log('Applying RLS policy fixes...')
    
    // Split by statements and execute each one
    const statements = sqlScript.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 100) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
        if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
          console.error('Error executing statement:', error)
        }
      }
    }
    
    console.log('Database setup complete!')
    
    // Test the setup
    console.log('Testing database queries...')
    
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)
      
    const { data: consent, error: consentError } = await supabase
      .from('onboarding_consent')
      .select('*')
      .limit(1)
      
    if (docError) console.log('Documents query error:', docError)
    else console.log('Documents query successful')
    
    if (consentError) console.log('Consent query error:', consentError)
    else console.log('Consent query successful')
    
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()
