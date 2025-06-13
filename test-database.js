const { createClient } = require('@supabase/supabase-js')

async function quickDatabaseFix() {
  // Read environment variables
  require('dotenv').config({ path: '.env.local' })
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file')
    process.exit(1)
  }

  console.log('Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Test basic connectivity first
    console.log('Testing connection...')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.log('Connection test failed:', testError.message)
    } else {
      console.log('Connection successful')
    }
    
    // Try to create very basic permissive policies using individual SQL commands
    console.log('Creating permissive policies...')
    
    // For documents table
    try {
      await supabase.rpc('create_permissive_policy', { 
        table_name: 'documents',
        policy_name: 'documents_all_access',
        operation: 'ALL'
      })
    } catch (e) {
      console.log('Policy creation using RPC failed, trying alternative approach...')
    }
    
    // Test if we can query documents now
    console.log('Testing documents query...')
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(5)
      
    if (docsError) {
      console.log('Documents query failed:', docsError.message)
      console.log('Error details:', docsError)
    } else {
      console.log('Documents query successful. Found', docs.length, 'documents')
      if (docs.length > 0) {
        console.log('Sample document:', docs[0])
      }
    }
    
    // Test consent table
    console.log('Testing onboarding_consent query...')
    const { data: consent, error: consentError } = await supabase
      .from('onboarding_consent')
      .select('*')
      .limit(5)
      
    if (consentError) {
      console.log('Consent query failed:', consentError.message)
      console.log('Error details:', consentError)
    } else {
      console.log('Consent query successful. Found', consent.length, 'records')
    }
    
    // Test requests table
    console.log('Testing onboarding_requests query...')
    const { data: requests, error: reqError } = await supabase
      .from('onboarding_requests')
      .select('*')
      .limit(5)
      
    if (reqError) {
      console.log('Requests query failed:', reqError.message)
    } else {
      console.log('Requests query successful. Found', requests.length, 'requests')
      if (requests.length > 0) {
        console.log('Sample request:', requests[0])
      }
    }
    
    console.log('\n=== SUMMARY ===')
    console.log('If all queries above were successful, your database is working!')
    console.log('If you see errors, you may need to manually apply the SQL fixes.')
    
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

quickDatabaseFix()
