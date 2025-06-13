const { createClient } = require('@supabase/supabase-js')

async function debugUserAndDocuments() {
  require('dotenv').config({ path: '.env.local' })
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('=== DEBUGGING USER AND DOCUMENT MISMATCH ===')
    
    // Get all documents and their user_ids
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      
    if (docsError) {
      console.log('Error getting documents:', docsError)
      return
    }
    
    console.log('All documents in database:')
    docs.forEach((doc, i) => {
      console.log(`${i+1}. Document ID: ${doc.id}`)
      console.log(`   Request ID: ${doc.request_id}`)
      console.log(`   User ID: ${doc.user_id}`)
      console.log(`   Document Type: ${doc.document_type}`)
      console.log(`   File Name: ${doc.file_name}`)
      console.log('   ---')
    })
    
    // Get all requests and their user_ids
    const { data: requests, error: reqError } = await supabase
      .from('onboarding_requests')
      .select('*')
      
    if (reqError) {
      console.log('Error getting requests:', reqError)
      return
    }
    
    console.log('\nAll onboarding requests in database:')
    requests.forEach((req, i) => {
      console.log(`${i+1}. Request ID: ${req.id}`)
      console.log(`   Requester User ID: ${req.requester_user_id}`)
      console.log(`   Recipient Email: ${req.recipient_email}`)
      console.log(`   Status: ${req.status}`)
      console.log('   ---')
    })
    
    // Try to simulate the exact query that the app makes
    console.log('\n=== SIMULATING APP QUERY ===')
    const mockRequestId = 'mock-073e7143-6172-4e80-92b6-6cdfd692d145'
    const mockUserId = '0d77edfb-a407-4188-8957-87773706cfbe'
    
    console.log('Simulating query for:')
    console.log(`Request ID: ${mockRequestId}`)
    console.log(`User ID: ${mockUserId}`)
    
    const { data: queryResult, error: queryError } = await supabase
      .from('documents')
      .select('document_type')
      .eq('request_id', mockRequestId)
      .eq('user_id', mockUserId)
      
    if (queryError) {
      console.log('Query failed:', queryError)
    } else {
      console.log('Query successful, results:', queryResult)
    }
    
    // Also try without the user_id filter to see if that's the issue
    console.log('\n=== TRYING WITHOUT USER_ID FILTER ===')
    const { data: queryResult2, error: queryError2 } = await supabase
      .from('documents')
      .select('document_type')
      .eq('request_id', mockRequestId)
      
    if (queryError2) {
      console.log('Query failed:', queryError2)
    } else {
      console.log('Query successful, results:', queryResult2)
    }
    
  } catch (error) {
    console.error('Debug failed:', error)
  }
}

debugUserAndDocuments()
