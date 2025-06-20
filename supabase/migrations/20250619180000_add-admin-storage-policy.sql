-- Allow admins to view documents for onboarding types they own
CREATE POLICY "Admins can view documents for their onboarding types" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    EXISTS (
      SELECT 1 FROM documents d
      JOIN onboarding_requests r ON d.request_id = r.id
      JOIN onboarding_types ot ON r.onboarding_type_id = ot.id
      WHERE d.file_path = name AND ot.user_id = auth.uid()
    )
  );
