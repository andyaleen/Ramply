import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log(`Testing connection to: ${supabaseUrl}`);
  
  // Test reading from the companies table (which should be empty but exist)
  const { data, error } = await supabase.from('companies').select('id').limit(1);
  
  if (error) {
    console.error("❌ Connection failed or table doesn't exist:", error.message);
    process.exit(1);
  }
  
  console.log("✅ Successfully connected to Supabase and verified 'companies' table exists!");
  
  // Test reading from the documents storage bucket
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('documents');
  
  if (bucketError) {
    console.error("❌ Storage bucket 'documents' verification failed:", bucketError.message);
    console.log("   Make sure you created the 'documents' bucket in the Storage section!");
    process.exit(1);
  }
  
  console.log("✅ Successfully verified 'documents' storage bucket exists!");
  console.log("database connection looks good!");
}

testConnection();
