-- Pin search_path on SECURITY DEFINER functions missing it (search-path hijack hardening).

ALTER FUNCTION public.get_share_request_by_token(TEXT) SET search_path = public;
ALTER FUNCTION public.fulfill_share_request(UUID, JSONB, UUID[]) SET search_path = public;
ALTER FUNCTION public.get_my_active_vault_documents() SET search_path = public;
ALTER FUNCTION public.set_user_role(UUID, TEXT) SET search_path = public;
