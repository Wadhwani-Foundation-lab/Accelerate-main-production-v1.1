-- Migration 002: Add New Columns to Ventures Table
-- Purpose: Add workflow status columns, versioning, and workbench locking
-- Created: 2026-02-21

-- ============================================================================
-- 1. ADD NEW STATUS COLUMNS (separates the monolithic 'status' field)
-- ============================================================================

-- Application Status
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'draft';

-- Screening Status
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS screening_status text;

-- Committee Status
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS committee_status text;

-- Agreement Status (replaces old agreement_status if different type)
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS agreement_status_new text;

-- Add CHECK constraints for status columns
ALTER TABLE ventures
ADD CONSTRAINT IF NOT EXISTS valid_application_status CHECK (
  application_status IN ('draft', 'submitted', 'withdrawn')
);

ALTER TABLE ventures
ADD CONSTRAINT IF NOT EXISTS valid_screening_status CHECK (
  screening_status IS NULL OR
  screening_status IN ('pending_review', 'under_review', 'completed')
);

ALTER TABLE ventures
ADD CONSTRAINT IF NOT EXISTS valid_committee_status CHECK (
  committee_status IS NULL OR
  committee_status IN ('pending_review', 'in_review', 'approved', 'rejected')
);

ALTER TABLE ventures
ADD CONSTRAINT IF NOT EXISTS valid_agreement_status_new CHECK (
  agreement_status_new IS NULL OR
  agreement_status_new IN ('draft', 'sent', 'signed', 'declined')
);

-- ============================================================================
-- 2. ADD VENTURE PARTNER ASSIGNMENT FIELDS
-- ============================================================================

-- Venture Partner Assignment (FK to profiles)
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS venture_partner_id uuid REFERENCES profiles(id);

-- When was partner assigned
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- ============================================================================
-- 3. ADD WORKBENCH LOCKING FIELDS
-- ============================================================================

-- Already exists, but ensure it's there
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS workbench_locked boolean DEFAULT false;

-- When was it locked
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Who locked it
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id);

-- Why was it locked
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS lock_reason text;

-- ============================================================================
-- 4. ADD VERSIONING FOR OPTIMISTIC LOCKING
-- ============================================================================

-- Version number (auto-increments on each update)
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- ============================================================================
-- 5. ADD SOFT DELETE SUPPORT
-- ============================================================================

-- Soft delete timestamp
ALTER TABLE ventures
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================================
-- 6. CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Status column indexes
CREATE INDEX IF NOT EXISTS idx_ventures_application_status
  ON ventures(application_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ventures_screening_status
  ON ventures(screening_status)
  WHERE deleted_at IS NULL AND screening_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ventures_committee_status
  ON ventures(committee_status)
  WHERE deleted_at IS NULL AND committee_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ventures_agreement_status_new
  ON ventures(agreement_status_new)
  WHERE deleted_at IS NULL AND agreement_status_new IS NOT NULL;

-- Venture partner index
CREATE INDEX IF NOT EXISTS idx_ventures_venture_partner_id
  ON ventures(venture_partner_id)
  WHERE deleted_at IS NULL AND venture_partner_id IS NOT NULL;

-- Program recommendation index (already might exist, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_ventures_program_recommendation
  ON ventures(program_recommendation)
  WHERE deleted_at IS NULL AND program_recommendation IS NOT NULL;

-- Workbench locked index
CREATE INDEX IF NOT EXISTS idx_ventures_workbench_locked
  ON ventures(workbench_locked, user_id)
  WHERE deleted_at IS NULL AND workbench_locked = true;

-- Deleted index (for filtering out deleted records)
CREATE INDEX IF NOT EXISTS idx_ventures_deleted_at
  ON ventures(deleted_at)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. ENHANCE EXISTING TABLES
-- ============================================================================

-- Add indexes to venture_interactions (if not already added)
CREATE INDEX IF NOT EXISTS idx_interactions_venture_created
  ON venture_interactions(venture_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_type_date
  ON venture_interactions(interaction_type, interaction_date DESC);

-- Add columns to support_hours
ALTER TABLE support_hours
ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id);

ALTER TABLE support_hours
ADD COLUMN IF NOT EXISTS notes text;

-- Add columns to venture_milestones
ALTER TABLE venture_milestones
ADD COLUMN IF NOT EXISTS stream_id uuid REFERENCES venture_streams(id) ON DELETE SET NULL;

ALTER TABLE venture_milestones
ADD COLUMN IF NOT EXISTS deliverable_id uuid;
-- Will add FK constraint after venture_deliverables is created

ALTER TABLE venture_milestones
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id);

ALTER TABLE venture_milestones
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Indexes for venture_milestones enhancements
CREATE INDEX IF NOT EXISTS idx_milestones_stream
  ON venture_milestones(stream_id)
  WHERE stream_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_deliverable
  ON venture_milestones(deliverable_id)
  WHERE deliverable_id IS NOT NULL;

-- ============================================================================
-- 8. UPDATE RLS POLICIES TO CONSIDER DELETED_AT
-- ============================================================================

-- Drop existing entrepreneur view policy and recreate with deleted_at check
DROP POLICY IF EXISTS "entrepreneurs_view_own" ON ventures;
CREATE POLICY "entrepreneurs_view_own"
  ON ventures FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Drop existing entrepreneur update policy and recreate with workbench_locked check
DROP POLICY IF EXISTS "entrepreneurs_update_own" ON ventures;
CREATE POLICY "entrepreneurs_update_own"
  ON ventures FOR UPDATE
  USING (
    auth.uid() = user_id
    AND workbench_locked = false
    AND deleted_at IS NULL
  );

-- Drop existing staff view policy and recreate with deleted_at check
DROP POLICY IF EXISTS "staff_view_all" ON ventures;
CREATE POLICY "staff_view_all"
  ON ventures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
    AND deleted_at IS NULL
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN ventures.application_status IS 'Application submission status: draft, submitted, withdrawn';
COMMENT ON COLUMN ventures.screening_status IS 'VSM screening status: pending_review, under_review, completed';
COMMENT ON COLUMN ventures.committee_status IS 'Committee review status: pending_review, in_review, approved, rejected';
COMMENT ON COLUMN ventures.agreement_status_new IS 'Agreement status: draft, sent, signed, declined';
COMMENT ON COLUMN ventures.venture_partner_id IS 'Assigned venture partner (for Prime ventures)';
COMMENT ON COLUMN ventures.assigned_at IS 'When venture partner was assigned';
COMMENT ON COLUMN ventures.workbench_locked IS 'Whether workbench is locked pending action';
COMMENT ON COLUMN ventures.locked_at IS 'When workbench was locked';
COMMENT ON COLUMN ventures.locked_by IS 'Who locked the workbench';
COMMENT ON COLUMN ventures.lock_reason IS 'Reason for locking (e.g., pending contract signature)';
COMMENT ON COLUMN ventures.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN ventures.deleted_at IS 'Soft delete timestamp';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 completed successfully: New columns added to ventures table';
END $$;
