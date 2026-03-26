# Ramply — Product Requirements

## Purpose

Ramply is a **one-click business document sharing platform**. Companies store their profile and compliance documents once, then share them instantly when a trading partner requests them — no re-typing, no re-scanning, no email threads.

The core insight: every business that onboards a vendor needs the same information. Ramply standardizes that information into a fixed catalog so sharing is a direct field-mapping, not a custom form per requester.

---

## How It Works (Core Flow)

1. **Company A** (requester) sends a share request to Company B's email. The request specifies which standard fields and documents are needed.
2. **Company B** (recipient) receives a magic-link email, signs up or logs in, and sees a pre-filled form populated from their saved profile.
3. Company B reviews, consents, and clicks **Share**. Done.
4. Company A can immediately view and download the shared data and documents from their dashboard.

Upload once. Share many times. The W-9 Company B uploaded for the first requester is reused for every subsequent one — they just click confirm.

---

## Standardized Schema

All users store data using the **same fixed field names and document types**. There are no custom fields, no arbitrary form builders. This is what makes sharing a lookup, not a transcription.

### Company Profile Fields

| Key | Label | Required |
|-----|-------|----------|
| `legal_name` | Legal Business Name | Yes |
| `ein` | EIN / Tax ID | Yes |
| `dba_name` | DBA / Trade Name | No |
| `business_type` | Business Type (LLC, Corporation, Partnership, Sole Proprietorship, etc.) | Yes |
| `address_line1` | Street Address | Yes |
| `address_line2` | Suite / Unit | No |
| `city` | City | Yes |
| `state` | State (US dropdown) | Yes |
| `postal_code` | ZIP Code | Yes |
| `country` | Country | Yes |
| `contact_name` | Primary Contact Name | Yes |
| `contact_email` | Contact Email | Yes |
| `contact_phone` | Contact Phone | Yes |
| `bank_name` | Bank Name | No |
| `bank_account_number` | Bank Account Number | No |
| `bank_routing_number` | Routing Number | No |
| `website` | Website | No |
| `year_founded` | Year Founded | No |

### Document Types (Document Vault)

| Key | Label |
|-----|-------|
| `W9` | W-9 Form |
| `resale_cert` | Resale Certificate |
| `liability_insurance` | Liability Insurance |
| `insurance_cert` | Certificate of Insurance |
| `bank_reference` | Bank Reference Letter |
| `articles_of_incorporation` | Articles of Incorporation |
| `business_license` | Business License |
| `voided_check` | Voided Check |

Documents are stored at the **company level**, not per request. One upload, reused across all share requests. The constraint `UNIQUE(company_id, document_type)` ensures only one active version of each document type exists per company; uploading a new version replaces the old one.

---

## User Roles

| Role | Description |
|------|-------------|
| `admin` | Sends share requests, views received data and documents, manages their company profile |
| `external` | Receives share requests via magic link, fills out their company profile, fulfills requests |

In practice both roles maintain a company profile and a document vault. The distinction is in who initiates the request.

---

## Key Features

### Company Profile
- Standardized form with all catalog fields
- US state dropdown for the `state` field
- Business type dropdown: LLC, Corporation, Partnership, Sole Proprietorship, Non-Profit, Other
- Saved to the `companies` table; editable at any time from the dashboard

### Document Vault
- Upload/replace documents by type (W-9, resale cert, etc.)
- File stored in Supabase Storage under `{user_id}/{document_type}/{filename}`
- One active document per type per company
- Documents are reused across all future share requests

### Share Requests (Requester Side)
- Enter recipient email
- Select which profile fields to request (checklist from the fixed catalog)
- Select which documents to request (checklist from the fixed catalog)
- System generates a unique token and sends a magic-link email via Resend
- Requester can track status: `pending`, `completed`, `expired`

### Fulfillment Flow (Recipient Side)
- Recipient opens magic link → signs up or logs in
- System pre-fills requested fields from their saved company profile
- For documents: if they've already uploaded the requested type, it shows "Use your saved W-9" — one click to confirm
- On submit: `shared_data` (field snapshot) and `shared_documents` (doc references) are written; request status → `completed`

### Admin Dashboard
- View all sent share requests and their status
- View fulfilled responses: field values in a structured table, document download links
- View incoming requests from other companies

### Connected Companies
A "connected company" is any company that has fulfilled at least one of your share requests (or vice versa). The billing tier is based on the number of connected companies.

---

## Billing

| Tier | Connected Companies | Price |
|------|--------------------:|-------|
| Free Trial | Up to 3 | $0/month |
| Growth | 4–15 | $19/month |
| Scale | 16+ | $39/month |

Billing is handled by **Stripe** (monthly subscription). Users on the free tier are not asked for a credit card until they exceed 3 connections.

> **To be implemented:** Stripe integration, connection counting, upgrade prompts, webhook handling for subscription lifecycle events.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) with Turbopack |
| Language | TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| Forms | react-hook-form + Zod validation |
| Data fetching | TanStack Query |
| Email | Resend (transactional email for share request links) |
| Billing | Stripe (planned) | interview me for questions on embedded checkout
| Testing | Vitest + Playwright |

---

## Database Schema (Summary)

```
users              — auth identity + role (admin | external)
companies          — standardized company profile (1:1 with users)
company_documents  — document vault: one row per document type per company
share_requests     — request from Company A to Company B email, with field + doc selections
shared_data        — snapshot of field values at time of fulfillment
shared_documents   — join table: which company_documents were shared for a given request
```

Row-Level Security is enabled on all tables. Users can only read and write their own data. Requesters gain read access to a respondent's data only after the respondent fulfills the request.

Storage bucket `documents` is private. Files are accessible to the owning user and, after sharing, to the requester.

---

## Source of Truth for the Catalog

`src/lib/catalog.ts` is the single source of truth for all valid field keys and document type keys. The database schema, UI components, validation, and RLS policies all reference the same set of keys. Adding a new field or document type requires updating only this file (and the DB schema).

---

## Out of Scope (Current Version)

- Custom / arbitrary form fields (by design — standardization is the product)
- Multi-user companies (one user account per company)
- Document expiration / renewal reminders
- PDF previews in-browser
- International addresses (US-only for now)
- Audit log / sharing history beyond the `shared_data` table


## API Keys
- Supabase Project ID = nmurnsriuxhzjhyeewgt
- Publishable key = sb_publishable_WNvcf26RSVvu6VhiNnldrg_nJ_wGzoW