# Ramply (onboardingapp)

B2B vendor onboarding and document sharing: companies build a profile and document vault once, then fulfill share requests via magic links.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Auth, Postgres, Storage, RLS)
- **Stripe** (billing), **Resend** (email), **Google Document AI** (optional OCR)
- **Tailwind CSS 4**, Radix UI, React Hook Form + Zod, TanStack Query

## Quick start

```powershell
npm install
cp .env.example .env.local   # fill in Supabase + optional Stripe/Resend/OCR
npm run setup-db             # prints SQL setup steps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

1. Create a Supabase project.
2. Run [`supabase-schema.sql`](supabase-schema.sql) in the SQL editor (full file).
3. Create a private Storage bucket named `documents`.
4. Re-run schema after pulls that change RPCs or RLS (e.g. `fulfill_share_request`).

See [`docs/DATA_RETENTION.md`](docs/DATA_RETENTION.md) for sensitive field handling.

## Environment variables

Copy [`.env.example`](.env.example). Required for core app:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `NEXT_PUBLIC_APP_URL` | App origin for share links (e.g. `http://localhost:3000`) |

Optional: `STRIPE_*`, `RESEND_API_KEY`, `GOOGLE_CLOUD_*` / `OCR_PROVIDER`, `SUPABASE_SERVICE_ROLE_KEY` (webhooks only).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run setup-db` | Setup checklist + env validation |

## Main routes

| Route | Description |
|-------|-------------|
| `/` | Marketing landing |
| `/login`, `/signup` | Auth |
| `/dashboard` | Unified dashboard (send requests, responses, documents, billing) |
| `/dashboard/templates` | Reusable request templates |
| `/onboard/[token]` | Respondent fulfillment |
| `/complete-profile` | Initial company profile setup |

Legacy `/admin/*` paths redirect to `/dashboard/*` via `next.config.ts`.

## Key components

- `FulfillmentForm` — respondent share flow
- `SendOnboardingRequestDialog` — create share requests (requires recipient email)
- `ProfileSetup` / `DocumentVault` — company profile and documents
- `DocumentReview` — OCR field review and apply-to-profile

## E2E tests

Playwright config: `src/playwright.config.ts`.

```powershell
npm run test:e2e
```

Full share-request flow needs test users in `.env.local`:

- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`
- `E2E_VENDOR_EMAIL` / `E2E_VENDOR_PASSWORD`

Smoke and auth validation tests run without credentials.

## Production checklist

- Apply latest `supabase-schema.sql` to production Supabase (security RPC/RLS)
- Configure Stripe webhook in Stripe Dashboard → `/api/webhooks/stripe` **when enabling billing** (handler code is ready; endpoint not set up yet)
- Verify Resend domain and **wire invite emails** in share-requests route

See [ROADMAP.md](ROADMAP.md) for feature status.
