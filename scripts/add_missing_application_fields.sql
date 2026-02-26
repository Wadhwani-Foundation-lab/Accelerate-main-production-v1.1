-- ============================================================================
-- Add missing fields to venture_applications table
-- ============================================================================
-- Following production schema v2.0 design patterns:
-- - revenue_potential_12m: text (categorical dropdown values)
-- - target_jobs: integer (numeric count)
-- ============================================================================

ALTER TABLE venture_applications
ADD COLUMN IF NOT EXISTS revenue_potential_12m text CHECK (
    revenue_potential_12m IS NULL OR
    revenue_potential_12m IN ('5Cr - 15 Cr', '15Cr - 50Cr', '50Cr+')
),
ADD COLUMN IF NOT EXISTS target_jobs integer CHECK (
    target_jobs IS NULL OR target_jobs >= 0
);

-- Add comments for documentation
COMMENT ON COLUMN venture_applications.revenue_potential_12m IS '12-month revenue potential (categorical: 5Cr - 15 Cr, 15Cr - 50Cr, 50Cr+)';
COMMENT ON COLUMN venture_applications.target_jobs IS 'Target number of jobs to be created';

-- Create index for filtering by revenue_potential_12m
CREATE INDEX IF NOT EXISTS idx_applications_revenue_potential_12m ON venture_applications(revenue_potential_12m) WHERE revenue_potential_12m IS NOT NULL;
