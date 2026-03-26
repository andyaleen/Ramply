# Ramply - Executive Summary

**Project Overview:** 
Ramply is a B2B SaaS platform that dramatically simplifies business document sharing and vendor onboarding. Instead of forcing vendors to fill out custom forms and upload the same compliance documents (like W-9s and insurance certificates) repeatedly for every partner, Ramply standardizes the data. Companies build their profile and document vault once, then share it with one click when requested. 

**Main Features:**
- Standardized Company Profile (fixed catalog of data points like EIN, Legal Name, Address).
- Reusable Document Vault (secure, centralized storage for common B2B files).
- Token-based Share Requests sent via email (magic link).
- One-click fulfillment flow for respondents (pre-filled fields and auto-attached documents).
- Real-time Admin Dashboard for tracking requests and downloading shared data.

**Key User Flows:**
- **Requester Flow:** Selects standard fields/documents → Sends request via email.
- **Respondent Flow:** Clicks magic link → Reviews pre-filled profile/vault docs → Approves share request.
- **Dashboard Review Flow:** Requester monitors status → Downloads compliance docs once fulfilled.

**Key Requirements:**
- Next.js 15, Supabase (Auth, Postgres DB, Storage), Tailwind / shadcn/ui.
- Strict database schema mapping directly to the central catalog (`src/lib/catalog.ts`).
- Secure Row-Level Security ensuring documents remain private until explicitly shared.
- Stripe billing integration capping free tier at 3 connected companies.
