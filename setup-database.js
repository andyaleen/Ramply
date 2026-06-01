#!/usr/bin/env node
/**
 * Database setup helper — validates env vars and prints next steps.
 * Apply schema manually in the Supabase SQL editor (supabase-schema.sql).
 */
const fs = require('fs')
const path = require('path')

const root = __dirname
const schemaPath = path.join(root, 'supabase-schema.sql')

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error('Missing environment variables:', missing.join(', '))
  console.error('Copy .env.example to .env.local and fill in your Supabase project values.')
  process.exit(1)
}

if (!fs.existsSync(schemaPath)) {
  console.error('supabase-schema.sql not found at', schemaPath)
  process.exit(1)
}

console.log('Ramply database setup')
console.log('---------------------')
console.log('1. Open your Supabase project → SQL Editor')
console.log('2. Run the full contents of:', schemaPath)
console.log('3. Create a Storage bucket named "documents" (private) if not already present')
console.log('4. Configure RLS policies are included in the schema file')
console.log('')
console.log('After applying SQL, run: npm run dev')
console.log('See README.md and docs/DATA_RETENTION.md for more details.')
