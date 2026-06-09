-- Let requesters reliably read shared documents and recipient company names.

CREATE OR REPLACE FUNCTION get_requester_shared_documents(p_share_request_ids UUID[])
RETURNS TABLE (
  share_request_id UUID,
  id UUID,
  company_id UUID,
  document_type TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT,
  version INT,
  superseded_by UUID,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.share_request_id,
    cd.id,
    cd.company_id,
    cd.document_type,
    cd.file_path,
    cd.file_name,
    cd.file_size,
    cd.mime_type,
    cd.file_hash,
    cd.version,
    cd.superseded_by,
    cd.uploaded_at
  FROM shared_documents sd
  JOIN company_documents cd ON cd.id = sd.company_document_id
  JOIN share_requests sr ON sr.id = sd.share_request_id
  JOIN companies requester ON sr.requester_company_id = requester.id
  WHERE requester.owner_user_id = auth.uid()
    AND sd.share_request_id = ANY(p_share_request_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_requester_shared_documents(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION get_requester_shared_companies(p_company_ids UUID[])
RETURNS TABLE (
  id UUID,
  legal_name TEXT,
  dba_name TEXT,
  owner_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id, c.legal_name, c.dba_name, c.owner_user_id
  FROM companies c
  JOIN share_requests sr ON sr.completed_by_company_id = c.id
  JOIN companies requester ON sr.requester_company_id = requester.id
  WHERE requester.owner_user_id = auth.uid()
    AND c.id = ANY(p_company_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_requester_shared_companies(UUID[]) TO authenticated;
