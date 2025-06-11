-- Fix onboarding_consent table structure
-- The table is being used for general form submissions, not document-specific consent
-- So we need to make document_type optional or provide a sensible default

-- Make document_type nullable and provide a default for existing records
ALTER TABLE onboarding_consent 
ALTER COLUMN document_type DROP NOT NULL;

-- Update any existing NULL document_type values to a default
UPDATE onboarding_consent 
SET document_type = 'onboarding_form' 
WHERE document_type IS NULL;
