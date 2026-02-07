# HUMINEX PostgreSQL Schema Blueprint (Multi-Tenant)

## Design Principles

- Single database, shared schema, strict `tenant_id` isolation
- Every business table includes:
  - `tenant_id uuid not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `created_by uuid null`
  - `updated_by uuid null`
  - `is_deleted boolean not null default false`
- Every sensitive mutation is auditable

## Core Tables

## identity_users

- `id uuid pk`
- `tenant_id uuid not null`
- `entra_object_id text unique not null`
- `email citext not null`
- `display_name text not null`
- `role text not null`
- `status text not null`
- audit fields

## rbac_roles

- `id uuid pk`
- `tenant_id uuid not null`
- `role_key text not null`
- `display_name text not null`
- audit fields

## rbac_permissions

- `id uuid pk`
- `permission_key text not null`
- `display_name text not null`

## rbac_role_permissions

- `role_id uuid fk -> rbac_roles.id`
- `permission_id uuid fk -> rbac_permissions.id`
- `tenant_id uuid not null`

## org_employees

- `id uuid pk`
- `tenant_id uuid not null`
- `employee_code text not null`
- `user_id uuid null fk -> identity_users.id`
- `manager_employee_id uuid null fk -> org_employees.id`
- `name text not null`
- `email citext not null`
- `department text not null`
- `designation text not null`
- `employment_status text not null`
- audit fields

## workforce_portal_access

- `id uuid pk`
- `tenant_id uuid not null`
- `employee_id uuid fk -> org_employees.id`
- `is_enabled boolean not null`
- `allowed_widgets jsonb not null default '[]'::jsonb`
- audit fields

## payroll_runs

- `id uuid pk`
- `tenant_id uuid not null`
- `period text not null`
- `status text not null`
- `employees_count int not null`
- `gross_amount numeric(14,2) not null`
- `net_amount numeric(14,2) not null`
- `approved_at timestamptz null`
- `disbursed_at timestamptz null`
- audit fields

## payroll_payslips

- `id uuid pk`
- `tenant_id uuid not null`
- `employee_id uuid fk -> org_employees.id`
- `run_id uuid fk -> payroll_runs.id`
- `period text not null`
- `gross numeric(14,2) not null`
- `deductions numeric(14,2) not null`
- `net numeric(14,2) not null`
- `status text not null`
- `document_url text null`
- audit fields

## recruitment_candidates

- `id uuid pk`
- `tenant_id uuid not null`
- `full_name text not null`
- `email citext not null`
- `position text not null`
- `resume_url text null`
- `screening_score numeric(4,2) null`
- `screening_status text not null`
- audit fields

## openhuman_interviews

- `id uuid pk`
- `tenant_id uuid not null`
- `candidate_id uuid fk -> recruitment_candidates.id`
- `scheduled_at timestamptz not null`
- `status text not null`
- `mode text not null`
- `overall_score numeric(4,2) null`
- `recording_url text null`
- `transcript_url text null`
- `expires_at timestamptz null`
- audit fields

## audit_events

- `id uuid pk`
- `tenant_id uuid not null`
- `actor_user_id uuid null`
- `event_type text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `severity text not null`
- `payload jsonb not null`
- `occurred_at timestamptz not null default now()`

## security_alerts

- `id uuid pk`
- `tenant_id uuid not null`
- `alert_type text not null`
- `severity text not null`
- `employee_id uuid null`
- `triggered_by_user_id uuid null`
- `details jsonb not null`
- `status text not null`
- `created_at timestamptz not null default now()`

## Index & Constraint Baseline

- Unique business keys scoped by tenant (`tenant_id`, `employee_code`)
- FK indexes on all relation columns
- Partial index on active rows (`is_deleted = false`)
- GIN indexes for frequently queried JSONB columns

## Migration Tooling

- Primary: EF Core migrations (module-based migration assemblies)
- SQL packaging export for DBA review/cutover
- Dry-run validation scripts for row count and FK integrity
