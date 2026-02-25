# Wadhwani Accelerate - Production Database Schema V2.0

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Table Details](#table-details)
4. [AI Integration](#ai-integration)
5. [Data Flow](#data-flow)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

This production-ready schema is designed for the Wadhwani Accelerate platform - a comprehensive system for managing rural venture growth programs. The schema supports:

- **Multi-role user management** (Entrepreneurs, Success Managers, Venture Managers, Committee Members, Admins)
- **Complete application lifecycle** from submission to program completion
- **AI-powered insights** using Claude API for venture assessment and roadmap generation
- **Comprehensive audit trails** for all critical operations
- **Version tracking** for assessments and roadmaps
- **Flexible workstream management** across 6 functional areas

### Key Features

✅ **Production-Ready**
- Row Level Security (RLS) on all tables
- Proper indexes for performance
- JSONB fields for flexibility
- Full-text search capabilities
- Soft deletes for data preservation

✅ **AI Integration Ready**
- Structured JSONB fields for AI outputs
- Version tracking for AI-generated content
- Metadata storage for model tracking
- Extensible schema for future AI features

✅ **Scalable & Maintainable**
- Normalized data structure
- Clear separation of concerns
- Comprehensive audit logging
- Easy to extend and modify

---

## 🏗️ Architecture

### Database Structure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WADHWANI ACCELERATE                       │
│                  Production Schema V2.0                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   USER MANAGEMENT    │
├──────────────────────┤
│ • profiles           │
│ • programs           │
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│   VENTURE CORE       │
├──────────────────────┤
│ • ventures           │──────┐
│ • venture_           │      │
│   applications       │      │
└──────────────────────┘      │
          │                   │
          ▼                   ▼
┌──────────────────────┐  ┌──────────────────────┐
│  AI INTEGRATION      │  │ WORKBENCH TRACKING   │
├──────────────────────┤  ├──────────────────────┤
│ • venture_           │  │ • venture_streams    │
│   assessments        │  │ • venture_           │
│ • venture_roadmaps   │  │   milestones         │
│                      │  │ • venture_           │
│                      │  │   deliverables       │
│                      │  │ • support_hours      │
└──────────────────────┘  └──────────────────────┘
          │                   │
          └───────┬───────────┘
                  ▼
┌──────────────────────────────────────────┐
│        INTERACTIONS & AGREEMENTS         │
├──────────────────────────────────────────┤
│ • venture_interactions                   │
│ • venture_agreements                     │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│          AUDIT & HISTORY                 │
├──────────────────────────────────────────┤
│ • venture_status_history                 │
└──────────────────────────────────────────┘
```

---

## 📊 Table Details

### 1. User Management

#### **profiles**
Stores user information with role-based access control.

**Key Fields:**
- `id` (PK): References auth.users
- `full_name`: User's full name
- `role`: One of: entrepreneur, success_mgr, venture_mgr, committee_member, admin
- `is_active`: Account status flag
- `preferences`: JSONB for user preferences

**Auto-Role Assignment Logic:**
- Email contains "admin" or "@wadhwani" → `admin`
- Email contains "committee" → `committee_member`
- Email contains "venture" and "manager" → `venture_mgr`
- Email contains "success" or "vsm" → `success_mgr`
- Default → `entrepreneur`

#### **programs**
Lookup table for accelerator programs.

**Key Fields:**
- `name`: Program name (Accelerate Prime, Core, Select, Ignite, Liftoff)
- `tier`: Priority level (1-5, lower is higher priority)
- `support_hours_allocated`: Default hours for the program
- `duration_months`: Program duration

---

### 2. Venture Core

#### **ventures**
Main table storing core venture information.

**Key Fields:**
- `id` (PK): Unique venture identifier
- `user_id` (FK): Entrepreneur who owns this venture
- `name`: Venture/business name
- `founder_name`: Managing director/founder
- `status`: Current application status (11 possible states)
- `program_id` (FK): Assigned program
- `assigned_vsm_id`, `assigned_vm_id`: Staff assignments
- `venture_partner`: Committee-assigned partner
- `workbench_locked`: Controls if entrepreneur can edit

**Status Lifecycle:**
```
Draft → Submitted → Under Review → Committee Review → Approved →
Agreement Sent → Agreement Signed → Active → Completed

Alternative paths:
→ Rejected (from any review stage)
→ Withdrawn (entrepreneur cancels)
```

#### **venture_applications**
Stores all application form data in normalized format (1:1 with ventures).

**Key Sections:**
1. **Business Information**
   - `what_do_you_sell`, `who_do_you_sell_to`, `which_regions`
   - `company_type`, `referred_by`

2. **Financial Metrics**
   - `revenue_12m`: Last 12 months revenue
   - `revenue_potential_3y`: 3-year projection
   - `min_investment`: Investment needed

3. **Team Metrics**
   - `full_time_employees`: Current team size
   - `incremental_hiring`: Additional hiring needed

4. **Growth Strategy**
   - `growth_focus`: Array ['product', 'segment', 'geography']
   - `focus_product`, `focus_segment`, `focus_geography`: Target areas

5. **Support Needs**
   - `support_request`: Entrepreneur's description of needs
   - `blockers`: Current challenges

---

### 3. AI Integration

#### **venture_assessments**
Stores VSM/Committee assessments with full version history.

**Version Control:**
- Each assessment creates a new row
- `is_current` flag marks latest version
- `supersedes_id` links to previous version
- Only ONE current assessment per venture per type

**AI Analysis Structure (JSONB):**
```json
{
  "strengths": [
    "Strong product-market fit in rural areas",
    "Experienced founding team"
  ],
  "risks": [
    "Limited capital for scaling",
    "Supply chain dependencies"
  ],
  "questions": [
    "How will you handle seasonal demand fluctuations?",
    "What's your customer acquisition strategy?"
  ],
  "overall_score": 7.5,
  "generated_at": "2026-02-25T10:30:00Z",
  "model_used": "claude-3-5-sonnet-20250929"
}
```

**Assessment Types:**
- `screening`: VSM initial review
- `committee`: Committee review

#### **venture_roadmaps**
AI-generated roadmaps for all 6 workstreams.

**Roadmap Data Structure (JSONB):**
```json
{
  "product": [
    {
      "id": "p1",
      "title": "Define Core API Specifications",
      "description": "Document all API endpoints...",
      "status": "pending",
      "priority": "high",
      "timeline": "Q1 2026"
    }
  ],
  "gtm": [...],
  "funding": [...],
  "supply_chain": [...],
  "operations": [...],
  "team": [...]
}
```

**Generation Sources:**
- `ai_generated`: Created by Claude API
- `manual`: Created by staff
- `imported`: Imported from external source

---

### 4. Workbench & Progress Tracking

#### **venture_streams**
Tracks 6 functional workstreams for each venture.

**Standard Streams:**
1. Product
2. Go-To-Market (GTM)
3. Capital Planning
4. Team
5. Supply Chain
6. Operations

**Status Values:**
- Not started
- On track
- Need some advice
- Need deep support
- Completed

#### **venture_milestones**
Major milestones within each stream.

**Key Features:**
- Linked to specific stream (optional)
- Due dates and completion tracking
- Progress percentage (0-100)
- Assignment to specific staff

#### **venture_deliverables**
Granular tasks within milestones/streams.

**Features:**
- Linked to stream and/or milestone
- Priority levels: low, medium, high, critical
- `roadmap_key`: Links to AI-generated roadmap items
- `attachments`: JSONB array of file URLs
- `display_order`: Custom ordering

#### **support_hours**
Tracks allocated vs used support hours.

**Auto-calculated Fields:**
- `balance`: GENERATED column (allocated - used)
- Auto-created when venture is approved
- Hours pulled from assigned program

---

### 5. Interactions & Agreements

#### **venture_interactions**
Logs all interactions with ventures.

**Interaction Types:**
- `call`: Phone calls with transcripts
- `meeting`: In-person or video meetings
- `email`: Email correspondence
- `note`: General notes

**Features:**
- Soft delete (deleted_at timestamp)
- Participants array for multi-party interactions
- Duration tracking in minutes
- Only staff can create interactions

#### **venture_agreements**
Manages agreement lifecycle.

**Agreement Types:**
- `partnership`: Main partnership agreement
- `nda`: Non-disclosure agreement
- `milestone`: Milestone-specific agreements

**Lifecycle:**
```
Draft → Sent → Viewed → Signed
           ↓
        Rejected / Expired
```

**E-signature Support:**
- `signature_data`: JSONB for signature metadata
- `viewed_at`, `signed_at`: Timestamp tracking
- `expires_at`: Optional expiration

---

### 6. Audit & History

#### **venture_status_history**
Comprehensive audit trail for ALL status changes.

**Tracked Changes:**
- `application`: Venture status changes
- `screening`: VSM decisions
- `committee`: Committee decisions
- `agreement`: Agreement status changes
- `workbench_lock`: Lock/unlock events
- `program_assignment`: Program changes
- `venture_partner`: Partner assignments
- `assignment`: VSM/VM assignments

**Auto-populated by Triggers:**
- Venture status changes automatically logged
- Includes who, what, when, why
- Metadata JSONB for additional context

---

## 🤖 AI Integration

### AI-Powered Features

#### 1. **Venture Assessment (Claude API)**

**Endpoint:** `POST /api/ventures/:id/generate-insights`

**Input:** Venture application data + VSM notes

**Output Stored in:** `venture_assessments.ai_analysis`

**Process:**
1. Fetch complete venture application data
2. Combine with VSM notes (if any)
3. Call Claude API with structured prompt
4. Parse response into standardized JSON
5. Store with version tracking
6. Link to current assessment

**Sample Prompt Structure:**
```
Analyze this rural venture application:

Business: {name}
Product: {what_do_you_sell}
Segment: {who_do_you_sell_to}
Revenue (12m): {revenue_12m}
Growth Focus: {growth_focus}
...

Provide:
1. Top 3-5 strengths
2. Top 3-5 risks/concerns
3. 5-7 probing questions for interview
4. Overall score (1-10)
```

#### 2. **Roadmap Generation (Future)**

**Planned Feature:** Auto-generate 90-day roadmaps based on:
- Venture goals
- Growth focus areas
- VSM assessment
- Similar venture patterns

**Storage:** `venture_roadmaps.roadmap_data`

#### 3. **Smart Matching (Future)**

**Planned Feature:** Match ventures with:
- Suitable programs (based on metrics)
- Right mentors/experts
- Similar successful ventures

---

## 🔄 Data Flow

### Entrepreneur Journey

```
1. SIGNUP
   └─> profiles created (auto-role: entrepreneur)

2. CREATE APPLICATION
   ├─> ventures (status: Draft)
   └─> venture_applications (form data)

3. SUBMIT APPLICATION
   ├─> Update ventures.status = 'Submitted'
   ├─> Create venture_streams (6 streams)
   └─> Log in venture_status_history

4. WAIT FOR REVIEW
   └─> ventures.status = 'Under Review' (VSM assigned)

5. VSM SCREENING
   ├─> venture_interactions (call notes)
   ├─> venture_assessments (AI analysis + recommendation)
   └─> ventures.status = 'Committee Review'

6. COMMITTEE REVIEW
   ├─> venture_assessments (committee decision)
   ├─> ventures.venture_partner assigned
   └─> ventures.status = 'Approved' OR 'Rejected'

7. AGREEMENT PHASE
   ├─> venture_agreements created
   ├─> ventures.status = 'Agreement Sent'
   ├─> Entrepreneur signs
   └─> ventures.status = 'Agreement Signed'

8. PROGRAM ACTIVATION
   ├─> ventures.status = 'Active'
   ├─> ventures.workbench_locked = false
   ├─> support_hours auto-created
   ├─> venture_roadmaps generated (AI)
   └─> venture_milestones & deliverables created

9. ONGOING TRACKING
   ├─> Update venture_streams status
   ├─> Complete venture_deliverables
   ├─> Log venture_interactions
   └─> Track support_hours usage

10. COMPLETION
    └─> ventures.status = 'Completed'
```

### Staff Workflow

#### VSM Dashboard Flow
```
1. View all 'Submitted' ventures
2. Select venture → View details
3. Add VSM notes (calls, research)
4. Generate AI insights
5. Review AI analysis
6. Make program recommendation
7. Add internal comments
8. Submit decision → Status: 'Committee Review'
```

#### Committee Dashboard Flow
```
1. View all 'Committee Review' ventures
2. Review VSM assessment & recommendation
3. Review AI analysis
4. Make final decision (Approve/Reject)
5. Assign venture partner
6. If approved → Generate agreement
```

#### Venture Manager Dashboard Flow
```
1. View all 'Active' ventures
2. Track milestone/deliverable progress
3. Log interactions (calls, meetings)
4. Monitor support hours
5. Update roadmap as needed
```

---

## 📦 Migration Guide

### Option 1: Fresh Installation

**For NEW Supabase projects:**

```sql
-- 1. Run the complete schema
-- Execute: production_schema_v2.sql

-- 2. Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 4. Test with sample data
INSERT INTO profiles (id, full_name, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Admin',
  'admin@wadhwani.org',
  'admin'
);
```

### Option 2: Migration from Existing Schema

**For EXISTING projects:**

```sql
-- Step 1: Backup current data
-- Use Supabase dashboard or pg_dump

-- Step 2: Create new tables without conflicts
-- Tables that don't exist yet:
-- - venture_assessments
-- - venture_roadmaps
-- - venture_deliverables
-- - venture_status_history
-- - venture_agreements

-- Step 3: Migrate existing data

-- Migrate ventures data
-- (Most fields should already exist from fresh_supabase_setup.sql
--  and vsm_schema_migration.sql)

-- Step 4: Create missing indexes
-- Run index creation statements from schema

-- Step 5: Enable RLS on new tables
-- Run RLS policy statements

-- Step 6: Test thoroughly in development first!
```

### Migration Script Example

```sql
-- Create new assessment from old vsm fields
INSERT INTO venture_assessments (
  venture_id,
  assessment_type,
  assessed_by,
  assessor_role,
  notes,
  internal_comments,
  ai_analysis,
  program_recommendation,
  is_current
)
SELECT
  id as venture_id,
  'screening' as assessment_type,
  assigned_vsm_id as assessed_by,
  'success_mgr' as assessor_role,
  vsm_notes as notes,
  internal_comments,
  ai_analysis,
  program_recommendation,
  true as is_current
FROM ventures
WHERE vsm_notes IS NOT NULL
   OR program_recommendation IS NOT NULL;
```

---

## ✅ Best Practices

### 1. **Data Integrity**

**Always use transactions for multi-table operations:**
```sql
BEGIN;
  -- Create venture
  INSERT INTO ventures (...) RETURNING id;

  -- Create application
  INSERT INTO venture_applications (...);

  -- Create streams
  INSERT INTO venture_streams (...);
COMMIT;
```

### 2. **Performance**

**Use views for complex queries:**
```sql
-- Pre-defined view
SELECT * FROM ventures_complete
WHERE status = 'Under Review';

-- Instead of joining 5+ tables manually
```

**Leverage indexes:**
- Full-text search on venture names uses GIN index
- Status filtering uses B-tree index
- JSONB queries use GIN indexes

### 3. **AI Integration**

**Version all AI outputs:**
```sql
-- When regenerating insights
INSERT INTO venture_assessments (
  venture_id,
  assessment_version,
  supersedes_id,  -- Link to previous
  is_current,
  ai_analysis
) VALUES (...);

-- Mark old version as not current
UPDATE venture_assessments
SET is_current = false
WHERE id = old_assessment_id;
```

**Store AI metadata:**
```json
{
  "model_used": "claude-3-5-sonnet-20250929",
  "generated_at": "2026-02-25T10:30:00Z",
  "prompt_version": "v2.1",
  "processing_time_ms": 3240
}
```

### 4. **Audit Compliance**

**All critical changes are auto-logged:**
- Status changes → `venture_status_history`
- Updated_at timestamps on all tables
- Soft deletes preserve data
- RLS ensures data isolation

### 5. **Scaling Considerations**

**Partitioning (for large datasets):**
```sql
-- Partition ventures by year (future)
CREATE TABLE ventures_2026 PARTITION OF ventures
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

**Read replicas:**
- Use Supabase read replicas for analytics queries
- Direct real-time queries to primary

**Archival strategy:**
```sql
-- Move completed ventures older than 2 years to archive
CREATE TABLE ventures_archive AS
SELECT * FROM ventures
WHERE status = 'Completed'
  AND updated_at < now() - interval '2 years';
```

---

## 🔐 Security Features

### Row Level Security (RLS)

**All tables have RLS enabled** with policies for:

1. **Entrepreneurs:**
   - Can only view/edit their own ventures
   - Cannot access other entrepreneurs' data
   - Locked out when `workbench_locked = true`

2. **Staff (VSM, VM, Committee, Admin):**
   - Can view all ventures
   - Can update ventures based on role
   - Can create assessments and interactions

3. **Admin:**
   - Full access to everything
   - Can override any restriction

### Data Privacy

**JSONB fields allow flexible PII handling:**
```sql
-- Anonymize data for analytics
UPDATE venture_applications
SET additional_data = additional_data - 'phone' - 'email'
WHERE created_at < now() - interval '5 years';
```

---

## 📈 Analytics & Reporting

### Pre-built Views

#### **ventures_complete**
Complete venture data with all related fields joined.

```sql
SELECT * FROM ventures_complete
WHERE program_tier = 1
  AND status = 'Active';
```

#### **venture_analytics**
Key metrics for reporting dashboards.

```sql
SELECT
  program_name,
  COUNT(*) as total_ventures,
  AVG(days_since_submission) as avg_processing_days,
  AVG(stream_completion_rate) as avg_progress
FROM venture_analytics
GROUP BY program_name;
```

### Custom Analytics Examples

**VSM Performance:**
```sql
SELECT
  p.full_name as vsm_name,
  COUNT(v.id) as ventures_reviewed,
  AVG(EXTRACT(DAY FROM (
    va.created_at - v.created_at
  ))) as avg_review_days
FROM ventures v
JOIN profiles p ON p.id = v.assigned_vsm_id
LEFT JOIN venture_assessments va ON va.venture_id = v.id
WHERE va.assessment_type = 'screening'
GROUP BY p.full_name;
```

**AI Insights Quality:**
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as assessments_with_ai,
  AVG((ai_analysis->>'overall_score')::float) as avg_ai_score
FROM venture_assessments
WHERE ai_analysis IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Smart Document Processing**
   - OCR for corporate presentations
   - Auto-extract financial data
   - Store in `additional_data` JSONB

2. **Advanced AI Features**
   - Similarity search using embeddings
   - Predictive success scoring
   - Auto-matching ventures with mentors

3. **Communication Hub**
   - In-app messaging
   - Email integration
   - WhatsApp integration (common in rural India)

4. **Mobile App Support**
   - Offline-first architecture
   - Sync strategy for ventures_complete view
   - Push notifications for status changes

5. **Advanced Analytics**
   - Machine learning on venture success patterns
   - Cohort analysis
   - Predictive churn modeling

---

## 📞 Support & Maintenance

### Health Checks

```sql
-- Check for ventures stuck in status
SELECT status, COUNT(*), AVG(days_in_status)
FROM venture_analytics
WHERE days_in_status > 30
GROUP BY status;

-- Check for orphaned records
SELECT 'Applications' as table_name, COUNT(*)
FROM venture_applications va
WHERE NOT EXISTS (
  SELECT 1 FROM ventures v WHERE v.id = va.venture_id
);

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Common Issues

**Issue:** Entrepreneur can't edit venture
```sql
-- Check workbench lock
SELECT id, name, status, workbench_locked, locked_reason
FROM ventures
WHERE user_id = '<user_id>';

-- Unlock if needed
UPDATE ventures
SET workbench_locked = false,
    locked_reason = NULL
WHERE id = '<venture_id>';
```

**Issue:** AI insights not generating
```sql
-- Check if ANTHROPIC_API_KEY is set in backend .env
-- Check venture_assessments for error logs
SELECT id, ai_analysis, created_at
FROM venture_assessments
WHERE venture_id = '<venture_id>'
ORDER BY created_at DESC;
```

---

## 📄 License & Credits

**Schema Version:** 2.0
**Date:** 2026-02-25
**Platform:** Wadhwani Accelerate
**Database:** PostgreSQL (via Supabase)

**Designed for:**
- Rural venture growth programs
- Multi-stakeholder collaboration
- AI-powered decision support
- Comprehensive tracking & reporting

---

**Questions or Issues?**
- Check the troubleshooting section in README.md
- Review API documentation in docs/API.md
- Open an issue on GitHub
