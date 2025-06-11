-- Add missing columns to onboarding_consent table
-- This migration adds the form_data and submitted_at columns that the application expects

-- Add form_data column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_consent' AND column_name = 'form_data'
    ) THEN
        ALTER TABLE onboarding_consent ADD COLUMN form_data JSONB;
    END IF;
END $$;

-- Add submitted_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_consent' AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE onboarding_consent ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;