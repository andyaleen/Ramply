-- Permanent public submit links for saved request templates.

ALTER TABLE request_templates
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

UPDATE request_templates
SET public_token = encode(gen_random_bytes(16), 'hex')
WHERE public_token IS NULL;

ALTER TABLE request_templates
  ALTER COLUMN public_token SET NOT NULL;

ALTER TABLE share_requests
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES request_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_share_requests_source_template_recipient
  ON share_requests (source_template_id, recipient_email)
  WHERE source_template_id IS NOT NULL AND status = 'pending';

-- Public metadata for template submit landing pages (no auth required).
CREATE OR REPLACE FUNCTION get_request_template_by_public_token(p_public_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  mandatory_fields TEXT[],
  optional_fields TEXT[],
  mandatory_documents TEXT[],
  optional_documents TEXT[],
  requester_company_legal_name TEXT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      rt.id,
      rt.name,
      rt.mandatory_fields,
      rt.optional_fields,
      rt.mandatory_documents,
      rt.optional_documents,
      c.legal_name
    FROM request_templates rt
    JOIN companies c ON c.id = rt.company_id
    WHERE rt.public_token = p_public_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_request_template_by_public_token(TEXT) TO anon, authenticated;

ALTER FUNCTION public.get_request_template_by_public_token(TEXT) SET search_path = public;
