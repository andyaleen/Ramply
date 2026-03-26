# Onboarding App — Completion Plan

## Core Model (The "Plaid Approach")

Every company stores their data using the **same standardized field names and document types**.
When Company A requests data from Company B, it's just selecting from a fixed catalog — and the
system does a direct field mapping to fulfill it. No custom forms, no arbitrary JSONB blobs.

---

## Current Schema vs. Required Schema

### What Exists (Wrong)
- `onboarding_types` with `required_fields JSONB` / `required_documents JSONB` — arbitrary custom fields per admin
- `onboarding_consent` with `form_data JSONB` — dumps whatever was entered
- Documents tied to requests, not to companies as reusable records
- `users` table holds some profile data but not a full standardized company profile

### What's Needed
- A `companies` table with **fixed, standardized columns** (no JSONB)
- A `company_documents` table — company's persistent vault of uploaded docs by type enum
- A `share_requests` table — specifies which standard fields/docs are being requested
- A `shared_data` table — the actual record of what was shared, to whom, when
- Remove `onboarding_types` (arbitrary form templates) — replace with fixed catalog
- Remove `onboarding_consent` (freeform JSONB) — replace with typed shared_data

---

## Standardized Catalog (Fixed, Not Configurable)

### Fields
| Key | Label |
|-----|-------|
| `legal_name` | Legal Business Name |
| `dba_name` | DBA / Trade Name |
| `ein` | EIN / Tax ID |
| `business_type` | Business Type (LLC, Corp, etc.) |
| `address_line1` | Street Address |
| `address_line2` | Suite / Unit |
| `city` | City |
| `state` | State |
| `postal_code` | ZIP Code |
| `country` | Country |
| `contact_name` | Primary Contact Name |
| `contact_email` | Contact Email |
| `contact_phone` | Contact Phone |
| `bank_name` | Bank Name |
| `bank_account_number` | Bank Account Number |
| `bank_routing_number` | Routing Number |
| `website` | Website |
| `year_founded` | Year Founded |

### Document Types
| Key | Label |
|-----|-------|
| `W9` | W-9 Form |
| `resale_cert` | Resale Certificate |
| `bank_reference` | Bank Reference Letter |
| `insurance_cert` | Certificate of Insurance |
| `articles_of_incorporation` | Articles of Incorporation |
| `business_license` | Business License |
| `voided_check` | Voided Check |

---

## New Database Schema

```sql
-- Companies table (standardized, replaces parts of users + onboarding_consent)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT,
  dba_name TEXT,
  ein TEXT,
  business_type TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  website TEXT,
  year_founded TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document vault — one record per document type per company
-- Company uploads W9 once; it lives here, reusable across all share requests
CREATE TABLE company_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'W9','resale_cert','bank_reference','insurance_cert',
    'articles_of_incorporation','business_license','voided_check'
  )),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, document_type) -- one active doc per type per company
);

-- Share requests — Company A asks Company B for specific standard fields/docs
CREATE TABLE share_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  requested_fields TEXT[] DEFAULT '{}',   -- e.g. ['legal_name','ein','address_line1']
  requested_documents TEXT[] DEFAULT '{}', -- e.g. ['W9','resale_cert']
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  completed_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared data — the snapshot of what was actually shared
-- Fields: direct column copy from companies at time of sharing
-- Documents: references to company_documents
CREATE TABLE shared_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_request_id UUID REFERENCES share_requests(id) ON DELETE CASCADE,
  sharing_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  field_data JSONB NOT NULL DEFAULT '{}', -- snapshot of shared field values
  shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- Join table: which documents were shared for a given request
CREATE TABLE shared_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_request_id UUID REFERENCES share_requests(id) ON DELETE CASCADE,
  company_document_id UUID REFERENCES company_documents(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Steps

### Step 1 — Define the Catalog as Code
Create `src/lib/catalog.ts` with the canonical list of field keys and document type keys.
This is the single source of truth used everywhere (UI selectors, validation, DB checks).

### Step 2 — New Database Schema
- Write the new `supabase-schema.sql` (above)
- Write RLS policies:
  - Companies: owner can read/write their own
  - company_documents: owner can read/write their own; requester can read after sharing
  - share_requests: requester can create/read; recipient can read by token; recipient can update status
  - shared_data / shared_documents: both parties can read; only sharer can insert

### Step 3 — Update TypeScript Types
Rewrite `src/lib/database.types.ts` to match the new schema exactly.
Add a `Catalog` type for field keys and document type keys.

### Step 4 — Company Profile Page
Replace/update the current profile setup so vendors fill in their standardized company profile.
Pre-filling works: when a request comes in, system checks which requested fields already exist
in the company's profile and pre-fills them — user just reviews and clicks "Share".

### Step 5 — Document Vault
New component: `CompanyDocumentVault` — lets a company upload/replace their W9, resale cert, etc.
Documents live at the company level, not per-request. Upload once, share many times.

### Step 6 — Share Request Creation (Admin Side)
Replace `CreateOnboardingTypeDialog` + `SendOnboardingRequestDialog` with a single
"New Share Request" flow:
1. Enter recipient email
2. Select from fixed field checklist (catalog fields)
3. Select from fixed document checklist (catalog doc types)
4. Send → generates token, stores `share_requests` row

### Step 7 — Fulfillment Flow (Recipient Side)
Update `src/app/onboard/[token]/page.tsx`:
1. Load share request by token
2. Load recipient's company profile
3. For each requested field: pre-fill from profile if available, else show input
4. For each requested document: show "Use your saved W9" if exists, else show upload
5. On submit: write `shared_data` (field snapshot) + `shared_documents` (doc links)
6. Update `share_requests.status = 'completed'`

### Step 8 — Admin Response View
Update responses view to read from `shared_data` and `shared_documents` instead of
`onboarding_consent` and `documents`. Show field values in a structured table (not raw JSONB).
Show document download links.

### Step 9 — Remove Old Tables / Code
Once new flow works end-to-end:
- Remove `onboarding_types` table and all related components
- Remove `onboarding_consent` table
- Remove old `documents` table (replaced by `company_documents` + `shared_documents`)
- Remove `CreateOnboardingTypeDialog`, `EditOnboardingTypeDialog`, `DeleteOnboardingTypeDialog`

### Step 10 — Email Integration
Integrate Resend (simplest API) to send the share request link to the recipient.
Edge function or Next.js API route: `POST /api/send-invite` → calls Resend.

---

## Files That Need the Most Change

| File | Change |
|------|--------|
| `supabase-schema.sql` | Full rewrite |
| `src/lib/database.types.ts` | Full rewrite to match new schema |
| `src/app/onboard/[token]/page.tsx` | Rewrite fulfillment flow |
| `src/components/dashboard/AdminDashboard.tsx` | Replace type management with share request creation |
| `src/components/dashboard/SendOnboardingRequestDialog.tsx` | Merge with type creation into single flow |
| `src/components/dashboard/OnboardingResponsesList.tsx` | Read from shared_data/shared_documents |
| `src/components/profile/ProfileSetup.tsx` | Use standardized company fields |
| `src/components/onboarding/OnboardingForm.tsx` | Replace dynamic JSONB form with catalog-mapped form |
| `src/components/onboarding/DocumentUpload.tsx` | Attach to company vault, not per-request |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/catalog.ts` | Canonical field + document type definitions |
| `src/components/company/DocumentVault.tsx` | Manage company's saved documents |
| `src/app/api/send-invite/route.ts` | Email sending via Resend |
| `storage-setup.sql` | Supabase storage bucket + policies |
