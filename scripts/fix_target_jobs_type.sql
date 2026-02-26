-- ============================================================================
-- Fix target_jobs column type from INTEGER to TEXT
-- ============================================================================
-- The form sends target_jobs as text values ("5", "20", "30")
-- but the column was created as integer in an earlier migration
-- ============================================================================

-- Change target_jobs from integer to text
ALTER TABLE venture_applications
ALTER COLUMN target_jobs TYPE text USING target_jobs::text;

-- Update the column comment
COMMENT ON COLUMN venture_applications.target_jobs IS 'Target jobs to be created (categorical: 5, 20, or 30 based on revenue_potential_12m)';

-- Verify the change
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'venture_applications'
AND column_name = 'target_jobs';
