# Wadhwani Accelerate — Application Overview

Wadhwani Accelerate is an end-to-end venture acceleration platform built for the Wadhwani Foundation's Assisted Growth Program. It manages the complete lifecycle of venture applications — from public intake through screening, panel evaluation, VP/VM assignment, and active program mentorship. The platform serves six distinct user roles (Entrepreneur, Screening Manager, Panel Member, Ops Manager, VP/VM, Admin), each with a tailored dashboard providing role-specific views, actions, and AI-powered insights.

The venture pipeline flows through defined statuses: **Submitted → Under Review → Panel Review → Assign VP/VM → With VP/VM → Active → Completed**, with automated transitions and background tasks (e.g., roadmap auto-generation on VP/VM assignment, LiftOff AI email on self-serve recommendation).

## Architecture

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router with role-based layouts
- **Backend**: Node.js + Express REST API with JWT auth middleware and Zod validation
- **Database**: Supabase (PostgreSQL) with row-level security, soft-delete, versioned roadmaps, and trigger-based audit trails
- **AI**: Anthropic Claude API (Sonnet 4.5) for SCALE scorecards, panel insights, and journey roadmap generation
- **Email**: Azure Communication Services for transactional emails (welcome, panel invitation, selection, self-serve)
- **Storage**: Supabase Storage for corporate presentation uploads
- **Deployment**: Jenkins (primary), Netlify (frontend), Render (backend), two Git remotes for parallel CI/CD
