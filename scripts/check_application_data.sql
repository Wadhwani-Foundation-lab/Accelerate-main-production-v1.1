-- ============================================================================
-- Test Script: Verify Application Data is Persisting Correctly
-- ============================================================================
-- Run this in Supabase SQL Editor to check if form data is being saved
-- ============================================================================

-- 1. Check the latest venture record
SELECT
    id,
    name,
    founder_name,
    city,
    status,
    created_at
FROM ventures
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check the venture_applications data for the latest venture
-- This shows the 4 KEY FIELDS we need for the dashboard
SELECT
    va.id,
    va.venture_id,
    v.name as venture_name,

    -- THE 4 DASHBOARD FIELDS
    va.revenue_12m as "CURRENT REVENUE (last 12 months)",
    va.revenue_potential_3y as "TARGET REVENUE (3 years)",
    va.full_time_employees as "CURRENT EMPLOYEES",
    va.target_jobs as "TARGET JOBS",

    -- Additional fields for verification
    va.what_do_you_sell,
    va.who_do_you_sell_to,
    va.which_regions,
    va.company_type,
    va.founder_email,
    va.founder_phone,
    va.incremental_hiring as "FUNDING METHOD",
    va.growth_focus,
    va.created_at
FROM venture_applications va
JOIN ventures v ON v.id = va.venture_id
ORDER BY va.created_at DESC
LIMIT 1;

-- 3. Check if venture_streams (support areas) were created
SELECT
    vs.venture_id,
    v.name as venture_name,
    vs.stream_name,
    vs.status
FROM venture_streams vs
JOIN ventures v ON v.id = vs.venture_id
ORDER BY vs.created_at DESC
LIMIT 10;

-- 4. Quick summary of all ventures with key fields
SELECT
    v.name,
    v.status,
    va.revenue_12m,
    va.revenue_potential_3y,
    va.full_time_employees,
    va.target_jobs,
    v.created_at
FROM ventures v
LEFT JOIN venture_applications va ON va.venture_id = v.id
ORDER BY v.created_at DESC
LIMIT 5;

-- 5. VERIFY DATA TYPES - Critical for ensuring no future conflicts
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'venture_applications'
AND column_name IN (
    'revenue_12m',
    'revenue_potential_3y',
    'full_time_employees',
    'target_jobs',
    'incremental_hiring'
)
ORDER BY column_name;

-- 6. VERIFY NO NUMERIC CONSTRAINTS REMAIN (should return empty)
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'venture_applications'::regclass
AND conname IN (
    'positive_revenue_12m',
    'positive_revenue_potential',
    'positive_employees',
    'positive_hiring'
);
