import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://idpqgqbpmblchbakwyul.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcHFncWJwbWJsY2hiYWt3eXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODEzMDI1NSwiZXhwIjoyMDYzNzA2MjU1fQ.tmxHGT24R47PK1Y7pVj_Eu1r5CFj0lpoxtbWMUdVYxw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixConsentTable() {
  console.log('🔧 Fixing onboarding_consent table...')
  
  try {
    // First, let's check the current structure
    const { data: tableInfo, error: infoError } = await supabase
      .from('information_schema.columns')
      .select('column_name, is_nullable, data_type')
      .eq('table_name', 'onboarding_consent')
      .eq('table_schema', 'public')
    
    if (infoError) {
      console.error('❌ Error checking table structure:', infoError)
      return
    }
    
    console.log('📋 Current table structure:', tableInfo)
    
    // Apply the migration using RPC or raw SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Make document_type nullable
        ALTER TABLE onboarding_consent 
        ALTER COLUMN document_type DROP NOT NULL;
        
        -- Update any existing NULL document_type values to a default
        UPDATE onboarding_consent 
        SET document_type = 'onboarding_form' 
        WHERE document_type IS NULL;
      `
    })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      // Let's try a different approach
      console.log('🔄 Trying alternative approach...')
      
      // Try using the SQL editor functionality
      const { data: result, error: sqlError } = await supabase
        .from('onboarding_consent')
        .select('id')
        .limit(1)
      
      if (sqlError) {
        console.error('❌ Even basic query failed:', sqlError)
      } else {
        console.log('✅ Table is accessible, but migration needs to be done manually')
      }
    } else {
      console.log('✅ Migration successful:', data)
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

fixConsentTable()
