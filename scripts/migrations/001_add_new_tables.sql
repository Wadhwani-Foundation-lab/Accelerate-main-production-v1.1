-- Migration 001: Add New Core Tables
-- Purpose: Create new normalized tables for better data organization
-- Created: 2026-02-21

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. VENTURE_APPLICATIONS TABLE
-- Purpose: Store all application form submission data (1:1 with ventures)
-- ============================================================================

CREATE TABLE IF NOT EXISTS venture_applications (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Business Information (Step 1)
  registered_company_name text,
  company_type text,
  founder_email text,
  founder_phone text,
  founder_designation text,
  referred_by text,

  -- Financial Metrics (normalized from JSONB)
  revenue_12m numeric,
  revenue_potential_3y numeric,
  min_investment numeric,

  -- Team Metrics (normalized from JSONB)
  full_time_employees integer,
  incremental_hiring integer,

  -- Current Business (normalized from growth_current JSONB)
  current_product text,
  current_segment text,
  current_geography text,

  -- Target Business (normalized from growth_target JSONB)
  target_product text,
  target_segment text,
  target_geography text,

  -- Growth Focus
  growth_focus text[], -- array: ['product', 'segment', 'geography']

  -- Status & Needs
  blockers text,
  support_request text,

  -- Keep original JSONB for any extra fields
  additional_data jsonb,

  -- Constraints
  CONSTRAINT unique_venture_application UNIQUE(venture_id),
  CONSTRAINT positive_revenue_12m CHECK (revenue_12m >= 0),
  CONSTRAINT positive_revenue_potential CHECK (revenue_potential_3y >= 0),
  CONSTRAINT positive_investment CHECK (min_investment >= 0),
  CONSTRAINT positive_employees CHECK (full_time_employees >= 0),
  CONSTRAINT positive_hiring CHECK (incremental_hiring >= 0)
);

-- Indexes for venture_applications
CREATE INDEX idx_applications_venture_id ON venture_applications(venture_id);
CREATE INDEX idx_applications_revenue_12m ON venture_applications(revenue_12m) WHERE revenue_12m IS NOT NULL;
CREATE INDEX idx_applications_employees ON venture_applications(full_time_employees) WHERE full_time_employees IS NOT NULL;
CREATE INDEX idx_applications_created_at ON venture_applications(created_at DESC);

-- RLS for venture_applications
ALTER TABLE venture_applications ENABLE ROW LEVEL SECURITY;

-- Users can view applications for ventures they can view
CREATE POLICY "view_applications_via_venture"
  ON venture_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_applications.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
        )
      )
      AND v.deleted_at IS NULL
    )
  );

-- Users can insert applications for their own ventures
CREATE POLICY "insert_own_applications"
  ON venture_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_applications.venture_id
      AND v.user_id = auth.uid()
    )
  );

-- Users can update applications for their own ventures
CREATE POLICY "update_own_applications"
  ON venture_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_applications.venture_id
      AND v.user_id = auth.uid()
      AND v.workbench_locked = false
    )
  );

-- Staff can update any application
CREATE POLICY "staff_update_applications"
  ON venture_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
  );

-- Updated_at trigger for venture_applications
CREATE TRIGGER update_venture_applications_updated_at
  BEFORE UPDATE ON venture_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. VENTURE_ASSESSMENTS TABLE
-- Purpose: Store VSM/Committee assessments with full version history
-- ============================================================================

CREATE TABLE IF NOT EXISTS venture_assessments (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Version tracking
  assessment_version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES venture_assessments(id), -- Previous version
  is_current boolean NOT NULL DEFAULT true,

  -- Who assessed
  assessed_by uuid NOT NULL REFERENCES auth.users(id),
  assessor_role text NOT NULL, -- 'success_mgr', 'committee_member', 'venture_mgr'

  -- Assessment Type
  assessment_type text NOT NULL, -- 'screening', 'committee'

  -- Assessment Content
  notes text,
  internal_comments text,

  -- AI Analysis (versioned)
  ai_analysis jsonb,
  /* Structure:
  {
    "strengths": ["strength1", "strength2"],
    "risks": ["risk1", "risk2"],
    "questions": ["question1", "question2"],
    "generated_at": "timestamp"
  }
  */

  -- Recommendation
  program_recommendation text,
  decision text, -- 'recommend', 'reject', 'needs_more_info'
  decision_rationale text,

  -- Metadata
  assessment_duration_minutes integer,

  -- Constraints
  CONSTRAINT valid_assessment_type CHECK (
    assessment_type IN ('screening', 'committee')
  ),
  CONSTRAINT valid_decision CHECK (
    decision IS NULL OR decision IN ('recommend', 'reject', 'needs_more_info')
  ),
  CONSTRAINT valid_assessor_role CHECK (
    assessor_role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
  ),
  CONSTRAINT positive_duration CHECK (
    assessment_duration_minutes IS NULL OR assessment_duration_minutes >= 0
  )
);

-- Indexes for venture_assessments
CREATE INDEX idx_assessments_venture_id ON venture_assessments(venture_id);
CREATE INDEX idx_assessments_current ON venture_assessments(venture_id, is_current) WHERE is_current = true;
CREATE INDEX idx_assessments_version ON venture_assessments(venture_id, assessment_version);
CREATE INDEX idx_assessments_assessor ON venture_assessments(assessed_by, created_at DESC);
CREATE INDEX idx_assessments_type ON venture_assessments(assessment_type, created_at DESC);

-- Ensure only one current assessment per venture per type
CREATE UNIQUE INDEX idx_one_current_per_type
  ON venture_assessments(venture_id, assessment_type)
  WHERE is_current = true;

-- RLS for venture_assessments
ALTER TABLE venture_assessments ENABLE ROW LEVEL SECURITY;

-- Staff can view all assessments
CREATE POLICY "staff_view_assessments"
  ON venture_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
  );

-- Only staff can create assessments
CREATE POLICY "staff_create_assessments"
  ON venture_assessments FOR INSERT
  WITH CHECK (
    auth.uid() = assessed_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
    )
  );

-- ============================================================================
-- 3. VENTURE_ROADMAPS TABLE
-- Purpose: Persist AI-generated roadmaps with version history
-- ============================================================================

CREATE TABLE IF NOT EXISTS venture_roadmaps (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Version tracking
  roadmap_version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES venture_roadmaps(id),
  is_current boolean NOT NULL DEFAULT true,

  -- Who generated
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  generation_source text NOT NULL, -- 'ai_generated', 'manual', 'imported'

  -- Based on which assessment
  based_on_assessment_id uuid REFERENCES venture_assessments(id),

  -- Roadmap data (all 6 streams)
  roadmap_data jsonb NOT NULL,
  /* Structure:
  {
    "product": [
      {"title": "Core API Specs", "description": "...", "status": "completed", "priority": "high"},
      ...
    ],
    "gtm": [...],
    "funding": [...],
    "supply_chain": [...],
    "operations": [...],
    "team": [...]
  }
  */

  -- Metadata
  generation_duration_seconds integer,

  -- Constraints
  CONSTRAINT valid_generation_source CHECK (
    generation_source IN ('ai_generated', 'manual', 'imported')
  ),
  CONSTRAINT positive_generation_duration CHECK (
    generation_duration_seconds IS NULL OR generation_duration_seconds >= 0
  )
);

-- Indexes for venture_roadmaps
CREATE INDEX idx_roadmaps_venture_id ON venture_roadmaps(venture_id);
CREATE INDEX idx_roadmaps_current ON venture_roadmaps(venture_id, is_current) WHERE is_current = true;
CREATE INDEX idx_roadmaps_version ON venture_roadmaps(venture_id, roadmap_version);
CREATE INDEX idx_roadmaps_generated_by ON venture_roadmaps(generated_by, created_at DESC);

-- Ensure only one current roadmap per venture
CREATE UNIQUE INDEX idx_one_current_roadmap
  ON venture_roadmaps(venture_id)
  WHERE is_current = true;

-- RLS for venture_roadmaps
ALTER TABLE venture_roadmaps ENABLE ROW LEVEL SECURITY;

-- Entrepreneurs can view their own venture's roadmaps
CREATE POLICY "entrepreneurs_view_own_roadmaps"
  ON venture_roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_roadmaps.venture_id
      AND v.user_id = auth.uid()
    )
  );

-- Staff can view all roadmaps
CREATE POLICY "staff_view_roadmaps"
  ON venture_roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
  );

-- Only staff can create roadmaps
CREATE POLICY "staff_create_roadmaps"
  ON venture_roadmaps FOR INSERT
  WITH CHECK (
    auth.uid() = generated_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
    )
  );

-- ============================================================================
-- 4. VENTURE_DELIVERABLES TABLE
-- Purpose: Track granular tasks/deliverables within each stream
-- ============================================================================

CREATE TABLE IF NOT EXISTS venture_deliverables (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id uuid REFERENCES venture_streams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Deliverable details
  title text NOT NULL,
  description text,

  -- Status
  status text NOT NULL DEFAULT 'pending',

  -- Priority
  priority text DEFAULT 'medium',

  -- Assignment
  assigned_to_id uuid REFERENCES profiles(id),

  -- Timeline
  due_date date,
  completed_at timestamptz,

  -- Ordering
  display_order integer DEFAULT 0,

  -- Link to roadmap
  roadmap_key text, -- Key from roadmap_data JSONB

  -- Metadata
  notes text,

  -- Constraints
  CONSTRAINT valid_deliverable_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')
  ),
  CONSTRAINT valid_priority CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT completed_at_requires_completed_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL) OR
    (status != 'completed' AND completed_at IS NOT NULL) -- Allow completion time to persist
  )
);

-- Indexes for venture_deliverables
CREATE INDEX idx_deliverables_venture_id ON venture_deliverables(venture_id);
CREATE INDEX idx_deliverables_stream_id ON venture_deliverables(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_deliverables_status ON venture_deliverables(status);
CREATE INDEX idx_deliverables_assigned ON venture_deliverables(assigned_to_id) WHERE assigned_to_id IS NOT NULL;
CREATE INDEX idx_deliverables_due_date ON venture_deliverables(due_date) WHERE due_date IS NOT NULL AND status != 'completed';
CREATE INDEX idx_deliverables_display_order ON venture_deliverables(venture_id, stream_id, display_order);

-- RLS for venture_deliverables
ALTER TABLE venture_deliverables ENABLE ROW LEVEL SECURITY;

-- View via ventures
CREATE POLICY "view_deliverables_via_venture"
  ON venture_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_deliverables.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
        )
      )
      AND v.deleted_at IS NULL
    )
  );

-- Entrepreneurs can update their own deliverables
CREATE POLICY "entrepreneurs_update_own_deliverables"
  ON venture_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_deliverables.venture_id
      AND v.user_id = auth.uid()
      AND v.workbench_locked = false
    )
  );

-- Staff can insert/update all deliverables
CREATE POLICY "staff_manage_deliverables"
  ON venture_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
  );

-- Updated_at trigger for venture_deliverables
CREATE TRIGGER update_venture_deliverables_updated_at
  BEFORE UPDATE ON venture_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. VENTURE_STATUS_HISTORY TABLE
-- Purpose: Comprehensive audit trail for all status changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS venture_status_history (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- What changed
  status_type text NOT NULL,
  previous_value text,
  new_value text NOT NULL,

  -- Who changed it
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_by_role text,

  -- Why
  change_reason text,
  notes text,

  -- Context
  venture_version integer, -- Version at time of change

  -- Constraints
  CONSTRAINT valid_status_type CHECK (
    status_type IN ('application', 'screening', 'committee', 'agreement', 'workbench_lock', 'program_assignment', 'venture_partner')
  )
);

-- Indexes for venture_status_history
CREATE INDEX idx_status_history_venture ON venture_status_history(venture_id, created_at DESC);
CREATE INDEX idx_status_history_type ON venture_status_history(status_type, created_at DESC);
CREATE INDEX idx_status_history_changed_by ON venture_status_history(changed_by, created_at DESC);

-- RLS for venture_status_history
ALTER TABLE venture_status_history ENABLE ROW LEVEL SECURITY;

-- Staff can view all history
CREATE POLICY "staff_view_history"
  ON venture_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'admin', 'committee_member', 'venture_mgr')
    )
  );

-- Entrepreneurs can view their venture's history
CREATE POLICY "entrepreneurs_view_own_history"
  ON venture_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_status_history.venture_id
      AND v.user_id = auth.uid()
    )
  );

-- Only system/triggers can insert (no direct inserts from app)
-- Inserts will be handled by triggers

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE venture_applications IS 'Stores all application form submission data in normalized format';
COMMENT ON TABLE venture_assessments IS 'Versioned assessments from VSM/Committee with full history';
COMMENT ON TABLE venture_roadmaps IS 'Versioned AI-generated roadmaps with deliverables for all streams';
COMMENT ON TABLE venture_deliverables IS 'Granular task tracking within streams';
COMMENT ON TABLE venture_status_history IS 'Comprehensive audit trail for all status changes (auto-populated)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 001 completed successfully: New core tables created';
END $$;
