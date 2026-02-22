# Database Schema Redesign - Implementation Plan

## Context

The current database schema has evolved organically, resulting in a monolithic `ventures` table with 33+ columns mixing application data, assessments, workflow states, and agreements. Data is scattered across 4 JSONB fields with inconsistent schemas, roadmaps aren't persisted, assessments lack versioning, and security filtering happens at the frontend instead of the database level.

This redesign reorganizes the schema into logical domain tables, adds proper versioning for critical data, normalizes frequently-queried fields, and implements robust audit trails to support current personas (Entrepreneur, Screening Manager, Venture Manager, Selection Committee) and future scalability.

## Proposed Schema Architecture

### Core Principles
1. **Separation of Concerns** - Split ventures table into: core identity, applications, assessments, roadmaps, deliverables
2. **Version Critical Data** - Full history for assessments and AI-generated roadmaps
3. **Normalize Hot Paths** - Move frequently-queried JSONB fields to proper indexed columns
4. **Audit Everything** - Automatic tracking of all status changes
5. **Database-Level Security** - RLS policies replace frontend filtering
6. **Optimistic Locking** - Version numbers prevent concurrent update conflicts

### New Table Structure

```
ventures (Core Identity)
├── Basic info: id, user_id, name, founder_name, city, state
├── Workflow states: application_status, screening_status, committee_status, agreement_status
├── Assignment: venture_partner_id, current_program, program_recommendation
├── Workbench: workbench_locked, locked_at, locked_by, lock_reason
└── Concurrency: version (auto-increment on update)

venture_applications (Form Data - 1:1 with ventures)
├── Financial: revenue_12m, revenue_potential_3y, min_investment
├── Team: full_time_employees, incremental_hiring
├── Business: current_product/segment/geography, target_product/segment/geography
└── Growth: growth_focus (array), blockers, support_request

venture_assessments (Versioned Assessments)
├── Version tracking: assessment_version, supersedes_id, is_current
├── Assessor: assessed_by, assessor_role, assessment_type
├── Content: notes, internal_comments, ai_analysis (JSONB), program_recommendation
└── Decision: decision, decision_rationale

venture_roadmaps (Versioned Roadmaps)
├── Version tracking: roadmap_version, supersedes_id, is_current
├── Generator: generated_by, generation_source, based_on_assessment_id
└── Data: roadmap_data (JSONB) - all 6 streams with deliverables

venture_deliverables (Granular Task Tracking)
├── Identity: venture_id, stream_id, title, description
├── Status: status, priority, assigned_to_id
├── Timeline: due_date, completed_at
└── Ordering: display_order, roadmap_key

venture_streams (Enhanced Stream Tracking)
├── Identity: venture_id, stream_name (product/gtm/funding/supply_chain/operations/team)
├── Ownership: owner_id, owner_name
├── Status: status (not_started/on_track/need_advice/need_support/at_risk/completed)
└── Roadmap link: roadmap_deliverable_ids (array)

venture_status_history (Audit Trail - auto-populated)
├── What: status_type, previous_value, new_value
├── Who: changed_by, changed_by_role
├── Why: change_reason, notes
└── When: created_at, venture_version

venture_interactions (Enhanced - already exists)
└── Add indexes: venture_created, type_date

support_hours (Enhanced - already exists)
└── Add: last_updated_by, notes

venture_milestones (Enhanced - already exists)
└── Add: stream_id, deliverable_id, completed_by, completed_at
```

## Migration Strategy (Phased, Non-Breaking)

### Phase 1: Schema Addition (Week 1)
**Goal:** Add new tables without breaking existing functionality

**Actions:**
1. Create new tables with RLS policies:
   - `venture_applications`
   - `venture_assessments`
   - `venture_roadmaps`
   - `venture_deliverables`
   - `venture_status_history`

2. Add new columns to `ventures`:
   - `application_status`, `screening_status`, `committee_status`, `agreement_status`
   - `venture_partner_id`, `assigned_at`
   - `workbench_locked`, `locked_at`, `locked_by`, `lock_reason`
   - `version` (for optimistic locking)
   - `deleted_at` (soft delete)

3. Enhance existing tables:
   - Add indexes to `venture_interactions`
   - Add columns to `support_hours` and `venture_milestones`

4. Create triggers:
   - Auto-increment `version` on ventures update
   - Auto-populate `venture_status_history` on status changes
   - Version control for assessments and roadmaps

**SQL Files to Create:**
- `scripts/migrations/001_add_new_tables.sql`
- `scripts/migrations/002_add_venture_columns.sql`
- `scripts/migrations/003_add_triggers.sql`

### Phase 2: Data Migration (Week 2)
**Goal:** Populate new tables from existing data

**Actions:**
1. Create migration script `scripts/migrations/004_data_migration.sql`:
   - Extract JSONB fields → `venture_applications` columns
   - Create initial `venture_assessments` from `vsm_notes` + `ai_analysis`
   - Map old `status` → new status columns (application/screening/committee/agreement)
   - Preserve all existing data in original columns (dual schema)

2. Verify data integrity:
   - Count checks: ensure no records lost
   - Relationship checks: verify foreign keys
   - JSONB extraction: validate numeric conversions

3. Enable dual-write in application code:
   - Write to both old and new schema
   - Read from new schema, fallback to old if null

**Testing:**
- Run migration on staging database
- Verify all dashboards still function
- Check performance of new indexed queries

### Phase 3: Application Updates (Week 3-4)
**Goal:** Update application code to use new schema

**Files to Update:**

**Backend:**
- `/backend/src/types/index.ts` - Add new interfaces for applications, assessments, roadmaps, deliverables
- `/backend/src/types/schemas.ts` - Update Zod schemas for new structure
- `/backend/src/routes/*` - Update API endpoints to read/write new tables

**Frontend:**
- `/src/lib/api.ts` - Update API client methods
- `/src/pages/NewApplication.tsx` - Write to `venture_applications` table
- `/src/pages/VSMDashboard.tsx` - Create `venture_assessments` with versioning
- `/src/pages/VentureManagerDashboard.tsx` - Persist roadmaps to `venture_roadmaps`
- `/src/pages/SelectionCommitteeDashboard.tsx` - Same roadmap persistence
- `/src/components/StatusSelect.tsx` - Use new status columns
- `/src/pages/VentureWorkbench.tsx` - Check new agreement_status column

**New Features to Add:**
1. **Assessment History Viewer** - Show all versions of VSM assessments
2. **Roadmap Versioning UI** - Display roadmap version history
3. **Status Timeline** - Visual timeline from `venture_status_history`
4. **Deliverable Tracker** - Granular task management within streams

**Performance Optimizations:**
- Use indexes on new columns (program_recommendation, venture_partner_id, status columns)
- Create materialized view for dashboard queries if needed
- Add caching layer for frequently-accessed venture data

### Phase 4: Cleanup (Week 5)
**Goal:** Remove deprecated columns and dual-write logic

**Actions:**
1. Drop deprecated columns from `ventures`:
   - `status` (replaced by 4 status columns)
   - `description` (moved to applications)
   - `growth_current`, `growth_target`, `commitment` (normalized)
   - `vsm_notes`, `ai_analysis` (moved to assessments)

2. Remove dual-write code from application

3. Archive old migration scripts

**Rollback Safety:**
- Keep backup of old schema for 30 days
- Document rollback procedure
- Keep dual-read capability until Phase 4 complete

## Key Improvements

### 1. Data Normalization
- **Before:** `growth_current.city` → Extract from JSONB every query
- **After:** `venture_applications.city` → Indexed column, type-safe

### 2. Versioning & History
- **Before:** Roadmap regenerated = lost forever, assessment overwritten
- **After:** Full version history with `supersedes_id` chain

### 3. Status Clarity
- **Before:** `status = 'Under Review'` (ambiguous - screening or committee?)
- **After:** Separate columns: `screening_status`, `committee_status`, `agreement_status`

### 4. Query Performance
- **Before:** `WHERE program_recommendation::text LIKE '%Prime%'` (slow JSONB scan)
- **After:** `WHERE program_recommendation = 'Accelerate Prime'` (indexed lookup)

### 5. Audit Trail
- **Before:** Manual inserts to venture_history
- **After:** Automatic trigger on any status change

### 6. Security
- **Before:** `if (userRole === 'venture_mgr') filter(...)` in frontend
- **After:** RLS policy at database level

### 7. Concurrent Updates
- **Before:** Last-write-wins (risk of data loss)
- **After:** Optimistic locking with version check

## Critical Files

**Database:**
- `/scripts/supabase_schema.sql` - Current baseline
- `/scripts/migrations/00*_*.sql` - New migration files (to create)

**Backend Types:**
- `/backend/src/types/index.ts` - Core interfaces
- `/backend/src/types/schemas.ts` - Zod validation

**Frontend Pages:**
- `/src/pages/NewApplication.tsx` - Application submission
- `/src/pages/VSMDashboard.tsx` - Assessment creation
- `/src/pages/VentureManagerDashboard.tsx` - Roadmap generation
- `/src/pages/SelectionCommitteeDashboard.tsx` - Committee review
- `/src/pages/VentureWorkbench.tsx` - Agreement signing

**API Layer:**
- `/src/lib/api.ts` - HTTP client methods

## Validation & Testing

### Database Level
1. Run all migrations on fresh database
2. Verify all foreign keys and constraints
3. Test RLS policies for each persona
4. Check index usage with EXPLAIN ANALYZE
5. Validate trigger functions fire correctly

### Application Level
1. Test application submission flow (Entrepreneur)
2. Test assessment creation with versioning (VSM)
3. Test roadmap generation and persistence (Venture Manager)
4. Test committee review and assignment (Committee)
5. Test agreement signing and workbench unlock
6. Verify no data loss during migration

### Performance Testing
1. Dashboard load times with 1000+ ventures
2. Query performance on filtered lists
3. Concurrent update handling (version conflicts)
4. Full-text search on venture names/descriptions

## Trade-offs & Risks

### Pros
✅ Better type safety and query performance
✅ Full audit trail for compliance
✅ Scalable for future features
✅ Developer-friendly schema
✅ Database-level security

### Cons
❌ More complex joins (mitigated with views)
❌ Migration effort required (phased approach)
❌ Storage overhead for versioning (retention policy needed)

### Risks & Mitigations
- **Risk:** Data loss during migration
  **Mitigation:** Dual-write period, extensive validation, rollback plan

- **Risk:** Performance degradation from joins
  **Mitigation:** Indexes, materialized views, caching layer

- **Risk:** Breaking changes to API
  **Mitigation:** Versioned API endpoints, backward compatibility

## Next Steps After Approval

1. **Week 1:** Create migration SQL files, test on local database
2. **Week 2:** Run migration on staging, validate data
3. **Week 3:** Update backend types and API layer
4. **Week 4:** Update frontend components, add new features
5. **Week 5:** Deploy to production with rollback plan ready

## Estimated Effort

- **Database Migration:** 2-3 days
- **Backend Updates:** 3-5 days
- **Frontend Updates:** 5-7 days
- **Testing & QA:** 3-4 days
- **Total:** ~3 weeks (with buffer)

## Success Metrics

1. All dashboards load in < 500ms with 1000+ ventures
2. Zero data loss during migration
3. Assessment/roadmap versioning working
4. Status history audit trail complete
5. No frontend role-based filtering (all in RLS)
6. Successful rollback test completed
