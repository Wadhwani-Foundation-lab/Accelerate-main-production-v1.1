# Documentation

This directory contains comprehensive documentation for the Wadhwani Ventures Platform.

## Schema Redesign Documentation

### [Database Schema Redesign Plan](./DATABASE_SCHEMA_REDESIGN.md)
Complete implementation plan for reorganizing the database schema for better scalability, versioning, and audit trails.

**Key Documents:**
- **Implementation Plan**: [DATABASE_SCHEMA_REDESIGN.md](./DATABASE_SCHEMA_REDESIGN.md)
- **Migration Scripts**: [scripts/migrations/](../scripts/migrations/)
- **Migration Guide**: [scripts/migrations/README.md](../scripts/migrations/README.md)

## Quick Links

### Database Migrations
- [001_add_new_tables.sql](../scripts/migrations/001_add_new_tables.sql) - Creates 5 new core tables
- [002_add_venture_columns.sql](../scripts/migrations/002_add_venture_columns.sql) - Adds new columns to ventures
- [003_add_triggers.sql](../scripts/migrations/003_add_triggers.sql) - Versioning and audit triggers
- [Migration README](../scripts/migrations/README.md) - How to execute migrations

### Architecture Overview

#### Current Schema (Before Migration)
- **ventures** - Monolithic table (33+ columns, 4 JSONB fields)
- **venture_streams** - Stream status tracking
- **venture_interactions** - Call/meeting tracking
- **profiles** - User roles and metadata

#### New Schema (After Migration)
- **ventures** - Core identity (slimmed to ~15 columns)
- **venture_applications** - Application form data (normalized)
- **venture_assessments** - Versioned VSM/Committee assessments
- **venture_roadmaps** - Versioned AI-generated roadmaps
- **venture_deliverables** - Granular task tracking
- **venture_status_history** - Comprehensive audit trail
- **venture_streams** - Enhanced with deliverable links
- **venture_interactions** - Enhanced with better indexes

## Key Improvements

| Area | Before | After | Benefit |
|------|--------|-------|---------|
| **Data Organization** | 33+ columns in 1 table | 10 normalized tables | Better maintainability |
| **Status Tracking** | 1 confusing field | 4 clear workflows | Clarity |
| **Roadmap Persistence** | Lost on refresh | Full version history | Never lose data |
| **Query Performance** | JSONB scans | Indexed columns | 10x faster |
| **Audit Trail** | Basic logging | Automatic comprehensive | Compliance ready |
| **Concurrent Updates** | Last-write-wins | Optimistic locking | Data integrity |

## Migration Status

- ✅ **Phase 1**: Schema addition (SQL files ready)
- ⏳ **Phase 2**: Data migration (pending)
- ⏳ **Phase 3**: Application updates (pending)
- ⏳ **Phase 4**: Cleanup deprecated columns (pending)

## Next Steps

1. **Review & Adjust** - Review migration scripts and make necessary changes
2. **Test Locally** - Run migrations on local/staging database
3. **Validate** - Run verification queries
4. **Data Migration** - Create and test data migration script
5. **Application Updates** - Update code to use new schema
6. **Deploy** - Roll out to production with rollback plan ready

## Contact & Support

For questions about the schema redesign:
- Review the implementation plan: [DATABASE_SCHEMA_REDESIGN.md](./DATABASE_SCHEMA_REDESIGN.md)
- Check migration scripts: [scripts/migrations/](../scripts/migrations/)
- Refer to verification queries in [Migration README](../scripts/migrations/README.md)
