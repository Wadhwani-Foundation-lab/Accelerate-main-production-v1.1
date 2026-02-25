# Database Schema Visual Diagram

## 🗺️ Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WADHWANI ACCELERATE DATABASE SCHEMA                      │
│                              Production V2.0                                 │
└─────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────┐
│      auth.users          │  (Supabase Auth)
│  ┌────────────────────┐  │
│  │ id (PK)            │  │
│  │ email              │  │
│  │ created_at         │  │
│  └────────────────────┘  │
└──────────┬───────────────┘
           │
           │ 1:1
           ▼
┌──────────────────────────┐
│       profiles           │  USER MANAGEMENT
│  ┌────────────────────┐  │
│  │ id (PK, FK)        │  │─────┐
│  │ full_name          │  │     │
│  │ email              │  │     │
│  │ role ◄──────────── │  │     │ Auto-assigned based on email:
│  │ is_active          │  │     │ • admin@* → admin
│  │ preferences        │  │     │ • committee@* → committee_member
│  │ last_login_at      │  │     │ • vsm@* → success_mgr
│  └────────────────────┘  │     │ • *@* → entrepreneur
└───┬──────────────────────┘     │
    │                            │
    │ 1:N                        │
    ▼                            │
┌──────────────────────────┐    │
│       programs           │  PROGRAM CATALOG
│  ┌────────────────────┐  │    │
│  │ id (PK)            │──┼────┼──┐
│  │ name (UNIQUE)      │  │    │  │
│  │ tier               │  │    │  │ Pre-seeded:
│  │ support_hours_     │  │    │  │ 1. Accelerate Prime (tier 1, 120h)
│  │   allocated        │  │    │  │ 2. Accelerate Core (tier 2, 80h)
│  │ duration_months    │  │    │  │ 3. Accelerate Select (tier 3, 60h)
│  │ is_active          │  │    │  │ 4. Ignite (tier 4, 40h)
│  └────────────────────┘  │    │  │ 5. Liftoff (tier 5, 30h)
└──────────────────────────┘    │  │
                                │  │
    ┌───────────────────────────┘  │
    │                              │
    │ N:1                          │
    ▼                              │
┌──────────────────────────┐      │
│       ventures           │  VENTURE CORE                 ┌─────────────────┐
│  ┌────────────────────┐  │                               │  STATUS VALUES: │
│  │ id (PK)            │──┼───────────────┐               ├─────────────────┤
│  │ user_id (FK) ◄─────│──┼───────────┐   │               │ • Draft         │
│  │ program_id (FK) ◄──│──┼─────┐     │   │               │ • Submitted     │
│  │ name               │  │     │     │   │               │ • Under Review  │
│  │ founder_name       │  │     │     │   │               │ • Committee     │
│  │ city, location     │  │     │     │   │               │   Review        │
│  │ status ◄───────────│──┼─────┼─────┼───┼──────────────►│ • Approved      │
│  │ assigned_vsm_id ◄──│──┼──┐  │     │   │               │ • Agreement     │
│  │ assigned_vm_id ◄───│──┼──┼──┼─────┼───┼──────┐        │   Sent          │
│  │ venture_partner    │  │  │  │     │   │      │        │ • Agreement     │
│  │ workbench_locked   │  │  │  │     │   │      │        │   Signed        │
│  │ deleted_at         │  │  │  │     │   │      │        │ • Active        │
│  └────────────────────┘  │  │  │     │   │      │        │ • Completed     │
└──┬───────────────────────┘  │  │     │   │      │        │ • Rejected      │
   │                          │  │     │   │      │        │ • Withdrawn     │
   │ 1:1                      │  │     │   │      │        └─────────────────┘
   ▼                          │  │     │   │      │
┌──────────────────────────┐  │  │     │   │      │
│  venture_applications    │  APPLICATION DATA (normalized from form)
│  ┌────────────────────┐  │  │  │     │   │      │
│  │ id (PK)            │  │  │  │     │   │      │
│  │ venture_id (FK,    │  │  │  │     │   │      │
│  │   UNIQUE)          │  │  │  │     │   │      │
│  │ ─────────────────  │  │  │  │     │   │      │
│  │ STEP 1: BUSINESS   │  │  │  │     │   │      │
│  │ what_do_you_sell   │  │  │  │     │   │      │
│  │ who_do_you_sell_to │  │  │  │     │   │      │
│  │ which_regions      │  │  │  │     │   │      │
│  │ company_type       │  │  │  │     │   │      │
│  │ ─────────────────  │  │  │  │     │   │      │
│  │ STEP 2: GROWTH     │  │  │  │     │   │      │
│  │ revenue_12m        │  │  │  │     │   │      │
│  │ revenue_potential  │  │  │  │     │   │      │
│  │   _3y              │  │  │  │     │   │      │
│  │ full_time_         │  │  │  │     │   │      │
│  │   employees        │  │  │  │     │   │      │
│  │ growth_focus[]     │  │  │  │     │   │      │
│  │ focus_product      │  │  │  │     │   │      │
│  │ ─────────────────  │  │  │  │     │   │      │
│  │ STEP 3: SUPPORT    │  │  │  │     │   │      │
│  │ support_request    │  │  │  │     │   │      │
│  │ blockers           │  │  │  │     │   │      │
│  └────────────────────┘  │  │  │     │   │      │
└──────────────────────────┘  │  │     │   │      │
                              │  │     │   │      │
   ┌──────────────────────────┘  │     │   │      │
   │ N:1                         │     │   │      │
   ▼                             │     │   │      │
┌──────────────────────────┐     │     │   │      │
│  venture_assessments     │  AI-POWERED ASSESSMENTS (versioned)
│  ┌────────────────────┐  │     │     │   │      │
│  │ id (PK)            │  │     │     │   │      │
│  │ venture_id (FK)    │  │     │     │   │      │
│  │ assessed_by (FK) ◄─│──┼─────┘     │   │      │
│  │ assessor_role      │  │           │   │      │
│  │ ─────────────────  │  │           │   │      │
│  │ assessment_type    │  │  Types:   │   │      │
│  │   • screening      │  │  VSM      │   │      │
│  │   • committee      │  │  Committee│   │      │
│  │ ─────────────────  │  │           │   │      │
│  │ VERSION CONTROL:   │  │           │   │      │
│  │ assessment_version │  │           │   │      │
│  │ supersedes_id (FK) │  │  ──┐      │   │      │
│  │ is_current ◄───────│──┼────┼──────┼───┼──────┼──── Only 1 current
│  │ ─────────────────  │  │    │      │   │      │     per (venture, type)
│  │ notes              │  │    │      │   │      │
│  │ internal_comments  │  │    │      │   │      │
│  │ ─────────────────  │  │    │      │   │      │
│  │ AI ANALYSIS JSONB: │  │    │      │   │      │
│  │ {                  │  │    │      │   │      │
│  │   strengths: [],   │  │    │      │   │      │
│  │   risks: [],       │  │    │      │   │      │
│  │   questions: [],   │  │    │      │   │      │
│  │   overall_score: # │  │    │      │   │      │
│  │   model_used: ""   │  │    │      │   │      │
│  │ }                  │  │    │      │   │      │
│  │ ─────────────────  │  │    │      │   │      │
│  │ program_           │  │    │      │   │      │
│  │   recommendation   │  │    │      │   │      │
│  │ decision           │  │    │      │   │      │
│  └────────────────────┘  │    │      │   │      │
└──────────────────────────┘    │      │   │      │
                                │      │   │      │
   ┌────────────────────────────┘      │   │      │
   │ N:1                               │   │      │
   ▼                                   │   │      │
┌──────────────────────────┐           │   │      │
│   venture_roadmaps       │  AI-GENERATED ROADMAPS (versioned)
│  ┌────────────────────┐  │           │   │      │
│  │ id (PK)            │  │           │   │      │
│  │ venture_id (FK)    │  │           │   │      │
│  │ generated_by (FK)◄─│──┼───────────┘   │      │
│  │ based_on_          │  │               │      │
│  │   assessment_id    │──┼──┐            │      │
│  │ ─────────────────  │  │  │            │      │
│  │ VERSION CONTROL:   │  │  │            │      │
│  │ roadmap_version    │  │  │            │      │
│  │ supersedes_id (FK) │  │  │            │      │
│  │ is_current         │  │  │            │      │
│  │ ─────────────────  │  │  │            │      │
│  │ ROADMAP DATA JSONB:│  │  │            │      │
│  │ {                  │  │  │            │      │
│  │   product: [{      │  │  │            │      │
│  │     id, title,     │  │  │            │      │
│  │     description,   │  │  │            │      │
│  │     status,        │  │  │            │      │
│  │     priority       │  │  │            │      │
│  │   }],              │  │  │            │      │
│  │   gtm: [...],      │  │  │            │      │
│  │   funding: [...],  │  │  │            │      │
│  │   supply_chain: [] │  │  │            │      │
│  │   operations: [],  │  │  │            │      │
│  │   team: []         │  │  │            │      │
│  │ }                  │  │  │            │      │
│  │ ─────────────────  │  │  │            │      │
│  │ generation_source: │  │  │            │      │
│  │   • ai_generated   │  │  │            │      │
│  │   • manual         │  │  │            │      │
│  │   • imported       │  │  │            │      │
│  │ generation_model   │  │  │            │      │
│  └────────────────────┘  │  │            │      │
└──────────────────────────┘  │            │      │
                              │            │      │
   ┌──────────────────────────┴────────────┘      │
   │ N:1                                          │
   ▼                                              │
┌──────────────────────────┐                      │
│   venture_streams        │  WORKSTREAM TRACKING (6 streams)
│  ┌────────────────────┐  │                      │
│  │ id (PK)            │  │                      │
│  │ venture_id (FK)    │  │                      │
│  │ stream_name ◄──────│──┼──┐                   │
│  │ ─────────────────  │  │  │ Standard Streams: │
│  │ • Product          │  │  │ 1. Product        │
│  │ • Go-To-Market     │  │  │ 2. Go-To-Market   │
│  │ • Capital Planning │  │  │ 3. Capital Plan.  │
│  │ • Team             │  │  │ 4. Team           │
│  │ • Supply Chain     │  │  │ 5. Supply Chain   │
│  │ • Operations       │  │  │ 6. Operations     │
│  │ ─────────────────  │  │  │                   │
│  │ owner_id (FK) ◄────│──┼──┼───────────────────┤
│  │ status ◄───────────│──┼──┼───────────────────┼──┐
│  │ end_date           │  │  │                   │  │ Status Values:
│  │ completion_%       │  │  │                   │  │ • Not started
│  └────────────────────┘  │  │                   │  │ • On track
└──┬───────────────────────┘  │                   │  │ • Need some advice
   │                          │                   │  │ • Need deep support
   │ 1:N                      │                   │  │ • Completed
   ├──────────────────────────┘                   │  │
   │                                              │  │
   ▼                                              │  │
┌──────────────────────────┐                      │  │
│   venture_milestones     │  MAJOR MILESTONES    │  │
│  ┌────────────────────┐  │                      │  │
│  │ id (PK)            │  │                      │  │
│  │ venture_id (FK)    │  │                      │  │
│  │ stream_id (FK)     │  │                      │  │
│  │ title              │  │                      │  │
│  │ description        │  │                      │  │
│  │ status             │  │                      │  │
│  │ due_date           │  │                      │  │
│  │ completed_at       │  │                      │  │
│  │ assigned_to_id ◄───│──┼──────────────────────┤  │
│  │ progress_%         │  │                      │  │
│  └────────────────────┘  │                      │  │
└──┬───────────────────────┘                      │  │
   │                                              │  │
   │ 1:N                                          │  │
   ▼                                              │  │
┌──────────────────────────┐                      │  │
│  venture_deliverables    │  GRANULAR TASKS      │  │
│  ┌────────────────────┐  │                      │  │
│  │ id (PK)            │  │                      │  │
│  │ venture_id (FK)    │  │                      │  │
│  │ stream_id (FK)     │  │                      │  │
│  │ milestone_id (FK)  │  │                      │  │
│  │ title              │  │                      │  │
│  │ description        │  │                      │  │
│  │ status             │  │                      │  │
│  │ priority           │  │                      │  │
│  │ assigned_to_id ◄───│──┼──────────────────────┤  │
│  │ due_date           │  │                      │  │
│  │ roadmap_key ───────│──┼──┐ Links to AI       │  │
│  │ display_order      │  │  │ roadmap items     │  │
│  │ attachments (JSONB)│  │  │                   │  │
│  └────────────────────┘  │  │                   │  │
└──────────────────────────┘  │                   │  │
                              │                   │  │
   ┌──────────────────────────┴───────────────────┘  │
   │ 1:1                                             │
   ▼                                                 │
┌──────────────────────────┐                         │
│     support_hours        │  HOUR TRACKING          │
│  ┌────────────────────┐  │                         │
│  │ id (PK)            │  │                         │
│  │ venture_id (FK,    │  │                         │
│  │   UNIQUE)          │  │                         │
│  │ allocated          │  │                         │
│  │ used               │  │                         │
│  │ balance (computed) │  │  = allocated - used     │
│  │ last_activity_at   │  │                         │
│  └────────────────────┘  │                         │
└──────────────────────────┘  ◄─────────────────────┘
   ▲ Auto-created when                      Auto-populated from
   │ venture approved                        program.support_hours_allocated
   │
   │
   │ N:1
   ▼
┌──────────────────────────┐
│  venture_interactions    │  CALLS, MEETINGS, NOTES
│  ┌────────────────────┐  │
│  │ id (PK)            │  │
│  │ venture_id (FK)    │  │
│  │ created_by (FK) ◄──│──┼──┐
│  │ interaction_type   │  │  │ Types:
│  │   • call           │  │  │ • call
│  │   • meeting        │  │  │ • meeting
│  │   • email          │  │  │ • email
│  │   • note           │  │  │ • note
│  │ title              │  │  │
│  │ transcript (TEXT)  │  │  │ Call transcript or notes
│  │ interaction_date   │  │  │
│  │ duration_minutes   │  │  │
│  │ participants[]     │  │  │ Array of names/emails
│  │ deleted_at         │  │  │ Soft delete
│  └────────────────────┘  │  │
└──────────────────────────┘  │
                              │
   ┌──────────────────────────┘
   │ N:1
   ▼
┌──────────────────────────┐
│   venture_agreements     │  AGREEMENT LIFECYCLE
│  ┌────────────────────┐  │
│  │ id (PK)            │  │
│  │ venture_id (FK)    │  │
│  │ generated_by (FK)◄─│──┼──┐
│  │ signed_by (FK) ◄───│──┼──┤
│  │ ─────────────────  │  │  │
│  │ agreement_type:    │  │  │
│  │   • partnership    │  │  │
│  │   • nda            │  │  │
│  │   • milestone      │  │  │
│  │ ─────────────────  │  │  │
│  │ status ◄───────────│──┼──┼──┐
│  │   • Draft          │  │  │  │ Lifecycle:
│  │   • Sent           │  │  │  │ Draft → Sent → Viewed →
│  │   • Viewed         │  │  │  │ Signed
│  │   • Signed         │  │  │  │    ↓
│  │   • Rejected       │  │  │  │ Rejected/Expired
│  │   • Expired        │  │  │  │
│  │ ─────────────────  │  │  │  │
│  │ content_url        │  │  │  │
│  │ generated_content  │  │  │  │
│  │   (JSONB)          │  │  │  │
│  │ sent_at            │  │  │  │
│  │ viewed_at          │  │  │  │
│  │ signed_at          │  │  │  │
│  │ signature_data     │  │  │  │
│  │   (JSONB)          │  │  │  │
│  └────────────────────┘  │  │  │
└──────────────────────────┘  │  │
                              │  │
   ┌──────────────────────────┴──┘
   │ N:1
   ▼
┌──────────────────────────┐
│ venture_status_history   │  COMPREHENSIVE AUDIT TRAIL
│  ┌────────────────────┐  │
│  │ id (PK)            │  │
│  │ venture_id (FK)    │  │
│  │ changed_by (FK) ◄──│──┼──┘
│  │ changed_by_role    │  │
│  │ ─────────────────  │  │
│  │ status_type:       │  │
│  │   • application    │  │  Venture status changes
│  │   • screening      │  │  VSM decision
│  │   • committee      │  │  Committee decision
│  │   • agreement      │  │  Agreement status
│  │   • workbench_lock │  │  Lock/unlock events
│  │   • program_       │  │  Program assignment
│  │     assignment     │  │  Partner assignment
│  │   • venture_       │  │  VSM/VM assignment
│  │     partner        │  │
│  │   • assignment     │  │
│  │ ─────────────────  │  │
│  │ previous_value     │  │
│  │ new_value          │  │
│  │ change_reason      │  │
│  │ notes              │  │
│  │ metadata (JSONB)   │  │
│  │ created_at         │  │
│  └────────────────────┘  │
└──────────────────────────┘
   ▲ Auto-populated by triggers


┌─────────────────────────────────────────────────────────────┐
│                      ANALYTICAL VIEWS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ventures_complete (for dashboards)                          │
│  ├─ Joins all related tables                                │
│  ├─ Includes application data, assessment, streams          │
│  ├─ Denormalizes for fast queries                           │
│  └─ Used by: VSM Dashboard, Committee Dashboard            │
│                                                              │
│  venture_analytics (for reporting)                           │
│  ├─ Key metrics (days in status, completion %)              │
│  ├─ Aggregated data                                         │
│  └─ Used by: Analytics Dashboard, Reports                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Relationships

1. **User → Venture**: One entrepreneur can have many ventures
2. **Venture → Application**: Each venture has exactly one application (1:1)
3. **Venture → Assessments**: Each venture can have multiple assessments (versioned)
4. **Venture → Roadmaps**: Each venture can have multiple roadmaps (versioned)
5. **Venture → Streams**: Each venture has 6 streams (1:N)
6. **Stream → Milestones**: Each stream has multiple milestones (1:N)
7. **Milestone → Deliverables**: Each milestone has multiple deliverables (1:N)
8. **Venture → Support Hours**: Each venture has one support hours record (1:1)
9. **Venture → Interactions**: Each venture has multiple interactions (1:N)
10. **Venture → Agreements**: Each venture can have multiple agreements (1:N)
11. **Venture → History**: Each venture has comprehensive audit trail (1:N)

## 🎨 Color Legend

```
┌─────────────┐
│ BLUE boxes  │ = Core tables (ventures, profiles)
├─────────────┤
│ GREEN boxes │ = AI integration (assessments, roadmaps)
├─────────────┤
│ YELLOW boxes│ = Workbench tracking (streams, milestones)
├─────────────┤
│ PURPLE boxes│ = Communication (interactions, agreements)
├─────────────┤
│ RED boxes   │ = Audit & history
└─────────────┘
```

## 📊 Data Flow: Entrepreneur Journey

```
1. SIGNUP
   └─> Create profile (auto-role)

2. CREATE APPLICATION
   ├─> Create venture (status: Draft)
   └─> Create venture_application

3. SUBMIT
   ├─> Update venture (status: Submitted)
   ├─> Create 6 venture_streams
   └─> Log in status_history

4. VSM REVIEW
   ├─> Create venture_interaction (call notes)
   ├─> Generate AI insights
   ├─> Create venture_assessment
   └─> Update venture (status: Committee Review)

5. COMMITTEE REVIEW
   ├─> Review assessment + AI analysis
   ├─> Make decision
   └─> Update venture (status: Approved/Rejected)

6. AGREEMENT
   ├─> Create venture_agreement
   ├─> Entrepreneur signs
   └─> Update venture (status: Agreement Signed)

7. ACTIVATE
   ├─> Update venture (status: Active)
   ├─> Unlock workbench
   ├─> Create support_hours
   └─> Generate venture_roadmap (AI)

8. TRACKING
   ├─> Update venture_streams
   ├─> Complete venture_deliverables
   ├─> Log venture_interactions
   └─> Track support_hours

9. COMPLETE
   └─> Update venture (status: Completed)
```

---

**Legend:**
- (PK) = Primary Key
- (FK) = Foreign Key
- (UNIQUE) = Unique constraint
- [] = Array type
- JSONB = JSON Binary (flexible structured data)
- ◄─ = Foreign key relationship direction
