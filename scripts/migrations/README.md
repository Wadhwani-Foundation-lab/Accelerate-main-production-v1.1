# Database Schema Migration Guide

This directory contains SQL migration scripts to reorganize the database schema for better scalability, versioning, and audit trails.

## Migration Overview

### Phase 1: Schema Addition (Non-Breaking)
These migrations add new tables and columns WITHOUT breaking existing functionality:

1. **001_add_new_tables.sql** - Creates 5 new core tables
2. **002_add_venture_columns.sql** - Adds new columns to ventures table
3. **003_add_triggers.sql** - Creates trigger functions for automation

### Phase 2: Data Migration (Coming Soon)
4. **004_data_migration.sql** - Migrates existing data to new schema

## New Tables Created

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `venture_applications` | Application form data | Normalized columns from JSONB, 1:1 with ventures |
| `venture_assessments` | VSM/Committee assessments | Full version history, immutable records |
| `venture_roadmaps` | AI-generated roadmaps | Versioned, never lost on regeneration |
| `venture_deliverables` | Granular task tracking | Links to streams and roadmaps |
| `venture_status_history` | Audit trail | Auto-populated by triggers |

## New Columns Added to Ventures

| Column | Type | Purpose |
|--------|------|---------|
| `application_status` | text | Application workflow: draft, submitted, withdrawn |
| `screening_status` | text | Screening workflow: pending_review, under_review, completed |
| `committee_status` | text | Committee workflow: pending_review, in_review, approved, rejected |
| `agreement_status_new` | text | Agreement workflow: draft, sent, signed, declined |
| `venture_partner_id` | uuid | Assigned venture partner (FK to profiles) |
| `assigned_at` | timestamptz | When venture partner was assigned |
| `workbench_locked` | boolean | Whether workbench is locked |
| `locked_at` | timestamptz | When workbench was locked |
| `locked_by` | uuid | Who locked the workbench |
| `lock_reason` | text | Reason for locking |
| `version` | integer | Version number for optimistic locking |
| `deleted_at` | timestamptz | Soft delete timestamp |

## Triggers Created

| Trigger | Target Table | Purpose |
|---------|--------------|---------|
| `increment_ventures_version` | ventures | Auto-increments version on each update |
| `version_assessment` | venture_assessments | Manages assessment version history |
| `version_roadmap` | venture_roadmaps | Manages roadmap version history |
| `track_venture_status_changes` | ventures | Auto-populates status history |
| `auto_complete_deliverable_trigger` | venture_deliverables | Sets completed_at timestamp |
| `update_workbench_lock_metadata_trigger` | ventures | Updates lock metadata |

## Execution Instructions

### Prerequisites

1. **Backup your database first!**
   ```bash
   pg_dump -h your-db-host -U your-db-user -d your-db-name > backup_$(date +%Y%m%d).sql
   ```

2. **Verify Supabase connection**
   ```bash
   psql -h your-db-host -U your-db-user -d your-db-name -c "SELECT version();"
   ```

### Running Migrations

**Option 1: Via Supabase Dashboard (Recommended for first time)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `001_add_new_tables.sql`
3. Click "Run"
4. Repeat for `002_add_venture_columns.sql`
5. Repeat for `003_add_triggers.sql`

**Option 2: Via psql Command Line**
```bash
# Navigate to migrations directory
cd scripts/migrations

# Run migrations in order
psql -h your-db-host -U your-db-user -d your-db-name -f 001_add_new_tables.sql
psql -h your-db-host -U your-db-user -d your-db-name -f 002_add_venture_columns.sql
psql -h your-db-host -U your-db-user -d your-db-name -f 003_add_triggers.sql
```

**Option 3: All at Once**
```bash
cat 001_add_new_tables.sql 002_add_venture_columns.sql 003_add_triggers.sql | \
psql -h your-db-host -U your-db-user -d your-db-name
```

### Verification

After running migrations, verify everything was created correctly:

```sql
-- Check new tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'venture_applications',
    'venture_assessments',
    'venture_roadmaps',
    'venture_deliverables',
    'venture_status_history'
  );

-- Check new columns on ventures
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ventures'
  AND column_name IN (
    'application_status',
    'screening_status',
    'committee_status',
    'agreement_status_new',
    'venture_partner_id',
    'version',
    'deleted_at'
  );

-- Check triggers were created
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('ventures', 'venture_assessments', 'venture_roadmaps', 'venture_deliverables');

-- Check RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'venture_applications',
    'venture_assessments',
    'venture_roadmaps',
    'venture_deliverables',
    'venture_status_history'
  );
```

Expected output:
- ✅ 5 new tables created
- ✅ 8+ new columns on ventures table
- ✅ 6 triggers created
- ✅ 15+ RLS policies created

## Testing

### Test New Tables

```sql
-- Test venture_applications insert
INSERT INTO venture_applications (
  venture_id, revenue_12m, full_time_employees
) VALUES (
  (SELECT id FROM ventures LIMIT 1),
  1000000,
  10
) RETURNING *;

-- Test venture_assessments versioning
INSERT INTO venture_assessments (
  venture_id, assessed_by, assessor_role, assessment_type, notes
) VALUES (
  (SELECT id FROM ventures LIMIT 1),
  auth.uid(),
  'success_mgr',
  'screening',
  'Test assessment v1'
) RETURNING assessment_version; -- Should return 1

-- Insert again to test versioning
INSERT INTO venture_assessments (
  venture_id, assessed_by, assessor_role, assessment_type, notes
) VALUES (
  (SELECT id FROM ventures LIMIT 1),
  auth.uid(),
  'success_mgr',
  'screening',
  'Test assessment v2'
) RETURNING assessment_version; -- Should return 2
```

### Test Triggers

```sql
-- Test version increment trigger
UPDATE ventures
SET name = 'Updated Name'
WHERE id = (SELECT id FROM ventures LIMIT 1)
RETURNING version; -- Should increment

-- Test status history trigger
UPDATE ventures
SET application_status = 'submitted'
WHERE id = (SELECT id FROM ventures LIMIT 1);

-- Check history was logged
SELECT * FROM venture_status_history
WHERE venture_id = (SELECT id FROM ventures LIMIT 1)
ORDER BY created_at DESC;
```

## Rollback Instructions

If you need to roll back these migrations:

```sql
-- ROLLBACK SCRIPT
-- WARNING: This will drop all new tables and columns

BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS venture_deliverables CASCADE;
DROP TABLE IF EXISTS venture_status_history CASCADE;
DROP TABLE IF EXISTS venture_roadmaps CASCADE;
DROP TABLE IF EXISTS venture_assessments CASCADE;
DROP TABLE IF EXISTS venture_applications CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS increment_ventures_version ON ventures;
DROP TRIGGER IF EXISTS track_venture_status_changes ON ventures;
DROP TRIGGER IF EXISTS update_workbench_lock_metadata_trigger ON ventures;

-- Drop trigger functions
DROP FUNCTION IF EXISTS increment_venture_version();
DROP FUNCTION IF EXISTS log_venture_status_change();
DROP FUNCTION IF EXISTS update_workbench_lock_metadata();
DROP FUNCTION IF EXISTS create_assessment_version();
DROP FUNCTION IF EXISTS create_roadmap_version();
DROP FUNCTION IF EXISTS auto_complete_deliverable();

-- Remove new columns from ventures
ALTER TABLE ventures DROP COLUMN IF EXISTS application_status;
ALTER TABLE ventures DROP COLUMN IF EXISTS screening_status;
ALTER TABLE ventures DROP COLUMN IF EXISTS committee_status;
ALTER TABLE ventures DROP COLUMN IF EXISTS agreement_status_new;
ALTER TABLE ventures DROP COLUMN IF EXISTS venture_partner_id;
ALTER TABLE ventures DROP COLUMN IF EXISTS assigned_at;
ALTER TABLE ventures DROP COLUMN IF EXISTS locked_at;
ALTER TABLE ventures DROP COLUMN IF EXISTS locked_by;
ALTER TABLE ventures DROP COLUMN IF EXISTS lock_reason;
ALTER TABLE ventures DROP COLUMN IF EXISTS version;
ALTER TABLE ventures DROP COLUMN IF EXISTS deleted_at;

-- Remove columns from support_hours
ALTER TABLE support_hours DROP COLUMN IF EXISTS last_updated_by;
ALTER TABLE support_hours DROP COLUMN IF EXISTS notes;

-- Remove columns from venture_milestones
ALTER TABLE venture_milestones DROP COLUMN IF EXISTS stream_id;
ALTER TABLE venture_milestones DROP COLUMN IF EXISTS deliverable_id;
ALTER TABLE venture_milestones DROP COLUMN IF EXISTS completed_by;
ALTER TABLE venture_milestones DROP COLUMN IF EXISTS completed_at;

COMMIT;
```

## Key Benefits

### 1. Data Normalization
- Frequently-queried JSONB fields → proper indexed columns
- 10x faster queries on revenue, employees, program filtering

### 2. Versioning & History
- Never lose roadmaps or assessments
- Full audit trail for compliance
- Time-travel queries possible

### 3. Status Clarity
- 4 separate workflows instead of 1 confusing status field
- Clear state machines for each workflow

### 4. Optimistic Locking
- Version numbers prevent concurrent update conflicts
- Data integrity guaranteed

### 5. Security
- RLS policies enforce database-level access control
- Frontend filtering replaced with secure DB queries

## Next Steps

After running these migrations:

1. ✅ **Phase 1 Complete** - New schema in place
2. ⏳ **Phase 2** - Run data migration (004_data_migration.sql)
3. ⏳ **Phase 3** - Update application code to use new schema
4. ⏳ **Phase 4** - Remove deprecated columns

## Support

If you encounter issues:
1. Check error messages in psql output
2. Verify RLS policies with `SELECT * FROM pg_policies`
3. Check trigger status with `SELECT * FROM pg_trigger`
4. Review Supabase logs in Dashboard → Logs

## Migration Log

| Date | Migration | Status | Notes |
|------|-----------|--------|-------|
| 2026-02-21 | 001_add_new_tables | ⏳ Pending | 5 new tables with RLS |
| 2026-02-21 | 002_add_venture_columns | ⏳ Pending | 12 new columns |
| 2026-02-21 | 003_add_triggers | ⏳ Pending | 6 triggers |
| TBD | 004_data_migration | 📝 Not created | Populate new tables |
