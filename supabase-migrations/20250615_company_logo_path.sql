-- Add optional company logo storage path for branded PDF exports and profile display.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_path TEXT;
