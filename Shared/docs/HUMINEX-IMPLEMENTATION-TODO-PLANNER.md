# HUMINEX Implementation TODO Planner

This document is the execution planner for moving HUMINEX from current frontend-first state to a full enterprise-grade platform.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `BLOCKED` Needs decision/inputs

## Phase 0: Foundation Decisions

- [x] Finalize target architecture style for backend modular monolith in .NET 8.
- [ ] Define module boundaries:
  - Workforce
  - Payroll
  - Recruitment + ATS
  - Interview + Agentic AI
  - Finance
  - Compliance
  - Identity/RBAC
- [x] Define tenant model (single DB multi-tenant or schema-per-tenant).
- [ ] Define environment strategy:
  - Dev
  - QA/Staging
  - Prod
- [ ] Approve SLO targets:
  - API latency
  - Uptime
  - Error budget

## Phase 1: Backend Core (.NET Core API)

- [x] Create solution structure:
  - `src/BuildingBlocks`
  - `src/Modules/*`
  - `src/API`
  - `src/Infrastructure`
  - `tests/*`
- [x] Implement clean architecture baseline:
  - Domain
  - Application
  - Infrastructure
  - API
- [x] Add PostgreSQL persistence using EF Core + Dapper where needed.
- [~] Implement migration strategy from current legacy schema.
- [x] Create API versioning strategy (`/api/v1`).
- [x] Introduce idempotency keys for sensitive endpoints (payroll, finance approvals).

## Phase 2: Security, RBAC, Hierarchy

- [~] Implement hierarchical org model (Founder/CEO/CTO... to junior employee).
- [ ] Implement manager chain + downstream scope checks.
- [ ] Implement policy engine for:
  - Employee self-view only
  - Manager subtree view
  - HR and Admin expanded scope
  - Financial access restrictions
- [ ] Add security event when unauthorized financial access is attempted.
- [ ] Add email notification pipeline for danger alerts to admin/security inbox.
- [ ] Add audit logs for:
  - Promotions
  - Role changes
  - Sensitive data reads

## Phase 3: DevOps, Azure, and Release Strategy

- [ ] Provision Azure landing zone:
  - Resource groups
  - Networking
  - Managed identities
  - Key Vault
- [ ] Setup AKS cluster(s) with namespace strategy per environment.
- [ ] Setup container registry (ACR) and image signing policy.
- [x] Setup GitHub Actions CI:
  - Build
  - Test
  - API contract checks
  - Security scan
  - SBOM generation
- [ ] Setup GitHub Actions CD:
  - Dev deploy
  - Staging deploy
  - Prod deploy with approvals
- [ ] Implement canary deployment with traffic splitting on AKS.
- [ ] Implement feature toggle strategy:
  - Release toggles
  - Ops toggles
  - Experiment toggles
- [ ] Add rollback automation and health-gate deployment checks.

## Phase 4: Observability, APM, and Reliability

- [ ] Structured logging with correlation IDs.
- [ ] Centralized logs pipeline (Azure Monitor / Log Analytics).
- [ ] Distributed tracing with OpenTelemetry.
- [ ] Metrics dashboard for API, DB, queue, and interview sessions.
- [ ] Alerting runbooks:
  - High latency
  - Error spike
  - Failed deployment
  - Security danger alerts
- [ ] Performance test baseline for payroll and concurrent interview sessions.

## Phase 5: Agentic Interview Platform (HUMINEX)

- [ ] Define interview orchestration service:
  - Interview lifecycle
  - Session orchestration
  - Recording metadata
- [ ] Implement dual-panel Agentic Interview:
  - Panel A interviewer agent
  - Panel B evaluator agent
  - Human candidate live interaction
- [ ] Integrate real-time video/audio stack.
- [ ] Add structured interview flow:
  - Introduction
  - Role-specific questions
  - Follow-up discussion
  - Closing summary
- [ ] Generate instant feedback cards:
  - HR view
  - Hiring manager view
  - Skill score
  - Behavioral score
  - Risk flags
- [ ] Store interview artifacts:
  - Transcript
  - Scores
  - Evidence snippets
  - Recommendations
- [ ] Add governance controls:
  - Human override
  - Bias checks
  - Explainability summary

## Phase 6: ATS + Resume Screening + Hiring Workflow

- [ ] Resume ingestion API and parser.
- [ ] ATS format normalization.
- [ ] Screening model pipeline with configurable scoring rubric.
- [ ] Ranking and shortlisting workflow.
- [ ] Integrate screening outcome with Agentic Interview scheduling.
- [ ] Add recruiter review queue with approve/reject reasons.

## Phase 7: Data and Migration Execution

- [ ] Freeze current legacy schema snapshot.
- [ ] Build source-to-target mapping matrix.
- [ ] Execute dry-run migration to new PostgreSQL.
- [ ] Validate row counts and referential integrity.
- [ ] Run shadow traffic verification.
- [ ] Cutover plan with fallback window.

## Phase 8: Quality and Enterprise Readiness

- [~] Unit test coverage baseline per module.
- [ ] Integration tests for cross-module workflows.
- [~] Contract tests for API consumers.
- [ ] Security testing:
  - SAST
  - DAST
  - Dependency audit
- [ ] Chaos/resilience tests in staging.
- [ ] Final go-live readiness checklist.

## Immediate Sprint TODO (Next 2 Weeks)

- [x] Lock backend module boundaries and domain model.
- [x] Create .NET solution scaffolding and API starter.
- [x] Design RBAC + hierarchy schema in PostgreSQL.
- [~] Stand up initial AKS dev environment and CI pipeline.
- [ ] Draft Agentic Interview technical design (session + scoring + feedback cards).
- [ ] Implement admin danger-alert email template and notification service contract.

## Phase-by-Phase Execution Board

### Phase A: Platform Kickoff (Now)

- [x] Finalize bounded contexts and module contracts.
- [x] Define API conventions (`/api/v1`, error envelope, pagination, idempotency).
- [x] Define authN/authZ baseline (JWT + tenant-aware RBAC policy model).
- [x] Finalize PostgreSQL schema ownership per module.

### Phase B: Core Services Build

- [~] Identity, Organization, Workforce module APIs.
- [~] Payroll calculations and payslip workflow APIs.
- [ ] Recruitment + ATS APIs.
- [ ] Notification and email service APIs.
- [ ] Audit log and security event APIs.

### Phase C: Interview + Intelligence

- [ ] OpenHuman session lifecycle APIs.
- [ ] Candidate screening + resume ingestion APIs.
- [ ] Real-time scoring timeline and transcript APIs.
- [ ] Interview artifacts retention/archival APIs.

### Phase D: DevOps + Reliability

- [~] CI/CD gates (build, tests, API contract checks, SAST, dependency scan).
- [ ] AKS environment rollout (dev -> staging -> prod).
- [ ] OpenTelemetry, logs, metrics, alerts.
- [ ] Canary + feature-toggle release flow.

## API Endpoint Blueprint (Draft v1)

### Identity & Access

- [x] Removed legacy `/api/v1/auth/*` endpoints; Microsoft Entra ID is the only auth token issuer.
- [x] `GET /api/v1/users/me`
- [ ] `PATCH /api/v1/users/me`
- [ ] `GET /api/v1/roles`
- [x] `PUT /api/v1/users/{userId}/roles`
- [x] `GET /api/v1/rbac/policies`
- [x] `PUT /api/v1/rbac/policies/{policyId}`

### Organization & Hierarchy

- [x] `GET /api/v1/org/structure`
- [ ] `POST /api/v1/org/employees`
- [ ] `PATCH /api/v1/org/employees/{employeeId}`
- [x] `GET /api/v1/org/employees/{employeeId}`
- [x] `GET /api/v1/org/employees/{employeeId}/manager-chain`
- [x] `GET /api/v1/org/managers/{managerId}/direct-reports`
- [ ] `POST /api/v1/org/employees/{employeeId}/promote`

### Workforce & Employee Portal Controls

- [ ] `GET /api/v1/workforce/employees`
- [ ] `GET /api/v1/workforce/employees/{employeeId}/profile`
- [x] `PUT /api/v1/workforce/employees/{employeeId}/portal-access`
- [ ] `PUT /api/v1/workforce/role-access-matrix`
- [ ] `GET /api/v1/workforce/role-access-matrix`

### Payroll

- [x] `GET /api/v1/payroll/runs`
- [x] `POST /api/v1/payroll/runs`
- [ ] `GET /api/v1/payroll/runs/{runId}`
- [x] `POST /api/v1/payroll/runs/{runId}/approve`
- [x] `POST /api/v1/payroll/runs/{runId}/disburse`
- [x] `GET /api/v1/payroll/employees/{employeeId}/payslips`
- [x] `GET /api/v1/payroll/employees/{employeeId}/payslips/{period}`
- [x] `POST /api/v1/payroll/employees/{employeeId}/payslips/{period}/email`

### Finance, Benefits, Insurance

- [ ] `GET /api/v1/finance/compensation/{employeeId}`
- [ ] `GET /api/v1/benefits/{employeeId}`
- [ ] `GET /api/v1/insurance/{employeeId}/policies`
- [ ] `POST /api/v1/finance/access-requests`
- [ ] `POST /api/v1/security/danger-alerts`

### Recruitment, ATS, Resume

- [ ] `POST /api/v1/recruitment/jobs`
- [ ] `GET /api/v1/recruitment/jobs`
- [ ] `POST /api/v1/recruitment/candidates`
- [ ] `POST /api/v1/recruitment/candidates/{candidateId}/resume`
- [ ] `POST /api/v1/recruitment/candidates/{candidateId}/screen`
- [ ] `GET /api/v1/recruitment/candidates/{candidateId}/screening-result`

### OpenHuman Interview Studio

- [x] `POST /api/v1/openhuman/interviews/schedule`
- [x] `GET /api/v1/openhuman/interviews`
- [x] `GET /api/v1/openhuman/interviews/{interviewId}`
- [x] `POST /api/v1/openhuman/interviews/{interviewId}/reschedule`
- [ ] `POST /api/v1/openhuman/interviews/{interviewId}/cancel`
- [x] `GET /api/v1/openhuman/interviews/{interviewId}/scorecard`
- [x] `GET /api/v1/openhuman/interviews/{interviewId}/transcript`
- [x] `GET /api/v1/openhuman/interviews/{interviewId}/recording`
- [x] `POST /api/v1/openhuman/interviews/{interviewId}/export`

### Notifications, Audit, Observability

- [ ] `POST /api/v1/notifications/email`
- [ ] `GET /api/v1/notifications/history`
- [ ] `GET /api/v1/audit/events`
- [ ] `POST /api/v1/audit/events`
- [x] `GET /api/v1/system/health`
- [ ] `GET /api/v1/system/metrics`

## Current Working Mode (Execution)

- [x] Planner-led delivery: phase-by-phase implementation with strict status updates.
- [x] Feature-by-feature API-first design before backend coding.
- [x] Endpoint contracts mapped to UI modules already available in HUMINEX frontend.
- [x] Start `.NET` solution scaffolding commit.
- [~] Start first backend module implementation commit (`Identity + Organization`).

## Open Decisions (Needs Product + Engineering Sign-Off)

- [x] Video/audio provider selection for interview stack.
- [ ] APM vendor and long-term cost envelope.
- [ ] Feature flag vendor vs self-hosted.
- [ ] Canary policy (5%-25%-50%-100% or metric-gated dynamic rollout).
- [ ] Data retention policy for interview recordings and transcripts.

## Reference Docs

- `Shared/docs/POSTGRES_DOTNET_MIGRATION_GUIDE.md`
- `Shared/docs/HUMINEX-ARCHITECTURE.md`
- `Shared/docs/HUMINEX-API-DOCUMENTATION.md`
- `Shared/docs/HUMINEX-API-ENDPOINT-CATALOG-V1.md`
- `Shared/docs/HUMINEX-POSTGRESQL-SCHEMA-BLUEPRINT.md`
- `Shared/docs/HUMINEX-SPRINT-1-BACKEND-BOARD.md`
