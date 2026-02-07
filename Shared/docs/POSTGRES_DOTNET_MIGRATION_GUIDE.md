# PostgreSQL + .NET Migration Guide (HUMINEX)

## Goal
Standardize HUMINEX on:
- .NET 8 modular monolith API
- PostgreSQL (portable, cloud-managed)
- Azure-first deployment model

## Migration Phases
1. Freeze legacy write paths
2. Generate schema blueprint and module ownership
3. Implement EF migrations and SQL export scripts
4. Validate data parity and constraints
5. Switch frontend API consumption to `/api/v1`
6. Decommission legacy runtime components

## Current Output
- `Backend/src/BuildingBlocks.Infrastructure/Persistence/Migrations/*`
- `Backend/migrations/*.sql`
- Swagger contracts at `Backend/src/Api/Huminex.Api`

## Validation Checklist
- Tenant filters active on all module tables
- RBAC policy checks enforced in API
- Payroll endpoints idempotent
- Integration tests pass on PostgreSQL container
