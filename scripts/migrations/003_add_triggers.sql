-- Migration 003: Add Trigger Functions for Versioning and Audit
-- Purpose: Create triggers for auto-versioning and status history tracking
-- Created: 2026-02-21

-- ============================================================================
-- 1. VERSION INCREMENT TRIGGER FOR VENTURES
-- ============================================================================

-- Function to increment venture version on update
CREATE OR REPLACE FUNCTION increment_venture_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if this is an actual UPDATE (not INSERT)
  IF TG_OP = 'UPDATE' THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment version before update
DROP TRIGGER IF EXISTS increment_ventures_version ON ventures;
CREATE TRIGGER increment_ventures_version
  BEFORE UPDATE ON ventures
  FOR EACH ROW
  EXECUTE FUNCTION increment_venture_version();

COMMENT ON FUNCTION increment_venture_version() IS 'Auto-increments venture version number for optimistic locking';

-- ============================================================================
-- 2. ASSESSMENT VERSIONING TRIGGER
-- ============================================================================

-- Function to create new assessment version
CREATE OR REPLACE FUNCTION create_assessment_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark previous versions as not current
  UPDATE venture_assessments
  SET is_current = false
  WHERE venture_id = NEW.venture_id
    AND assessment_type = NEW.assessment_type
    AND is_current = true
    AND id != NEW.id;

  -- Set version number
  NEW.assessment_version = COALESCE(
    (SELECT MAX(assessment_version) + 1
     FROM venture_assessments
     WHERE venture_id = NEW.venture_id
       AND assessment_type = NEW.assessment_type),
    1
  );

  -- Ensure is_current is true for new assessment
  NEW.is_current = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to version assessments before insert
DROP TRIGGER IF EXISTS version_assessment ON venture_assessments;
CREATE TRIGGER version_assessment
  BEFORE INSERT ON venture_assessments
  FOR EACH ROW
  EXECUTE FUNCTION create_assessment_version();

COMMENT ON FUNCTION create_assessment_version() IS 'Auto-versions assessments and maintains current version pointer';

-- ============================================================================
-- 3. ROADMAP VERSIONING TRIGGER
-- ============================================================================

-- Function to create new roadmap version
CREATE OR REPLACE FUNCTION create_roadmap_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark previous versions as not current
  UPDATE venture_roadmaps
  SET is_current = false
  WHERE venture_id = NEW.venture_id
    AND is_current = true
    AND id != NEW.id;

  -- Set version number
  NEW.roadmap_version = COALESCE(
    (SELECT MAX(roadmap_version) + 1
     FROM venture_roadmaps
     WHERE venture_id = NEW.venture_id),
    1
  );

  -- Ensure is_current is true for new roadmap
  NEW.is_current = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to version roadmaps before insert
DROP TRIGGER IF EXISTS version_roadmap ON venture_roadmaps;
CREATE TRIGGER version_roadmap
  BEFORE INSERT ON venture_roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION create_roadmap_version();

COMMENT ON FUNCTION create_roadmap_version() IS 'Auto-versions roadmaps and maintains current version pointer';

-- ============================================================================
-- 4. STATUS HISTORY AUDIT TRIGGER
-- ============================================================================

-- Function to log venture status changes
CREATE OR REPLACE FUNCTION log_venture_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Application status changed
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'application', OLD.application_status, NEW.application_status,
      auth.uid(), NEW.version
    );
  END IF;

  -- Screening status changed
  IF OLD.screening_status IS DISTINCT FROM NEW.screening_status THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'screening', OLD.screening_status, NEW.screening_status,
      auth.uid(), NEW.version
    );
  END IF;

  -- Committee status changed
  IF OLD.committee_status IS DISTINCT FROM NEW.committee_status THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'committee', OLD.committee_status, NEW.committee_status,
      auth.uid(), NEW.version
    );
  END IF;

  -- Agreement status changed (use new column)
  IF OLD.agreement_status_new IS DISTINCT FROM NEW.agreement_status_new THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'agreement', OLD.agreement_status_new, NEW.agreement_status_new,
      auth.uid(), NEW.version
    );
  END IF;

  -- Workbench lock changed
  IF OLD.workbench_locked IS DISTINCT FROM NEW.workbench_locked THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version, notes
    ) VALUES (
      NEW.id, 'workbench_lock',
      OLD.workbench_locked::text, NEW.workbench_locked::text,
      auth.uid(), NEW.version, NEW.lock_reason
    );
  END IF;

  -- Venture partner assigned/changed
  IF OLD.venture_partner_id IS DISTINCT FROM NEW.venture_partner_id THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'venture_partner',
      OLD.venture_partner_id::text, NEW.venture_partner_id::text,
      auth.uid(), NEW.version
    );
  END IF;

  -- Program assignment changed
  IF OLD.current_program IS DISTINCT FROM NEW.current_program THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value,
      changed_by, venture_version
    ) VALUES (
      NEW.id, 'program_assignment',
      OLD.current_program, NEW.current_program,
      auth.uid(), NEW.version
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to track status changes after update
DROP TRIGGER IF EXISTS track_venture_status_changes ON ventures;
CREATE TRIGGER track_venture_status_changes
  AFTER UPDATE ON ventures
  FOR EACH ROW
  EXECUTE FUNCTION log_venture_status_change();

COMMENT ON FUNCTION log_venture_status_change() IS 'Auto-logs all status changes to venture_status_history for audit trail';

-- ============================================================================
-- 5. AUTO-COMPLETE DELIVERABLES ON STATUS CHANGE
-- ============================================================================

-- Function to auto-set completed_at when deliverable status becomes 'completed'
CREATE OR REPLACE FUNCTION auto_complete_deliverable()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'completed' and completed_at is null, set it
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;

  -- If status changed from 'completed' to something else, clear completed_at
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete deliverables
DROP TRIGGER IF EXISTS auto_complete_deliverable_trigger ON venture_deliverables;
CREATE TRIGGER auto_complete_deliverable_trigger
  BEFORE UPDATE ON venture_deliverables
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_complete_deliverable();

COMMENT ON FUNCTION auto_complete_deliverable() IS 'Auto-sets completed_at timestamp when deliverable status becomes completed';

-- ============================================================================
-- 6. UPDATE WORKBENCH LOCK METADATA
-- ============================================================================

-- Function to auto-set lock metadata when workbench_locked changes
CREATE OR REPLACE FUNCTION update_workbench_lock_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- If workbench just got locked
  IF NEW.workbench_locked = true AND OLD.workbench_locked = false THEN
    NEW.locked_at = now();
    NEW.locked_by = auth.uid();
  END IF;

  -- If workbench just got unlocked
  IF NEW.workbench_locked = false AND OLD.workbench_locked = true THEN
    NEW.locked_at = NULL;
    NEW.locked_by = NULL;
    NEW.lock_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update lock metadata
DROP TRIGGER IF EXISTS update_workbench_lock_metadata_trigger ON ventures;
CREATE TRIGGER update_workbench_lock_metadata_trigger
  BEFORE UPDATE ON ventures
  FOR EACH ROW
  WHEN (OLD.workbench_locked IS DISTINCT FROM NEW.workbench_locked)
  EXECUTE FUNCTION update_workbench_lock_metadata();

COMMENT ON FUNCTION update_workbench_lock_metadata() IS 'Auto-sets locked_at and locked_by when workbench_locked changes';

-- ============================================================================
-- 7. ADD FOREIGN KEY CONSTRAINT FOR VENTURE_MILESTONES
-- ============================================================================

-- Now that venture_deliverables table exists, add the FK constraint
ALTER TABLE venture_milestones
DROP CONSTRAINT IF EXISTS fk_milestone_deliverable;

ALTER TABLE venture_milestones
ADD CONSTRAINT fk_milestone_deliverable
  FOREIGN KEY (deliverable_id)
  REFERENCES venture_deliverables(id)
  ON DELETE SET NULL;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully: Triggers and versioning functions created';
  RAISE NOTICE 'The following triggers are now active:';
  RAISE NOTICE '  - Version increment on ventures updates';
  RAISE NOTICE '  - Assessment versioning on inserts';
  RAISE NOTICE '  - Roadmap versioning on inserts';
  RAISE NOTICE '  - Status history tracking on ventures updates';
  RAISE NOTICE '  - Auto-complete deliverables on status change';
  RAISE NOTICE '  - Workbench lock metadata updates';
END $$;
