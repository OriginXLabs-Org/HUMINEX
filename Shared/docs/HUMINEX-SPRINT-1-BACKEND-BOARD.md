# HUMINEX Sprint-1 Backend Board

Status values: `pending`, `in_progress`, `completed`

## Epic A: Foundation + Contracts

- `completed` Create .NET 8 solution skeleton and project references
- `completed` Configure API v1 versioning + Swagger baseline
- `completed` Add shared primitives (`tenant`, `error`, `pagination`)
- `completed` Add v1 endpoint skeleton for Identity/Org/Workforce/Payroll/OpenHuman
- `in_progress` Define module ownership + split module projects beyond skeleton

## Epic B: Data Layer

- `completed` Draft PostgreSQL multi-tenant schema blueprint
- `pending` Implement EF Core DbContext + initial migrations
- `pending` Seed baseline RBAC roles and permissions

## Epic C: Security + RBAC

- `in_progress` Wire Entra ID JWT authentication pipeline
- `pending` Implement tenant-aware authorization policies
- `pending` Add sensitive financial access danger-alert flow

## Epic D: Integrations

- `completed` Add package baselines for Kafka, Redis, Hangfire, Blob, ACS Email
- `pending` Implement concrete adapter classes and health checks
- `pending` Add outbox/event publishing baseline for critical workflows

## Epic E: Quality Gates

- `completed` Add unit/integration/architecture test projects and baseline tests
- `pending` Add CI workflow for restore/build/test
- `pending` Add API contract lint/check pipeline
