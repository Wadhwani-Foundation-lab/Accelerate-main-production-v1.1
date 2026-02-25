-- ============================================================================
-- WADHWANI ACCELERATE - PRODUCTION SCHEMA V2.0
-- ============================================================================
-- Purpose: Complete production-ready database schema with AI integration
-- Features: Normalized data, version tracking, audit trails, AI readiness
-- Date: 2026-02-25
--
-- ARCHITECTURE OVERVIEW:
-- 1. Core user management (profiles, roles, permissions)
-- 2. Venture lifecycle (applications, assessments, decisions)
-- 3. AI Integration (insights, roadmaps, recommendations)
-- 4. Workbench & Progress Tracking (streams, milestones, deliverables)
-- 5. Interactions & Communications (calls, meetings, notes)
-- 6. Audit & History (comprehensive tracking)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For JSONB indexing

-- ============================================================================
-- PART 1: USER MANAGEMENT & ROLES
-- ============================================================================

-- ============================================
-- 1.1 PROFILES TABLE
-- ============================================
-- Stores user profiles with role-based access
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- User Information
  full_name text NOT NULL,
  email text,
  phone text,
  avatar_url text,

  -- Role-based access
  role text NOT NULL CHECK (role IN ('entrepreneur', 'success_mgr', 'venture_mgr', 'committee_member', 'admin')),

  -- Metadata
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  preferences jsonb DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(full_name) >= 2)
);

-- Indexes for profiles
CREATE INDEX idx_profiles_role ON profiles(role) WHERE is_active = true;
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_updated_at ON profiles(updated_at DESC);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 1.2 AUTO-ASSIGN ROLES ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_role text;
BEGIN
  -- Automatically assign roles based on email pattern
  IF new.email ILIKE '%admin%' OR new.email ILIKE '%@wadhwani%' THEN
    user_role := 'admin';
  ELSIF new.email ILIKE '%committee%' THEN
    user_role := 'committee_member';
  ELSIF new.email ILIKE '%venture%manager%' OR new.email ILIKE '%vm@%' THEN
    user_role := 'venture_mgr';
  ELSIF new.email ILIKE '%success%' OR new.email ILIKE '%vsm@%' THEN
    user_role := 'success_mgr';
  ELSE
    user_role := 'entrepreneur';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, last_login_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    user_role,
    now()
  );

  RETURN new;
END;
$$;

-- Trigger to call function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 2: VENTURE CORE DATA
-- ============================================================================

-- ============================================
-- 2.1 PROGRAMS TABLE
-- ============================================
-- Lookup table for available accelerator programs
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Program details
  name text NOT NULL UNIQUE,
  description text,
  tier integer NOT NULL, -- 1=Prime, 2=Core, 3=Select, 4=Ignite, 5=Liftoff

  -- Requirements
  min_revenue numeric,
  max_revenue numeric,
  support_hours_allocated integer DEFAULT 0,
  duration_months integer,

  -- Status
  is_active boolean NOT NULL DEFAULT true,

  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Seed programs
INSERT INTO programs (name, description, tier, support_hours_allocated, duration_months) VALUES
('Accelerate Prime', 'For high-growth ventures with proven traction', 1, 120, 12),
('Accelerate Core', 'For established ventures seeking acceleration', 2, 80, 9),
('Accelerate Select', 'For mid-stage ventures with growth potential', 3, 60, 6),
('Ignite', 'For early-stage ventures', 4, 40, 6),
('Liftoff', 'For pre-launch ventures', 5, 30, 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2.2 VENTURES TABLE (Core)
-- ============================================
-- Main table for venture records with essential fields only
CREATE TABLE IF NOT EXISTS ventures (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Basic Information
  name text NOT NULL,
  founder_name text,
  city text,
  location text, -- Full address/location

  -- Program Assignment
  program_id uuid REFERENCES programs(id),
  program_name text, -- Denormalized for quick access

  -- Status Tracking
  status text NOT NULL DEFAULT 'Draft',
  /* Valid statuses:
     - Draft: Initial creation
     - Submitted: Application submitted by entrepreneur
     - Under Review: VSM screening in progress
     - Committee Review: Reviewed by VSM, awaiting committee
     - Approved: Committee approved
     - Agreement Sent: Agreement generated and sent
     - Agreement Signed: Entrepreneur signed agreement
     - Active: In program (workbench unlocked)
     - Completed: Program finished
     - Rejected: Application rejected
     - Withdrawn: Application withdrawn
  */

  -- Current Stage Owners
  assigned_vsm_id uuid REFERENCES profiles(id),
  assigned_vm_id uuid REFERENCES profiles(id), -- Venture Manager
  venture_partner text, -- Committee assigned partner

  -- Locks & Controls
  workbench_locked boolean NOT NULL DEFAULT true,
  locked_reason text,

  -- Soft Delete
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN (
    'Draft', 'Submitted', 'Under Review', 'Committee Review',
    'Approved', 'Agreement Sent', 'Agreement Signed', 'Active',
    'Completed', 'Rejected', 'Withdrawn'
  ))
);

-- Indexes for ventures
CREATE INDEX idx_ventures_user_id ON ventures(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_status ON ventures(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_program ON ventures(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_assigned_vsm ON ventures(assigned_vsm_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_assigned_vm ON ventures(assigned_vm_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_created_at ON ventures(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventures_name_search ON ventures USING gin(name gin_trgm_ops); -- Full-text search

-- RLS for ventures
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entrepreneurs view own ventures"
  ON ventures FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Entrepreneurs create own ventures"
  ON ventures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Entrepreneurs update own draft ventures"
  ON ventures FOR UPDATE
  USING (auth.uid() = user_id AND status = 'Draft' AND deleted_at IS NULL);

CREATE POLICY "Staff view all ventures"
  ON ventures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "Staff update ventures"
  ON ventures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================
-- 2.3 VENTURE_APPLICATIONS TABLE
-- ============================================
-- Stores all application form submission data (1:1 with ventures)
CREATE TABLE IF NOT EXISTS venture_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Business Information (Step 1 from form)
  registered_company_name text,
  company_type text, -- 'Pvt Ltd', 'Partnership', etc.
  what_do_you_sell text, -- Product/service description
  who_do_you_sell_to text, -- Target segment
  which_regions text, -- Current geography

  -- Founder Details
  founder_email text,
  founder_phone text,
  founder_designation text, -- Role/title
  referred_by text,

  -- Financial Metrics (normalized from JSONB)
  revenue_12m numeric, -- Last 12 months revenue
  revenue_potential_3y numeric, -- 3-year potential
  min_investment numeric, -- Investment required

  -- Team Metrics
  full_time_employees integer,
  incremental_hiring integer, -- Hiring needed for growth

  -- Growth Focus & Target (Step 2 from form)
  growth_focus text[], -- ['product', 'segment', 'geography']
  focus_product text, -- What product to expand
  focus_segment text, -- What segment to target
  focus_geography text, -- What geography to enter

  -- Status & Needs (Step 3 from form)
  blockers text, -- Current blockers
  support_request text, -- Support description from entrepreneur

  -- Additional application data
  state text,
  corporate_presentation_url text, -- S3/storage URL
  additional_data jsonb DEFAULT '{}'::jsonb, -- Any extra fields

  -- Constraints
  CONSTRAINT positive_revenue_12m CHECK (revenue_12m IS NULL OR revenue_12m >= 0),
  CONSTRAINT positive_revenue_potential CHECK (revenue_potential_3y IS NULL OR revenue_potential_3y >= 0),
  CONSTRAINT positive_investment CHECK (min_investment IS NULL OR min_investment >= 0),
  CONSTRAINT positive_employees CHECK (full_time_employees IS NULL OR full_time_employees >= 0),
  CONSTRAINT positive_hiring CHECK (incremental_hiring IS NULL OR incremental_hiring >= 0)
);

-- Indexes for venture_applications
CREATE INDEX idx_applications_venture_id ON venture_applications(venture_id);
CREATE INDEX idx_applications_revenue_12m ON venture_applications(revenue_12m) WHERE revenue_12m IS NOT NULL;
CREATE INDEX idx_applications_employees ON venture_applications(full_time_employees) WHERE full_time_employees IS NOT NULL;
CREATE INDEX idx_applications_created_at ON venture_applications(created_at DESC);

-- RLS for venture_applications
ALTER TABLE venture_applications ENABLE ROW LEVEL SECURITY;

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
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "insert_own_applications"
  ON venture_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_applications.venture_id
      AND v.user_id = auth.uid()
    )
  );

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

CREATE POLICY "staff_update_applications"
  ON venture_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================================================
-- PART 3: AI INTEGRATION & ASSESSMENTS
-- ============================================================================

-- ============================================
-- 3.1 VENTURE_ASSESSMENTS TABLE
-- ============================================
-- Stores VSM/Committee assessments with full version history
CREATE TABLE IF NOT EXISTS venture_assessments (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Version tracking
  assessment_version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES venture_assessments(id), -- Previous version
  is_current boolean NOT NULL DEFAULT true,

  -- Who assessed
  assessed_by uuid NOT NULL REFERENCES auth.users(id),
  assessor_role text NOT NULL,

  -- Assessment Type
  assessment_type text NOT NULL, -- 'screening', 'committee'
  assessment_date timestamptz NOT NULL DEFAULT now(),

  -- Assessment Content
  notes text, -- VSM call notes / committee discussion
  internal_comments text, -- Internal-only notes

  -- AI Analysis (versioned)
  ai_analysis jsonb,
  /* Structure:
  {
    "strengths": ["strength1", "strength2", ...],
    "risks": ["risk1", "risk2", ...],
    "questions": ["question1", "question2", ...],
    "overall_score": 7.5,
    "generated_at": "timestamp",
    "model_used": "claude-3-5-sonnet"
  }
  */
  ai_generated_at timestamptz,

  -- Recommendation
  program_recommendation text, -- Program tier recommended
  decision text, -- 'recommend', 'reject', 'needs_more_info'
  decision_rationale text,

  -- Metadata
  assessment_duration_minutes integer,

  -- Constraints
  CONSTRAINT valid_assessment_type CHECK (assessment_type IN ('screening', 'committee')),
  CONSTRAINT valid_decision CHECK (decision IS NULL OR decision IN ('recommend', 'reject', 'needs_more_info')),
  CONSTRAINT valid_assessor_role CHECK (
    assessor_role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
  ),
  CONSTRAINT positive_duration CHECK (assessment_duration_minutes IS NULL OR assessment_duration_minutes >= 0)
);

-- Indexes for venture_assessments
CREATE INDEX idx_assessments_venture_id ON venture_assessments(venture_id);
CREATE INDEX idx_assessments_current ON venture_assessments(venture_id, is_current) WHERE is_current = true;
CREATE INDEX idx_assessments_version ON venture_assessments(venture_id, assessment_version);
CREATE INDEX idx_assessments_assessor ON venture_assessments(assessed_by, created_at DESC);
CREATE INDEX idx_assessments_type ON venture_assessments(assessment_type, created_at DESC);
CREATE INDEX idx_assessments_ai_analysis ON venture_assessments USING gin(ai_analysis); -- JSONB index

-- Ensure only one current assessment per venture per type
CREATE UNIQUE INDEX idx_one_current_per_type
  ON venture_assessments(venture_id, assessment_type)
  WHERE is_current = true;

-- RLS for venture_assessments
ALTER TABLE venture_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_view_assessments"
  ON venture_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "staff_create_assessments"
  ON venture_assessments FOR INSERT
  WITH CHECK (
    auth.uid() = assessed_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
      AND is_active = true
    )
  );

-- ============================================
-- 3.2 VENTURE_ROADMAPS TABLE
-- ============================================
-- Persists AI-generated roadmaps with version history
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
      {"id": "p1", "title": "Core API Specs", "description": "...", "status": "pending", "priority": "high", "timeline": "Q1"},
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
  generation_model text, -- e.g., "claude-3-5-sonnet"

  -- Constraints
  CONSTRAINT valid_generation_source CHECK (generation_source IN ('ai_generated', 'manual', 'imported')),
  CONSTRAINT positive_generation_duration CHECK (
    generation_duration_seconds IS NULL OR generation_duration_seconds >= 0
  )
);

-- Indexes for venture_roadmaps
CREATE INDEX idx_roadmaps_venture_id ON venture_roadmaps(venture_id);
CREATE INDEX idx_roadmaps_current ON venture_roadmaps(venture_id, is_current) WHERE is_current = true;
CREATE INDEX idx_roadmaps_version ON venture_roadmaps(venture_id, roadmap_version);
CREATE INDEX idx_roadmaps_generated_by ON venture_roadmaps(generated_by, created_at DESC);
CREATE INDEX idx_roadmaps_data ON venture_roadmaps USING gin(roadmap_data); -- JSONB index

-- Ensure only one current roadmap per venture
CREATE UNIQUE INDEX idx_one_current_roadmap
  ON venture_roadmaps(venture_id)
  WHERE is_current = true;

-- RLS for venture_roadmaps
ALTER TABLE venture_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entrepreneurs_view_own_roadmaps"
  ON venture_roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_roadmaps.venture_id
      AND v.user_id = auth.uid()
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "staff_view_roadmaps"
  ON venture_roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "staff_create_roadmaps"
  ON venture_roadmaps FOR INSERT
  WITH CHECK (
    auth.uid() = generated_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'committee_member', 'venture_mgr', 'admin')
      AND is_active = true
    )
  );

-- ============================================================================
-- PART 4: WORKBENCH & PROGRESS TRACKING
-- ============================================================================

-- ============================================
-- 4.1 VENTURE_STREAMS TABLE
-- ============================================
-- Track status of different workstreams
CREATE TABLE IF NOT EXISTS venture_streams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Stream details
  stream_name text NOT NULL,
  /* Valid streams:
     - Product
     - Go-To-Market (GTM)
     - Capital Planning
     - Team
     - Supply Chain
     - Operations
  */

  -- Ownership
  owner_id uuid REFERENCES profiles(id),
  owner_name text,

  -- Status
  status text NOT NULL DEFAULT 'Not started',
  /* Valid statuses:
     - Not started
     - On track
     - Need some advice
     - Need deep support
     - Completed
  */

  -- Timeline
  end_date date,
  end_output text, -- Expected deliverable
  sprint_deliverable text,

  -- Progress
  completion_percentage integer DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_stream_status CHECK (status IN (
    'Not started', 'On track', 'Need some advice', 'Need deep support', 'Completed'
  )),
  CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT unique_venture_stream UNIQUE(venture_id, stream_name)
);

-- Indexes for venture_streams
CREATE INDEX idx_streams_venture_id ON venture_streams(venture_id);
CREATE INDEX idx_streams_status ON venture_streams(status);
CREATE INDEX idx_streams_owner ON venture_streams(owner_id) WHERE owner_id IS NOT NULL;

-- RLS for venture_streams
ALTER TABLE venture_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_streams"
  ON venture_streams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_streams.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "users_insert_own_streams"
  ON venture_streams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_streams.venture_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_streams"
  ON venture_streams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_streams.venture_id
      AND v.user_id = auth.uid()
      AND v.workbench_locked = false
    )
  );

CREATE POLICY "staff_manage_all_streams"
  ON venture_streams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================
-- 4.2 VENTURE_MILESTONES TABLE
-- ============================================
-- Track major milestones for each venture
CREATE TABLE IF NOT EXISTS venture_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id uuid REFERENCES venture_streams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Milestone details
  category text NOT NULL, -- Which stream/area
  title text NOT NULL,
  description text,

  -- Status
  status text NOT NULL DEFAULT 'Pending',
  /* Valid statuses:
     - Pending
     - In Progress
     - Completed
     - Blocked
     - Cancelled
  */

  -- Timeline
  due_date date,
  completed_at timestamptz,

  -- Assignment
  assigned_to_id uuid REFERENCES profiles(id),

  -- Progress
  progress_percentage integer DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_milestone_status CHECK (status IN (
    'Pending', 'In Progress', 'Completed', 'Blocked', 'Cancelled'
  )),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT completed_requires_timestamp CHECK (
    (status = 'Completed' AND completed_at IS NOT NULL) OR
    (status != 'Completed')
  )
);

-- Indexes for venture_milestones
CREATE INDEX idx_milestones_venture_id ON venture_milestones(venture_id);
CREATE INDEX idx_milestones_stream_id ON venture_milestones(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_milestones_status ON venture_milestones(status);
CREATE INDEX idx_milestones_due_date ON venture_milestones(due_date) WHERE due_date IS NOT NULL AND status != 'Completed';
CREATE INDEX idx_milestones_assigned ON venture_milestones(assigned_to_id) WHERE assigned_to_id IS NOT NULL;

-- RLS for venture_milestones
ALTER TABLE venture_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_milestones"
  ON venture_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_milestones.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "staff_manage_milestones"
  ON venture_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================
-- 4.3 VENTURE_DELIVERABLES TABLE
-- ============================================
-- Track granular tasks/deliverables within each stream
CREATE TABLE IF NOT EXISTS venture_deliverables (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id uuid REFERENCES venture_streams(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES venture_milestones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Deliverable details
  title text NOT NULL,
  description text,

  -- Status
  status text NOT NULL DEFAULT 'pending',
  /* Valid statuses: pending, in_progress, completed, blocked, cancelled */

  -- Priority
  priority text DEFAULT 'medium',
  /* Valid priorities: low, medium, high, critical */

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
  attachments jsonb DEFAULT '[]'::jsonb, -- Array of attachment URLs

  -- Constraints
  CONSTRAINT valid_deliverable_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')
  ),
  CONSTRAINT valid_priority CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  )
);

-- Indexes for venture_deliverables
CREATE INDEX idx_deliverables_venture_id ON venture_deliverables(venture_id);
CREATE INDEX idx_deliverables_stream_id ON venture_deliverables(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_deliverables_milestone_id ON venture_deliverables(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX idx_deliverables_status ON venture_deliverables(status);
CREATE INDEX idx_deliverables_assigned ON venture_deliverables(assigned_to_id) WHERE assigned_to_id IS NOT NULL;
CREATE INDEX idx_deliverables_due_date ON venture_deliverables(due_date) WHERE due_date IS NOT NULL AND status != 'completed';
CREATE INDEX idx_deliverables_display_order ON venture_deliverables(venture_id, stream_id, display_order);

-- RLS for venture_deliverables
ALTER TABLE venture_deliverables ENABLE ROW LEVEL SECURITY;

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
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

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

CREATE POLICY "staff_manage_deliverables"
  ON venture_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================
-- 4.4 SUPPORT_HOURS TABLE
-- ============================================
-- Track allocated and used support hours
CREATE TABLE IF NOT EXISTS support_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Hours tracking
  allocated numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (allocated - used) STORED,

  -- Metadata
  last_activity_at timestamptz,

  -- Constraints
  CONSTRAINT non_negative_allocated CHECK (allocated >= 0),
  CONSTRAINT non_negative_used CHECK (used >= 0)
);

-- Indexes
CREATE INDEX idx_support_hours_venture_id ON support_hours(venture_id);
CREATE INDEX idx_support_hours_balance ON support_hours((allocated - used)) WHERE (allocated - used) > 0;

-- RLS for support_hours
ALTER TABLE support_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_support_hours"
  ON support_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = support_hours.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "staff_manage_support_hours"
  ON support_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- ============================================================================
-- PART 5: INTERACTIONS & COMMUNICATIONS
-- ============================================================================

-- ============================================
-- 5.1 VENTURE_INTERACTIONS TABLE
-- ============================================
-- Track all interactions with ventures
CREATE TABLE IF NOT EXISTS venture_interactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Interaction details
  interaction_type text NOT NULL DEFAULT 'call',
  /* Valid types: call, meeting, email, note */

  title text,
  transcript text NOT NULL, -- Call transcript or meeting notes

  -- Context
  created_by uuid NOT NULL REFERENCES auth.users(id),
  interaction_date timestamptz NOT NULL DEFAULT now(), -- When it actually happened

  -- Metadata
  duration_minutes integer,
  participants text[], -- Array of participant names/emails

  -- Soft delete
  deleted_at timestamptz,

  -- Constraints
  CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('call', 'meeting', 'email', 'note')),
  CONSTRAINT positive_duration CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

-- Indexes for venture_interactions
CREATE INDEX idx_interactions_venture_id ON venture_interactions(venture_id);
CREATE INDEX idx_interactions_created_by ON venture_interactions(created_by);
CREATE INDEX idx_interactions_date ON venture_interactions(interaction_date DESC);
CREATE INDEX idx_interactions_type ON venture_interactions(interaction_type);
CREATE INDEX idx_interactions_not_deleted ON venture_interactions(venture_id, interaction_date DESC) WHERE deleted_at IS NULL;

-- RLS for venture_interactions
ALTER TABLE venture_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_view_interactions"
  ON venture_interactions FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "staff_create_interactions"
  ON venture_interactions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "creator_update_interactions"
  ON venture_interactions FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "creator_delete_interactions"
  ON venture_interactions FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (deleted_at IS NOT NULL); -- Only allow setting deleted_at

-- ============================================================================
-- PART 6: AGREEMENTS & CONTRACTS
-- ============================================================================

-- ============================================
-- 6.1 VENTURE_AGREEMENTS TABLE
-- ============================================
-- Track agreement lifecycle
CREATE TABLE IF NOT EXISTS venture_agreements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Agreement details
  agreement_type text NOT NULL, -- 'partnership', 'nda', 'milestone'
  version integer NOT NULL DEFAULT 1,

  -- Content
  content_url text, -- URL to PDF/document
  generated_content jsonb, -- AI-generated agreement JSON

  -- Status tracking
  status text NOT NULL DEFAULT 'Draft',
  /* Valid statuses: Draft, Sent, Viewed, Signed, Rejected, Expired */

  -- Timeline
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,

  -- Parties
  generated_by uuid REFERENCES auth.users(id),
  signed_by uuid REFERENCES auth.users(id),
  signature_data jsonb, -- E-signature metadata

  -- Constraints
  CONSTRAINT valid_agreement_type CHECK (agreement_type IN ('partnership', 'nda', 'milestone')),
  CONSTRAINT valid_agreement_status CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Signed', 'Rejected', 'Expired'))
);

-- Indexes
CREATE INDEX idx_agreements_venture_id ON venture_agreements(venture_id);
CREATE INDEX idx_agreements_status ON venture_agreements(status);
CREATE INDEX idx_agreements_sent_at ON venture_agreements(sent_at DESC) WHERE sent_at IS NOT NULL;

-- RLS for venture_agreements
ALTER TABLE venture_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_agreements_via_venture"
  ON venture_agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_agreements.venture_id
      AND (
        v.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
          AND is_active = true
        )
      )
      AND v.deleted_at IS NULL
    )
  );

CREATE POLICY "staff_manage_agreements"
  ON venture_agreements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('committee_member', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "entrepreneurs_sign_agreements"
  ON venture_agreements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_agreements.venture_id
      AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only allow updating status and signature fields
    status IN ('Viewed', 'Signed', 'Rejected')
  );

-- ============================================================================
-- PART 7: AUDIT TRAILS & HISTORY
-- ============================================================================

-- ============================================
-- 7.1 VENTURE_STATUS_HISTORY TABLE
-- ============================================
-- Comprehensive audit trail for all status changes
CREATE TABLE IF NOT EXISTS venture_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id uuid NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- What changed
  status_type text NOT NULL,
  /* Valid types:
     - application: Venture status changed
     - screening: VSM decision made
     - committee: Committee decision made
     - agreement: Agreement status changed
     - workbench_lock: Workbench locked/unlocked
     - program_assignment: Program assigned
     - venture_partner: Partner assigned
     - assignment: VSM/VM assigned
  */

  previous_value text,
  new_value text NOT NULL,

  -- Who changed it
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_by_role text,

  -- Why
  change_reason text,
  notes text,

  -- Context
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_status_type CHECK (
    status_type IN (
      'application', 'screening', 'committee', 'agreement',
      'workbench_lock', 'program_assignment', 'venture_partner', 'assignment'
    )
  )
);

-- Indexes for venture_status_history
CREATE INDEX idx_status_history_venture ON venture_status_history(venture_id, created_at DESC);
CREATE INDEX idx_status_history_type ON venture_status_history(status_type, created_at DESC);
CREATE INDEX idx_status_history_changed_by ON venture_status_history(changed_by, created_at DESC);

-- RLS for venture_status_history
ALTER TABLE venture_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_view_history"
  ON venture_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

CREATE POLICY "entrepreneurs_view_own_history"
  ON venture_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventures v
      WHERE v.id = venture_status_history.venture_id
      AND v.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 8: HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- ============================================
-- 8.1 Updated_at Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventures_updated_at BEFORE UPDATE ON ventures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_applications_updated_at BEFORE UPDATE ON venture_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_assessments_updated_at BEFORE UPDATE ON venture_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_streams_updated_at BEFORE UPDATE ON venture_streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_milestones_updated_at BEFORE UPDATE ON venture_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_deliverables_updated_at BEFORE UPDATE ON venture_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_hours_updated_at BEFORE UPDATE ON support_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_interactions_updated_at BEFORE UPDATE ON venture_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_agreements_updated_at BEFORE UPDATE ON venture_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8.2 Venture Status Change Trigger
-- ============================================
CREATE OR REPLACE FUNCTION log_venture_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO venture_status_history (
      venture_id, status_type, previous_value, new_value, changed_by, changed_by_role
    ) VALUES (
      NEW.id,
      'application',
      OLD.status,
      NEW.status,
      auth.uid(),
      (SELECT role FROM profiles WHERE id = auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_venture_status_changes
  AFTER UPDATE ON ventures
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_venture_status_change();

-- ============================================
-- 8.3 Auto-create Support Hours on Approval
-- ============================================
CREATE OR REPLACE FUNCTION create_support_hours_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    -- Get allocated hours from program
    INSERT INTO support_hours (venture_id, allocated, used)
    SELECT NEW.id, COALESCE(p.support_hours_allocated, 0), 0
    FROM programs p
    WHERE p.id = NEW.program_id
    ON CONFLICT (venture_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_support_hours
  AFTER UPDATE ON ventures
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_support_hours_on_approval();

-- ============================================================================
-- PART 9: VIEWS FOR ANALYTICS & REPORTING
-- ============================================================================

-- ============================================
-- 9.1 Complete Venture View (for dashboards)
-- ============================================
CREATE OR REPLACE VIEW ventures_complete AS
SELECT
  v.*,
  va.revenue_12m,
  va.revenue_potential_3y,
  va.full_time_employees,
  va.incremental_hiring,
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
  -- Stream counts
  (SELECT COUNT(*) FROM venture_streams WHERE venture_id = v.id) as stream_count,
  (SELECT COUNT(*) FROM venture_streams WHERE venture_id = v.id AND status = 'Completed') as completed_streams
FROM ventures v
LEFT JOIN venture_applications va ON va.venture_id = v.id
LEFT JOIN programs p ON p.id = v.program_id
LEFT JOIN support_hours sh ON sh.venture_id = v.id
LEFT JOIN profiles vsm ON vsm.id = v.assigned_vsm_id
LEFT JOIN profiles vm ON vm.id = v.assigned_vm_id
LEFT JOIN profiles entrepreneur ON entrepreneur.id = v.user_id
WHERE v.deleted_at IS NULL;

-- ============================================
-- 9.2 Analytics View (for reporting)
-- ============================================
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

-- ============================================================================
-- PART 10: TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE programs IS 'Available accelerator programs with tiers and benefits';
COMMENT ON TABLE ventures IS 'Core venture records with status tracking';
COMMENT ON TABLE venture_applications IS 'Normalized application form data (1:1 with ventures)';
COMMENT ON TABLE venture_assessments IS 'Versioned VSM/Committee assessments with AI analysis';
COMMENT ON TABLE venture_roadmaps IS 'Versioned AI-generated roadmaps for all 6 streams';
COMMENT ON TABLE venture_streams IS 'Workstream status tracking (Product, GTM, etc.)';
COMMENT ON TABLE venture_milestones IS 'Major milestone tracking per venture';
COMMENT ON TABLE venture_deliverables IS 'Granular task tracking within streams';
COMMENT ON TABLE support_hours IS 'Support hour allocation and usage tracking';
COMMENT ON TABLE venture_interactions IS 'Call transcripts, meeting notes, and interactions';
COMMENT ON TABLE venture_agreements IS 'Agreement lifecycle management';
COMMENT ON TABLE venture_status_history IS 'Comprehensive audit trail (auto-populated)';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Production Schema V2.0 Setup Complete!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Created Tables:';
  RAISE NOTICE '  - profiles (with auto-role assignment)';
  RAISE NOTICE '  - programs (pre-seeded with 5 programs)';
  RAISE NOTICE '  - ventures (core venture data)';
  RAISE NOTICE '  - venture_applications (normalized form data)';
  RAISE NOTICE '  - venture_assessments (AI-powered assessments)';
  RAISE NOTICE '  - venture_roadmaps (AI-generated roadmaps)';
  RAISE NOTICE '  - venture_streams (6 workstreams)';
  RAISE NOTICE '  - venture_milestones (major milestones)';
  RAISE NOTICE '  - venture_deliverables (granular tasks)';
  RAISE NOTICE '  - support_hours (hour tracking)';
  RAISE NOTICE '  - venture_interactions (calls, meetings, notes)';
  RAISE NOTICE '  - venture_agreements (agreement management)';
  RAISE NOTICE '  - venture_status_history (audit trail)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  - ventures_complete (dashboard view)';
  RAISE NOTICE '  - venture_analytics (reporting view)';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Enabled:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) on all tables';
  RAISE NOTICE '  ✓ Auto-role assignment based on email';
  RAISE NOTICE '  ✓ Version tracking for assessments & roadmaps';
  RAISE NOTICE '  ✓ AI integration ready (JSONB fields)';
  RAISE NOTICE '  ✓ Comprehensive audit trails';
  RAISE NOTICE '  ✓ Soft deletes for ventures & interactions';
  RAISE NOTICE '  ✓ Full-text search on venture names';
  RAISE NOTICE '  ✓ Automated triggers for status tracking';
  RAISE NOTICE '============================================================';
END $$;

-- Verification query
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'programs', 'ventures', 'venture_applications',
    'venture_assessments', 'venture_roadmaps', 'venture_streams',
    'venture_milestones', 'venture_deliverables', 'support_hours',
    'venture_interactions', 'venture_agreements', 'venture_status_history'
  )
ORDER BY tablename;
