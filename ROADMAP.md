# Ramply — Implementation Roadmap

This roadmap is based on the strategic pivot to a standardized document sharing model (the "Plaid Approach"). All tasks focus on transitioning from the old dynamic form builder to the new centralized catalog model.

## Phase 1: Data Layer & Foundation ✅ COMPLETE
**Goal:** Establish the single source of truth and update the database schema.
1. ✅ **Define Catalog as Code (`src/lib/catalog.ts`)**
   - Explicit enums and arrays for all 18 company fields and 8 document types.
2. ✅ **New Database Schema & RLS (`supabase-schema.sql`)**
   - Tables created: `companies`, `company_documents`, `share_requests`, `shared_data`, `shared_documents`.
   - Full Row-Level Security policies ensuring strict ownership, plus storage bucket policies.
   - ✅ Added uuid extension and NOT NULL constraints for key FKs/arrays to align with TypeScript types.
3. ✅ **Update TypeScript Types (`src/lib/database.types.ts`)**
   - Types regenerated for all 6 tables with Insert/Update/Row variants, typed to FieldKey and DocumentTypeKey.

## Phase 2: Core User Flows ✅ COMPLETE
**Goal:** Implement the primary UI for users to manage their profiles and documents.
4. ⚠️ **Company Profile & Document Vault pages**
   - ✅ `ProfileSetup` component — standardized form with all 18 catalog fields, functional.
   - ✅ `DocumentVault` component — upload/replace global company documents, functional.
   - ✅ Dashboard profile page now uses `companies` data for profile display and editing.
   - ✅ Added US states dropdown in ProfileSetup.

## Phase 3: The Sharing Engine ✅ COMPLETE
**Goal:** Implement the requester and fulfillment logic.
5. ✅ **Share Request Creation (Admin Side)**
   - `SendOnboardingRequestDialog` rewrote to email + field/doc catalog checklists.
   - Creation moved server-side (`POST /api/share-requests`): token generated via `crypto.randomBytes`, validated with Zod, inserted into `share_requests`, email sent via Resend — all in one atomic route.
6. ✅ **Fulfillment Flow (Respondent Side)**
   - `src/app/onboard/[token]/page.tsx` queries `share_requests` via `get_share_request_by_token` RPC.
   - Fields pre-filled from recipient's company profile; vault docs auto-matched by type.
   - `FulfillmentForm` calls `fulfill_share_request` RPC which atomically writes `shared_data`, `shared_documents`, and sets `status='completed'`.
   - `get_share_request_by_token` synthesizes `'expired'` status from `expires_at` — no background job needed.
7. ✅ **Email Integration (Resend)**
   - Invite email sent server-side inside `POST /api/share-requests` (non-blocking — email failure never blocks request creation).
   - Email includes requester name, field/doc counts, and share link.

## Phase 4: Review & Cleanup ✅ COMPLETE
**Goal:** Finalize the admin experience and remove deprecated code.
8. ✅ **Admin Response View**
   - `OnboardingResponsesList` rewritten to query `share_requests` (completed only) → `shared_data` → `shared_documents` → `company_documents`.
   - Detail dialog shows submitted field values (via `fieldLabel`) and document download links.
   - `admin/responses/page.tsx` stats (total, this month, unique vendors) rewritten against new schema.
9. ✅ **Deprecation Process**
   - `DROP TABLE IF EXISTS` added to `supabase-schema.sql` for `onboarding_types`, `onboarding_requests`, `onboarding_consent`, `documents`.
   - Deleted 16 deprecated files: `CreateOnboardingTypeDialog`, `EditOnboardingTypeDialog`, `DeleteOnboardingTypeDialog`, `ViewRequestsDialog`, `ViewDocumentsDialog`, `OnboardingTypesList`, `ExternalOnboardingTypesList`, `ExternalRequestsList`, `OnboardingRequestsList`, `OnboardingForm`, `DocumentUpload`, `ProfileDataReuse`, `services/dashboard.ts`, `services/requests.ts`, `services/vendors.ts`, `profile-utils.ts`, `onboard/new/page.tsx`.
   - `AdminDashboard`, `Dashboard`, `admin/request-types`, `dashboard/requests` all rewritten against new schema.
   - `npx tsc --noEmit` passes with zero errors.

## Phase 5: Monetization & Production Readiness ⚠️ IN PROGRESS
**Goal:** Launch-ready capabilities.
10. ⚠️ **Billing Integration (Stripe)** — handler ready; **webhook not configured in Stripe Dashboard yet**
    - ✅ Stripe client (`src/lib/stripe.ts`), billing utils (`src/lib/billing.ts`)
    - ✅ Checkout + Customer Portal routes (`/api/billing/checkout`, `/api/billing/portal`)
    - ✅ Webhook **handler** (`/api/webhooks/stripe`) — subscription created/updated/deleted
    - ❌ **Stripe Dashboard webhook endpoint** — not created; `STRIPE_WEBHOOK_SECRET` not verified in production
    - ✅ Free-tier enforcement in `POST /api/share-requests` (3-company cap) — works without webhook
    - ✅ Billing page (`/dashboard/billing`) with upgrade + manage flows
    - ✅ `companies` table has all Stripe billing columns
    - ⚠️ Stripe keys may be set in Vercel; subscription sync requires webhook setup (Phase G5 in launch plan)
11. ⚠️ **Third-Party Service Setup**
    - **Resend** — API key may be in Vercel; ❌ **invite emails not wired** in `POST /api/share-requests` (returns link only)
    - **Supabase (production)** — ⚠️ re-apply latest security SQL (`fulfill_share_request`, `users_insert_own`)
    - **Vercel** — connected; env vars set; build passes on main branch
12. ✅ **Testing & QA**
    - ✅ Playwright config + global setup (storageState auth for admin + vendor)
    - ✅ Smoke tests — public pages, redirects, invalid token (7 passing)
    - ✅ Auth flow tests — form validation, bad credentials, mismatched/short passwords (5 passing)
    - ✅ Share request full flow — requester → respondent → reviewer loop (5 passing, 1 unauthenticated)
    - ✅ 18/18 tests passing
    - ✅ Fixed recursive RLS policy on `companies_select_as_requester` (caused 500s)

## Phase 6: Request Ops & Backlog ❌ DEFERRED (OCR deprioritized)
**Goal:** Operational polish and advanced sharing — **not required for initial launch**.

### Launch blockers (do first — see production readiness plan)
- ❌ **Resend invite emails** — wire into `POST /api/share-requests`
- ❌ **Production security SQL** — apply latest `fulfill_share_request` + RLS to live Supabase
- ❌ **Stripe webhook (Dashboard)** — only when enabling paid billing

### Post-launch features
17. ⚠️ **Request Templates & Partial Fulfillment**
    - ✅ Templates API + `/dashboard/templates` + picker in send dialog
    - ❌ Partial fulfillment (share fields now, upload missing docs later)
18. ❌ **Reminder & Expiration UX**
    - ✅ “Expires in N days” on pending requests UI
    - ❌ Email reminders + renewal flow for expired links
19. ❌ **Compliance & Records**
    - Consent/disclosure tracking per share request
    - Audit trail of share events and document access
    - Data retention and purge policies (admin-configurable)
20. ❌ **Delivery Improvements**
    - Bundle downloads (ZIP + manifest of shared fields and docs)

### Backlog — Document Intelligence (deprioritized)
13–16. **OCR / Document AI** — scaffold exists (`src/lib/ocr/`, ingest API, DocumentReview) but **not prioritized**:
    - Auto-run OCR on upload, field normalization, provenance, conflict resolution
    - Revisit only if product explicitly requires document autofill

