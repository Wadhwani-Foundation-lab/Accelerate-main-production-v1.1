-- ============================================================================
-- Fix venture_applications columns to use TEXT instead of numeric/integer
-- ============================================================================
-- The form sends categorical text values like "5Cr-25Cr", not numbers
-- This migration changes the data types to match what the form actually sends
-- ============================================================================

-- Change revenue_12m from numeric to text
ALTER TABLE venture_applications
ALTER COLUMN revenue_12m TYPE text USING revenue_12m::text;

-- Change revenue_potential_3y from numeric to text
ALTER TABLE venture_applications
ALTER COLUMN revenue_potential_3y TYPE text USING revenue_potential_3y::text;

-- Add revenue_potential_12m as text (if not exists)
ALTER TABLE venture_applications
ADD COLUMN IF NOT EXISTS revenue_potential_12m text;

-- Change full_time_employees from integer to text
ALTER TABLE venture_applications
ALTER COLUMN full_time_employees TYPE text USING full_time_employees::text;

-- Change incremental_hiring from integer to text
ALTER TABLE venture_applications
ALTER COLUMN incremental_hiring TYPE text USING incremental_hiring::text;

-- Add target_jobs as text (if not exists)
ALTER TABLE venture_applications
ADD COLUMN IF NOT EXISTS target_jobs text;

-- Remove old numeric constraints
ALTER TABLE venture_applications
DROP CONSTRAINT IF EXISTS positive_revenue_12m,
DROP CONSTRAINT IF EXISTS positive_revenue_potential,
DROP CONSTRAINT IF EXISTS positive_employees,
DROP CONSTRAINT IF EXISTS positive_hiring;

-- Update indexes
DROP INDEX IF EXISTS idx_applications_revenue_12m;
DROP INDEX IF EXISTS idx_applications_employees;

CREATE INDEX IF NOT EXISTS idx_applications_revenue_12m ON venture_applications(revenue_12m) WHERE revenue_12m IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_employees ON venture_applications(full_time_employees) WHERE full_time_employees IS NOT NULL;

-- Add comments
COMMENT ON COLUMN venture_applications.revenue_12m IS 'Last 12 months revenue (categorical: Pre Revenue, 1Cr-5Cr, 5Cr-25Cr, 25Cr-75Cr, >75Cr)';
COMMENT ON COLUMN venture_applications.revenue_potential_3y IS '3-year revenue potential (categorical: 5Cr - 15 Cr, 15Cr - 50Cr, 50Cr+)';
COMMENT ON COLUMN venture_applications.full_time_employees IS 'Number of full time employees (categorical: <10, 10-25, 25-100, >100)';
COMMENT ON COLUMN venture_applications.target_jobs IS 'Target jobs to be created (auto-calculated from revenue potential)';
