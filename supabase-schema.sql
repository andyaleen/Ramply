-- Create the users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  tax_id TEXT,
  business_type TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  role TEXT DEFAULT 'external' CHECK (role IN ('admin', 'external')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the onboarding_types table
CREATE TABLE onboarding_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  required_fields JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the onboarding_requests table
CREATE TABLE onboarding_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onboarding_type_id UUID REFERENCES onboarding_types(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  recipient_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES onboarding_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the onboarding_consent table
CREATE TABLE onboarding_consent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES onboarding_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_consent ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for onboarding_types
CREATE POLICY "Users can view their own onboarding types" ON onboarding_types
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for onboarding_requests
CREATE POLICY "Requesters can view their own requests" ON onboarding_requests
  FOR ALL USING (auth.uid() = requester_user_id);

CREATE POLICY "Recipients can view requests sent to them" ON onboarding_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = onboarding_requests.recipient_email
    )
  );

-- Create policies for documents
CREATE POLICY "Users can view their own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Requesters can view submitted documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM onboarding_requests 
      WHERE onboarding_requests.id = documents.request_id 
      AND onboarding_requests.requester_user_id = auth.uid()
    )
  );

-- Create policies for onboarding_consent
CREATE POLICY "Users can manage their own consent" ON onboarding_consent
  FOR ALL USING (auth.uid() = user_id);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Requesters can view submitted documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    EXISTS (
      SELECT 1 FROM documents d
      JOIN onboarding_requests r ON d.request_id = r.id
      WHERE d.file_path = name AND r.requester_user_id = auth.uid()
    )
  );
