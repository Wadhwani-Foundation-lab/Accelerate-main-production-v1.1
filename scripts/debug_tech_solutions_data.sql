-- ============================================================================
-- Debug query to check Tech Solutions India venture data
-- ============================================================================

-- 1. Find the venture record
SELECT
    id,
    name,
    founder_name,
    city,
    status,
    created_at
FROM ventures
WHERE name ILIKE '%Tech Solutions%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if venture_applications data exists
SELECT
    va.venture_id,
    v.name as venture_name,
    va.revenue_12m,
    va.revenue_potential_3y,
    va.full_time_employees,
    va.target_jobs,
    va.founder_email,
    va.founder_phone,
    va.founder_designation,
    va.company_type,
    va.state,
    va.created_at
FROM venture_applications va
JOIN ventures v ON v.id = va.venture_id
WHERE v.name ILIKE '%Tech Solutions%'
ORDER BY va.created_at DESC
LIMIT 5;

-- 3. Check complete venture data (if ventures_complete view exists)
SELECT
    id,
    name,
    founder_name,
    revenue_12m,
    revenue_potential_3y,
    full_time_employees,
    target_jobs
FROM ventures_complete
WHERE name ILIKE '%Tech Solutions%'
ORDER BY created_at DESC
LIMIT 5;
