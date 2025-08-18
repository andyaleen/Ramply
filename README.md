# Onbo SaaS Platform
## Onbo — Onboarding SaaS (onboardingapp)

This repository contains a TypeScript + Next.js application that provides a configurable onboarding workflow for external partners and vendors. It includes a user-facing onboarding flow (forms + document uploads) and an admin dashboard to manage onboarding types, requests, and responses. The app uses Supabase for auth, data, and file storage.

## Key goals of this README
- Provide a quick but complete developer setup guide
- Document runtime and build scripts included in `package.json`
- Call out environment variables and DB setup steps
- Summarize architecture, features, and next steps for production

---

## Quick project summary
- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS + shadcn-like components
- Auth / DB / Storage: Supabase
- Forms & Validation: React Hook Form + Zod
- Data fetching: TanStack Query (React Query)

Primary entry: `src/app/page.tsx` (user-facing) and `src/app/admin/layout.tsx` (admin area).

## Features
- Dynamic onboarding form generation with field-level Zod validation
- Document upload with drag-and-drop, file-type and size checks, and Supabase Storage integration
- Profile data reuse to pre-fill repeated information
- Admin dashboard for creating onboarding types, sending tokenized requests, and tracking progress
- Role-aware UI and protected routes via Supabase authentication

## Prerequisites
- Node.js 18+ and npm or pnpm
- A Supabase project (database + auth + storage)
- Git (optional, recommended)

Assumptions
- A setup script `setup-database.js` exists (package.json includes `setup-db`) to run initial DB tasks — if it is not present, run the SQL manually in your Supabase dashboard.
- `supabase-schema.sql` is present in the repository and contains the schema; if additional storage setup SQL is required check for `storage-setup.sql` or run those steps in the Supabase console.

## Environment variables
Create a `.env.local` file at the project root and set the following variables:

- NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
- NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
- SUPABASE_SERVICE_ROLE_KEY=<service-role-key> (only for server-side scripts that require elevated privileges)
- NEXTAUTH_URL=http://localhost:3000 (or your production host)

Notes
- Keep service role keys secret. Never commit `.env.local`.

## Install and run (local development)
Install dependencies and run the dev server. Example using npm:

```powershell
npm install
npm run dev
```

The app uses the `dev` script defined in `package.json` (Next's Turbopack dev server). The default port is 3000 unless overridden.

Useful scripts (from `package.json`)
- `npm run dev` — Run Next.js in development
- `npm run build` — Build for production
- `npm run start` — Start built app
- `npm run lint` — Run ESLint
- `npm run setup-db` — (If present) run the repository's DB setup helper

## Database / Supabase setup
1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase-schema.sql` from the repository root.
3. Create a storage bucket for onboarding documents and configure RLS and bucket policies according to your security requirements.
4. If present, run `storage-setup.sql` or follow the SQL file provided for storage-specific policies.
5. If the repo provides `setup-database.js`, run:

```powershell
npm run setup-db
```

If `setup-database.js` needs the service role key, ensure `SUPABASE_SERVICE_ROLE_KEY` is exported in `.env.local`.

### RLS & Security
- Review Row Level Security (RLS) policies after importing the schema. The app expects RLS rules so that users can only access their own records. Adjust policies for admin roles as needed.

## Directory layout (high level)
- `src/app/` — Next.js app routes (user + admin)
- `src/components/` — Reusable UI and domain components
- `src/contexts/` — Auth and app contexts
- `src/lib/` — Utilities, Supabase client, validations
- `public/` — Static assets
- `supabase-schema.sql` — Database schema and policies

## Architecture notes
- Client-side: React components with React Hook Form & Zod for robust validation
- Data layer: TanStack Query caches server responses; server calls go to Supabase (RESTful/JS SDK)
- Storage: Files are uploaded to Supabase Storage with per-file metadata stored in the DB
- Auth: Supabase Auth (email + magic links or OAuth depending on your Supabase settings)

## Testing recommendations
- Add unit tests for core form logic (validation + data mapping)
- Add integration tests for the onboarding flow (mock Supabase or use a test project)
- E2E: Playwright or Cypress to cover the end-to-end onboarding request → response flow

## Production & Deployment
- Build with `npm run build` and run `npm run start` on a node host or platform like Vercel/Netlify with server-side support for Next.js App Router.
- Set environment variables in your host (do not use client-exposed ANON keys for privileged operations).
- Configure CORS and domain settings in Supabase and in the app if you use custom domains.

Security checklist for production
- Rotate and protect service keys
- Harden RLS policies and validate with test users
- Use HTTPS and set secure cookie flags
- Consider rate limiting and captcha on public endpoints

## Observability & Maintenance
- Add error monitoring (Sentry) and set up alerts
- Add performance monitoring and important dashboards (request throughput, upload errors, auth failures)

## Contributing
- Fork and open a PR with a clear description of changes
- Run linters and type checks before opening PRs
- Add tests for new behaviors or bug fixes

## Troubleshooting
- If uploads fail: check Supabase Storage bucket permissions, CORS, and env keys
- If auth fails: verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- If DB queries return empty: verify RLS policies and the logged-in user's identifiers

### Core Onboarding System
- **OnboardingForm Component** (`src/components/onboarding/OnboardingForm.tsx`)
  - Dynamic form generation based on onboarding type requirements
  - Sections: Company Info, Contact Details, Tax Info, Banking, Insurance, Certifications
  - Form validation with Zod schema validation
  - Error handling with helper functions for type safety
  - Integration with React Hook Form for optimal UX

- **DocumentUpload Component** (`src/components/onboarding/DocumentUpload.tsx`)
  - Drag-and-drop file upload functionality
  - File type validation (PDF, DOC, DOCX, images)
  - File size validation (max 10MB)
  - Supabase storage integration with secure file paths
  - Upload progress indicators and error handling
  - Document status tracking (uploaded/required)

- **ProfileDataReuse Component** (`src/components/onboarding/ProfileDataReuse.tsx`)
  - Fetches existing user profile data from previous submissions
  - Allows users to prefill forms with previously entered information
  - Reduces redundant data entry for returning users
  - Smart data merging based on required form fields
### Admin Dashboard
- **Dashboard Component** (`src/components/dashboard/Dashboard.tsx`)
  - Tabbed interface for managing onboarding types and requests
  - Real-time data from Supabase with React Query
  - Comprehensive request tracking and status updates

- **CreateOnboardingTypeDialog** (`src/components/dashboard/CreateOnboardingTypeDialog.tsx`)
  - Create custom onboarding workflows
  - Select required fields and documents dynamically
  - Form validation and error handling

- **OnboardingRequestsList** (`src/components/dashboard/OnboardingRequestsList.tsx`)
  - View all onboarding requests with filtering
  - Status tracking (pending, completed, expired)
  - Request management capabilities

- **SendOnboardingRequestDialog** (`src/components/dashboard/SendOnboardingRequestDialog.tsx`)
  - Send onboarding invitations via email
  - Token-based secure access links
  - Expiration date management

### Supporting Infrastructure
- **Authentication Context** (`src/contexts/AuthContext.tsx`)
  - Supabase authentication integration
  - User session management
  - Protected route handling

- **Database Integration**
  - Complete Supabase schema setup (`supabase-schema.sql`)
  - Row Level Security (RLS) policies
  - Storage bucket configuration (`storage-setup.sql`)
  - Type-safe database operations

- **Utility Functions**
  - Profile data utilities (`src/lib/profile-utils.ts`)
  - Form validation schemas (`src/lib/validations.ts`)
  - Supabase client configuration

### UI/UX Components
- **Modern UI Components** (shadcn/ui based)
  - Cards, buttons, inputs, dialogs, badges
  - Consistent design system
  - Responsive layouts
  - Loading states and error handling

- **Success Pages**
  - Onboarding completion confirmation
  - Clear next steps for users

## 🔧 TECHNICAL IMPLEMENTATION

### Frontend Stack
- **Next.js 15.3.3** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **React Query** for data fetching
- **Lucide React** for icons

### Backend Integration
- **Supabase** for database and authentication
- **Supabase Storage** for file management
- **Row Level Security** for data protection
- **Real-time subscriptions** ready for future features

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** with custom configuration
- **VS Code** optimized workspace

## 🚀 CURRENT STATUS

✅ **All Core Features Implemented**
✅ **TypeScript Compilation Passing**
✅ **Development Server Running** (http://localhost:3001)
✅ **No Build Errors**
✅ **All Dependencies Installed**

### Test Pages Available
- `/test` - Complete onboarding form testing
- `/admin-test` - Admin dashboard overview
- Main application at `/`








