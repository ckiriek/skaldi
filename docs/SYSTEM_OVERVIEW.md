# Asetria Writer - System Overview

Complete technical documentation for the Asetria Writer platform.

**Version:** 1.0.0  
**Last Updated:** 2025-11-11  
**Status:** 85% Complete (Pilot Ready)

---

## Executive Summary

Asetria Writer is a clinical AI SaaS platform for automated regulatory document generation with full audit trail and compliance tracking.

### Key Features

- Workflow Orchestration - State machine-based document generation
- Version Control - Full version history with diff tracking
- Evidence Locker - Source tracking with [EV-XX] references
- Error Handling - Standardized error format across all agents
- Real-time Updates - Live progress monitoring via Supabase Realtime
- Audit Trail - ICH E6(R2) compliant logging

### Technology Stack

- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, TypeScript
- Database: Supabase (PostgreSQL)
- AI: OpenAI GPT-4, Anthropic Claude
- Deployment: Vercel (frontend), Supabase (backend)

---

## System Statistics

- 9 Database Tables
- 65+ Indexes
- 10 Helper Functions
- 16 API Endpoints
- 6 Agents
- 3 UI Components
- ~10,000 Lines of Code
- Full TypeScript Coverage
- ICH E6(R2) Compliant

---

## Database Schema

### Core Tables

1. workflow_executions - Workflow state tracking
2. workflow_steps - Individual step execution
3. workflow_events - Audit trail
4. document_versions - Version history
5. version_diffs - JSON Patch diffs
6. review_comments - Threaded comments
7. evidence_sources_v2 - Evidence tracking
8. evidence_links - Evidence-document links
9. workflow_definitions - Workflow templates

---

## API Endpoints (16)

### Workflow (5)
- POST /api/v1/workflow - Create execution
- GET /api/v1/workflow - Get status
- POST /api/v1/workflow/control - Control execution
- POST /api/v1/workflow/execute - Execute workflow
- POST /api/v1/workflow/start - Create and start

### Versions (6)
- POST /api/v1/versions - Create version
- GET /api/v1/versions - List versions
- GET /api/v1/versions/[id] - Get version
- PATCH /api/v1/versions/[id] - Update version
- DELETE /api/v1/versions/[id] - Archive version
- POST /api/v1/versions/[id]/approve - Approve version

### Evidence (5)
- POST /api/v1/evidence - Create evidence
- GET /api/v1/evidence - List/search evidence
- GET /api/v1/evidence/[ev_id] - Get by EV-ID
- PATCH /api/v1/evidence/[ev_id] - Update evidence
- POST /api/v1/evidence/[ev_id]/verify - Verify evidence

---

## Agents (6)

1. RegData - Enrichment (10 min timeout)
2. Composer - Structure generation (5 min)
3. Writer - Content generation (30 min) - TODO
4. Validator - QC validation (5 min)
5. Assembler - Final assembly (5 min)
6. Export - PDF/DOCX export (5 min)

---

## Workflow States (15)

created → enriching → enriched → composing → composed → writing → written → validating → validated → assembling → assembled → exporting → completed

Terminal: completed, failed, paused

---

## Security & Compliance

- Supabase Auth with JWT
- Row Level Security (RLS)
- Full audit trail
- ICH E6(R2) compliant
- Encrypted at rest and in transit

---

## Deployment

- Frontend: Vercel
- Backend: Supabase
- AI: OpenAI + Anthropic
- Monitoring: Vercel Analytics + Supabase Dashboard

---

## Roadmap

### Completed (85%)
- Database schema
- Workflow orchestration
- Version control
- Evidence tracking
- Error handling
- API layer
- Core UI components

### In Progress (15%)
- Writer Agent implementation
- Version History UI
- Comment Threads UI
- Integration testing

### Planned
- Statistics Module (Python FastAPI)
- Validator Profiles
- CI/CD Pipeline
- Production Monitoring

---

## Quick Start

1. Create workflow:
```typescript
POST /api/v1/workflow/start
{
  "project_id": "uuid",
  "document_type": "ib"
}
```

2. Monitor progress:
```tsx
<WorkflowStatus executionId="uuid" />
```

3. View evidence:
```tsx
<EvidenceViewer evId="EV-001" />
```

4. Dashboard:
```tsx
<DocumentsDashboard projectId="uuid" />
```

---

## Documentation

- ERROR_HANDLING.md - Error handling guide
- WORKFLOW_EXECUTOR.md - Workflow execution guide
- SYSTEM_OVERVIEW.md - This document

---

For more information, see individual documentation files in /docs.
