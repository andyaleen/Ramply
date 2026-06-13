# Beta auth & security checklist

Use this before inviting beta testers. Code-side fixes from the security audit are in place; these are **dashboard and deployment** steps.

## Supabase Auth

### URL configuration (Auth → URL Configuration)

- [X] **Site URL** matches production `NEXT_PUBLIC_APP_URL` (e.g. `https://www.ramply.org`)
- [X] **Redirect URLs** allowlist includes every auth callback origin you use:
  - `https://your-domain/auth/callback`
  - `https://your-domain/auth/confirm`
  - Local dev ports if needed (`http://localhost:3000/auth/callback`, etc.)
- [ ] Remove stale or wildcard redirect URLs you no longer use

### JWT & sessions (Auth → Settings or Project Settings → API)

- [ ] **JWT expiry** is aligned with Ramply policy (app enforces **8h absolute** / **30m idle**; Supabase JWT can match or be slightly longer — if JWT lives much longer than 8h, expired UI sessions may still refresh via API until you tighten this)
- [ ] **Refresh token rotation** enabled (Supabase default — verify not disabled)
- [ ] Email confirmation required for email/password signups (or confirm your server-side confirm flow is intentional)

### Google OAuth (Auth → Providers → Google)

- [ ] Google Cloud OAuth client **Authorized JavaScript origins** include your app domain(s)
- [ ] **Authorized redirect URIs** include Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] OAuth client type is **Web application** (not desktop)
- [ ] OAuth consent screen links to public legal pages:
  - Privacy policy: `https://www.ramply.org/privacy`
  - Terms of service: `https://www.ramply.org/terms`

### Database migrations (SQL editor)

Run any pending files from `supabase-migrations/` not yet applied:

- [ ] `20250616_companies_logo_path_check.sql` — logo path RLS
- [ ] `20250617_users_prevent_self_role_change.sql` — block self role promotion
- [ ] Other dated migrations since your last deploy

## Vercel / production env

- [ ] `NEXT_PUBLIC_APP_URL` = production origin (no trailing slash)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / anon key match the Supabase project
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server only — never expose to client)
- [ ] **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** set for global auth rate limits ([Upstash console](https://console.upstash.com/) → Redis → REST API). Without these, limits are in-memory per server instance only.

## Manual smoke tests

- [ ] Sign in with Google → account picker appears (`prompt=select_account`)
- [ ] Sign out of Ramply → still signed into Google in same browser (expected); sign out of Google separately on shared machines
- [ ] Idle **30+ minutes** → redirected to login with session-expired reason
- [ ] Password sign-in with wrong email/password → generic error (no “user not found” vs “use Google” leak)
- [ ] Password reset for unknown email → same success toast as known email
- [ ] Rapid sign-in attempts → `429` / “Too many attempts”
- [ ] PDF export / document download works after normal login; fails after session cleared

## Beta tester guidance (share in invite email)

- Use **Continue with Google** if you registered with Google; password sign-in will not work for those accounts.
- On **shared computers**, sign out of both Ramply and your Google account when finished.
- Session expires after **30 minutes idle** or **8 hours** total — save work in forms before stepping away.

## Optional hardening (post-beta)

- [ ] Upstash / WAF rules for additional IP blocking
- [ ] Supabase Auth hooks or CAPTCHA on sign-up
- [ ] Monitoring on `429`, `SESSION_EXPIRED`, and auth error rates
