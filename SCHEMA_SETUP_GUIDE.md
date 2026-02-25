# Production Schema V2.0 - Quick Setup Guide

## 🎯 Overview

This guide will help you set up the production-ready database schema for Wadhwani Accelerate.

---

## ✅ Prerequisites

Before you begin, ensure you have:

1. **Supabase Account** - Sign up at https://supabase.com if you haven't already
2. **Supabase Project** - Create a new project or use an existing one
3. **Database Access** - Access to the SQL Editor in your Supabase dashboard

---

## 🚀 Fresh Installation (New Project)

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema Script

1. Open the file [`production_schema_v2.sql`](production_schema_v2.sql) in your code editor
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **RUN** (or press Cmd/Ctrl + Enter)
5. Wait for the query to complete (should take 10-30 seconds)

### Step 3: Verify Installation

You should see a success message like:

```
============================================================
Production Schema V2.0 Setup Complete!
============================================================
Created Tables:
  - profiles (with auto-role assignment)
  - programs (pre-seeded with 5 programs)
  - ventures (core venture data)
  - venture_applications (normalized form data)
  ...
```

**To verify tables were created:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see 13+ tables.

### Step 4: Check RLS Status

Run this query to ensure Row Level Security is enabled on all tables:

```sql
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'venture%' OR tablename IN ('profiles', 'programs')
ORDER BY tablename;
```

All tables should show **"✓ Enabled"**.

---

## 🔄 Migration (Existing Project)

### Option A: Keep Existing Data

If you have existing data in tables like `ventures`, `profiles`, etc., follow this approach:

#### Step 1: Backup Your Data

**Using Supabase Dashboard:**
1. Go to **Database** → **Backups**
2. Click **Create Backup**
3. Wait for backup to complete

**Or export specific tables:**
```sql
COPY ventures TO '/tmp/ventures_backup.csv' CSV HEADER;
COPY profiles TO '/tmp/profiles_backup.csv' CSV HEADER;
```

#### Step 2: Check for Conflicts

Run this query to see which tables already exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'programs', 'ventures', 'venture_applications',
    'venture_assessments', 'venture_roadmaps', 'venture_streams',
    'venture_milestones', 'venture_deliverables', 'support_hours',
    'venture_interactions', 'venture_agreements', 'venture_status_history'
  )
ORDER BY table_name;
```

#### Step 3: Selective Migration

**For tables that DON'T exist yet** (like `venture_assessments`, `venture_roadmaps`):

1. Extract only those table definitions from `production_schema_v2.sql`
2. Run them individually

**For tables that ALREADY exist** (like `ventures`, `profiles`):

1. Check if new columns are needed:

```sql
-- Check if ventures has all new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ventures'
ORDER BY column_name;
```

2. Add missing columns:

```sql
-- Example: Add missing columns to ventures
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS assigned_vm_id uuid REFERENCES profiles(id);
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS workbench_locked boolean DEFAULT true;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- ... add other missing columns
```

#### Step 4: Migrate Data to New Structure

If you have data in old JSONB fields that needs to be normalized:

```sql
-- Example: Migrate VSM assessment data to new assessment table
INSERT INTO venture_assessments (
  venture_id,
  assessment_type,
  assessed_by,
  assessor_role,
  notes,
  internal_comments,
  ai_analysis,
  program_recommendation,
  is_current,
  created_at
)
SELECT
  id,
  'screening',
  assigned_vsm_id,
  'success_mgr',
  vsm_notes,
  internal_comments,
  ai_analysis,
  program_recommendation,
  true,
  COALESCE(vsm_reviewed_at, updated_at)
FROM ventures
WHERE vsm_notes IS NOT NULL
   OR program_recommendation IS NOT NULL
   OR ai_analysis IS NOT NULL;
```

### Option B: Clean Slate (Delete Existing Data)

⚠️ **WARNING: This will delete all existing data!**

```sql
-- Drop all existing tables
DROP TABLE IF EXISTS venture_status_history CASCADE;
DROP TABLE IF EXISTS venture_agreements CASCADE;
DROP TABLE IF EXISTS venture_interactions CASCADE;
DROP TABLE IF EXISTS support_hours CASCADE;
DROP TABLE IF EXISTS venture_deliverables CASCADE;
DROP TABLE IF EXISTS venture_milestones CASCADE;
DROP TABLE IF EXISTS venture_streams CASCADE;
DROP TABLE IF EXISTS venture_roadmaps CASCADE;
DROP TABLE IF EXISTS venture_assessments CASCADE;
DROP TABLE IF EXISTS venture_applications CASCADE;
DROP TABLE IF EXISTS ventures CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Then run the full production_schema_v2.sql
```

---

## 🧪 Testing the Setup

### 1. Create a Test User

**Via Supabase Dashboard:**

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email: `admin@test.com`
4. Enter password: `Test123456!`
5. Click **Create User**

**Or via SQL:**

```sql
-- This will trigger the auto-role assignment
-- (admin@test.com will get 'admin' role automatically)
```

### 2. Verify Auto-Role Assignment

```sql
SELECT id, full_name, email, role, created_at
FROM profiles
WHERE email = 'admin@test.com';
```

Expected result: `role` should be `'admin'`

### 3. Test Row Level Security

**As an entrepreneur:**

```sql
-- Create test venture (simulate entrepreneur creating their venture)
-- Note: You need to be authenticated as the entrepreneur user for this to work
INSERT INTO ventures (user_id, name, founder_name, status)
VALUES (
  '<entrepreneur_user_id>',
  'Test Rural Bakery',
  'Raj Kumar',
  'Draft'
);

-- Entrepreneur should only see their own venture
SELECT * FROM ventures; -- Should return only ventures where user_id matches
```

**As staff:**

```sql
-- Staff should see ALL ventures
SELECT id, name, status, user_id
FROM ventures;
```

### 4. Test AI Integration Structure

```sql
-- Insert a sample assessment with AI analysis
INSERT INTO venture_assessments (
  venture_id,
  assessed_by,
  assessor_role,
  assessment_type,
  ai_analysis
) VALUES (
  '<venture_id>',
  '<vsm_user_id>',
  'success_mgr',
  'screening',
  '{
    "strengths": ["Strong market fit", "Experienced team"],
    "risks": ["Limited funding", "Market competition"],
    "questions": ["What is your customer acquisition cost?"],
    "overall_score": 7.5,
    "generated_at": "2026-02-25T10:00:00Z",
    "model_used": "claude-3-5-sonnet"
  }'::jsonb
);

-- Query AI analysis
SELECT
  v.name,
  va.ai_analysis->'strengths' as strengths,
  va.ai_analysis->'risks' as risks,
  va.ai_analysis->>'overall_score' as score
FROM ventures v
JOIN venture_assessments va ON va.venture_id = v.id
WHERE va.is_current = true;
```

### 5. Test Views

```sql
-- Test ventures_complete view
SELECT
  name,
  status,
  program_display_name,
  revenue_12m,
  support_hours_balance,
  entrepreneur_name
FROM ventures_complete
LIMIT 5;

-- Test venture_analytics view
SELECT
  name,
  status,
  days_in_status,
  days_since_submission,
  has_assessment,
  stream_completion_rate
FROM venture_analytics
LIMIT 5;
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "extension 'uuid-ossp' does not exist"

**Solution:** Enable the extension in Supabase:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue 2: "relation 'auth.users' does not exist"

**Solution:** This means Supabase auth schema isn't set up. This shouldn't happen in Supabase projects, but if it does:

1. Check that you're running this in a Supabase project, not a regular PostgreSQL database
2. Ensure the `auth` schema exists: `SELECT schema_name FROM information_schema.schemata;`

### Issue 3: RLS Policies Failing

**Solution:** Ensure you're testing with actual authenticated users:

```sql
-- Check current auth context
SELECT auth.uid();  -- Should return a UUID

-- If it returns NULL, you're not authenticated
-- You need to test via the API or use Supabase dashboard
```

### Issue 4: Trigger Functions Not Working

**Solution:** Check trigger exists:

```sql
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

If missing, re-run the trigger creation statements from the schema file.

### Issue 5: Foreign Key Violations

**Solution:** Ensure you create records in the correct order:

1. `profiles` (users must exist first)
2. `programs` (programs must exist before ventures reference them)
3. `ventures`
4. `venture_applications`, `venture_streams`, etc.

---

## 📊 Post-Setup Checklist

- [ ] All 13+ tables created
- [ ] All tables have RLS enabled
- [ ] All indexes created successfully
- [ ] All triggers are active
- [ ] Auto-role assignment working (test with signup)
- [ ] Programs table has 5 rows (Accelerate Prime, Core, Select, Ignite, Liftoff)
- [ ] Views `ventures_complete` and `venture_analytics` working
- [ ] Sample test data inserted successfully
- [ ] RLS policies tested (entrepreneur can only see their data, staff can see all)
- [ ] Backend `.env` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Frontend `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

## 🎓 Next Steps

After successful setup:

1. **Configure Backend API**
   - Update `backend/.env` with Supabase credentials
   - Test API endpoints with Postman/Insomnia

2. **Configure Frontend**
   - Update `.env` with Supabase credentials
   - Test signup/login flows

3. **Set Up AI Integration**
   - Add `ANTHROPIC_API_KEY` to `backend/.env`
   - Test AI insights generation endpoint

4. **Deploy**
   - Backend: Deploy to Railway/Render
   - Frontend: Deploy to Netlify
   - Database: Already on Supabase Cloud ✓

5. **Monitor**
   - Set up Supabase monitoring
   - Configure error tracking (Sentry)
   - Set up analytics

---

## 📖 Additional Resources

- **Full Documentation:** [PRODUCTION_SCHEMA_DOCUMENTATION.md](PRODUCTION_SCHEMA_DOCUMENTATION.md)
- **Schema File:** [production_schema_v2.sql](production_schema_v2.sql)
- **API Docs:** [docs/API.md](docs/API.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## ❓ Need Help?

- Check the **Troubleshooting** section in README.md
- Review the comprehensive docs in PRODUCTION_SCHEMA_DOCUMENTATION.md
- Open an issue on GitHub
- Check Supabase documentation: https://supabase.com/docs

---

**Last Updated:** 2026-02-25
**Schema Version:** 2.0
