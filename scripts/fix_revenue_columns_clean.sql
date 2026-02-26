-- ============================================================================
-- Fix venture_applications to store ONLY form fields as TEXT
-- ============================================================================
-- The form sends 4 key values as categorical text (like "5Cr-25Cr", "<10")
-- This migration cleans up the schema to match EXACTLY what the form sends
-- ============================================================================

-- Step 1: Drop ALL views that depend on these columns
DROP VIEW IF EXISTS ventures_complete;
DROP VIEW IF EXISTS venture_analytics;

-- Step 2: Remove old numeric constraints FIRST (before changing types)
ALTER TABLE venture_applications
DROP CONSTRAINT IF EXISTS positive_revenue_12m;

ALTER TABLE venture_applications
DROP CONSTRAINT IF EXISTS positive_revenue_potential;

ALTER TABLE venture_applications
DROP CONSTRAINT IF EXISTS positive_employees;

ALTER TABLE venture_applications
DROP CONSTRAINT IF EXISTS positive_hiring;

-- Step 3: Now change columns to TEXT (for the 4 dashboard fields)
ALTER TABLE venture_applications
ALTER COLUMN revenue_12m TYPE text USING revenue_12m::text;

ALTER TABLE venture_applications
ALTER COLUMN revenue_potential_3y TYPE text USING revenue_potential_3y::text;

ALTER TABLE venture_applications
ALTER COLUMN full_time_employees TYPE text USING full_time_employees::text;

-- Step 4: Add target_jobs column (if not exists)
ALTER TABLE venture_applications
ADD COLUMN IF NOT EXISTS target_jobs text;

-- Step 5: Keep incremental_hiring as text (used in form commitment object)
ALTER TABLE venture_applications
ALTER COLUMN incremental_hiring TYPE text USING incremental_hiring::text;

-- Step 6: Update indexes
DROP INDEX IF EXISTS idx_applications_revenue_12m;
DROP INDEX IF EXISTS idx_applications_employees;

CREATE INDEX IF NOT EXISTS idx_applications_revenue_12m ON venture_applications(revenue_12m) WHERE revenue_12m IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_employees ON venture_applications(full_time_employees) WHERE full_time_employees IS NOT NULL;

-- Step 7: Add helpful comments
COMMENT ON COLUMN venture_applications.revenue_12m IS 'Last 12 months revenue (categorical: Pre Revenue, 1Cr-5Cr, 5Cr-25Cr, 25Cr-75Cr, >75Cr)';
COMMENT ON COLUMN venture_applications.revenue_potential_3y IS '3-year revenue potential (categorical: 5Cr - 15 Cr, 15Cr - 50Cr, 50Cr+)';
COMMENT ON COLUMN venture_applications.full_time_employees IS 'Number of full time employees (categorical: <10, 10-25, 25-100, >100)';
COMMENT ON COLUMN venture_applications.target_jobs IS 'Target jobs to be created (auto-calculated: 5, 20, or 30)';

-- Step 8: Recreate the ventures_complete view with TEXT columns
CREATE OR REPLACE VIEW ventures_complete AS
SELECT
  v.*,
  va.revenue_12m,
  va.revenue_potential_3y,
  va.full_time_employees,
  va.incremental_hiring,
  va.target_jobs,
  va.growth_focus,
  va.support_request,
  p.name as program_display_name,
  p.tier as program_tier,
  sh.allocated as support_hours_allocated,
  sh.used as support_hours_used,
  sh.balance as support_hours_balance,
  vsm.full_name as vsm_name,
  vm.full_name as vm_name,
  entrepreneur.full_name as entrepreneur_name,
  entrepreneur.email as entrepreneur_email,
  -- Latest assessment
  (
    SELECT jsonb_build_object(
      'decision', decision,
      'program_recommendation', program_recommendation,
      'ai_analysis', ai_analysis,
      'assessed_at', created_at
    )
    FROM venture_assessments
    WHERE venture_id = v.id AND is_current = true AND assessment_type = 'screening'
    ORDER BY created_at DESC
    LIMIT 1
  ) as latest_screening,
  -- Latest committee review
  (
    SELECT jsonb_build_object(
      'decision', decision,
      'venture_partner', venture_partner,
      'assessed_at', created_at
    )
    FROM venture_assessments
    WHERE venture_id = v.id AND is_current = true AND assessment_type = 'committee'
    ORDER BY created_at DESC
    LIMIT 1
  ) as latest_committee_review
FROM ventures v
LEFT JOIN venture_applications va ON va.venture_id = v.id
LEFT JOIN programs p ON p.id = v.program_id
LEFT JOIN support_hours sh ON sh.venture_id = v.id
LEFT JOIN profiles vsm ON vsm.id = v.assigned_vsm_id
LEFT JOIN profiles vm ON vm.id = v.assigned_vm_id
LEFT JOIN profiles entrepreneur ON entrepreneur.id = v.user_id
WHERE v.deleted_at IS NULL;

-- Step 9: Recreate venture_analytics view with TEXT columns
CREATE OR REPLACE VIEW venture_analytics AS
SELECT
  v.id,
  v.name,
  v.status,
  v.created_at,
  va.revenue_12m,
  va.full_time_employees,
  p.name as program_name,
  p.tier as program_tier,
  -- Days in current status
  EXTRACT(DAY FROM (now() - v.updated_at)) as days_in_status,
  -- Days since submission
  EXTRACT(DAY FROM (now() - v.created_at)) as days_since_submission,
  -- Has assessment
  EXISTS(SELECT 1 FROM venture_assessments WHERE venture_id = v.id) as has_assessment,
  -- Stream completion
  (
    SELECT ROUND(AVG(CASE WHEN status = 'Completed' THEN 100 ELSE 0 END))
    FROM venture_streams
    WHERE venture_id = v.id
  ) as stream_completion_rate
FROM ventures v
LEFT JOIN venture_applications va ON va.venture_id = v.id
LEFT JOIN programs p ON p.id = v.program_id
WHERE v.deleted_at IS NULL;
