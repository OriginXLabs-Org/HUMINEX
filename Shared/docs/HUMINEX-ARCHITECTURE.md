# HUMINEX Architecture

## Runtime Topology
- `Frontend/` serves web UI
- `Backend/` exposes modular monolith APIs
- PostgreSQL stores tenant-scoped business data
- Redis + Kafka support async and high-throughput workloads

## Backend Modules
1. Identity & Access
2. Organization & Hierarchy
3. Workforce
4. Payroll
5. Finance/Benefits
6. Recruitment/ATS
7. OpenHuman Interview Studio
8. Notifications
9. Audit & Compliance
10. Platform Settings

## Core Design Principles
- Tenant isolation with `tenant_id`
- Policy-based RBAC
- API-first contracts (`/api/v1`)
- Idempotent mutation endpoints for financial workflows
- Observability-first (logs/metrics/traces)
