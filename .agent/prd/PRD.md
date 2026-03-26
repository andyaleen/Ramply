# Ramply - Product Requirements Document

## 1. App Overview, Objectives, and Success Criteria
**App Name:** Ramply (formerly Onbo)
**Overview:** Ramply is a one-click business document sharing platform. It allows companies to store their profile and compliance documents once, then share them instantly when a trading partner requests them. This eliminates re-typing, re-scanning, and email threads by utilizing a fixed, standardized catalog of fields and documents rather than custom forms.
**Objectives:**
- Standardize B2B onboarding data mapping.
- Reduce time-to-onboard vendors and partners.
- Build a secure, reusable document vault for each company.
**Success Criteria / Metrics:**
- Seamless user onboarding and profile completion.
- Successful fulfillment of document share requests with one click.
- Conversion of free tier users to paid tiers as they exceed 3 connected companies.

## 2. Target Audience
B2B companies spanning various industries that regularly onboard vendors, contractors, or partners. Both Requesters (typically admins managing compliance and procurement) and Respondents (external vendors supplying compliance documents such as W-9, insurance certificates, resale certs).

## 3. Core Features and Functionality
- **Standardized Company Profile:** Fixed set of profile fields (Legal Name, EIN, Address, Bank Info, etc.).
- **Document Vault:** Secure storage for standard B2B documents (W-9, Resale Cert, Liability Insurance, Articles of Incorporation, etc.). One active document per type per company.
- **Share Requests (Admin/Requester):** Select from fixed fields and documents, then send a magic-link email to the recipient. Track status (pending, completed, expired).
- **Fulfillment Flow (Respondent):** Log in via magic link, pre-fill form from saved profile, confirm previously uploaded documents, and click "Share" to fulfill.
- **Admin Dashboard:** View pending/completed share requests, download received documents, and view incoming requests.
- **Billing:** Stripe integration to manage free tier (up to 3 connected companies) and paid tiers based on connection volume.

## 4. Key User Flows and Journeys
- **Request Flow (Company A):** Enters recipient email → selects needed fields/docs from catalog (e.g., Legal Name + W-9) → System generates token and emails Company B.
- **Fulfillment Flow (Company B):** Opens magic link → signs up/logs in → reviews pre-filled data and linked documents → clicks "Share".
- **Review Flow (Company A):** Gets notification → views Company B's shared data snapshot in the dashboard → downloads W-9.
- **Profile Management:** Any user logs into the dashboard at any time to update their company profile or replace a vault document.

## 5. Technical Stack Recommendations
- **Framework:** Next.js 15 (App Router) with Turbopack
- **Language:** TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui (Radix primitives)
- **Backend / Database / Auth / Storage:** Supabase (Postgres + Auth + Storage)
- **Forms & Validation:** react-hook-form + Zod
- **Data Fetching:** TanStack Query
- **Email:** Resend (transactional email for magic links / requests)
- **Billing:** Stripe (to be implemented)
- **Testing:** Vitest + Playwright

## 6. Conceptual Data Model
- `users`: Auth identity and role (admin/external).
- `companies`: 1:1 with users, holds the fixed standardized profile columns.
- `company_documents`: Document vault, one row per document type enum per company (`UNIQUE(company_id, document_type)`).
- `share_requests`: Request sent from Company A to Company B with requested field/doc array, token, and status.
- `shared_data`: Snapshot of field values at the time of fulfillment.
- `shared_documents`: Join table linking the request to the specific `company_documents` shared.
- *Source of Truth:* `src/lib/catalog.ts` defines all valid fields and document enum types.

## 7. Security Considerations
- **Row-Level Security (RLS):** Enabled on all Supabase tables. Profiles and vaults are private to the owner until explicitly shared. Requesters gain read access to respondent data and documents only after the request is fulfilled.
- **Authentication:** Passwordless/magic link via Supabase Auth.
- **Storage Policies:** The `documents` bucket is private; policies restrict access to the file owner and the authorized requester.
- **Service Keys:** Use Supabase Service Role key securely via edge functions/API routes (e.g. for creating tokens or interacting with Resend/Stripe).

## 8. Assumptions and Dependencies
- **US-Centric:** Addresses, entities, and tax documents (W-9, EIN) assume a US context initially.
- **Single User per Company:** Currently assumes one user account manages one company profile.
- **No PDF Previews:** Requesters will download documents to view them.
- **Dependencies:** Valid Supabase project config, valid Resend API key for outbound emails, Stripe integration for billing.
