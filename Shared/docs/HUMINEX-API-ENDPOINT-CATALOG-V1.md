# HUMINEX API Endpoint Catalog v1

Base URL: `/api/v1`

## Identity & RBAC

- `GET /users/me`
- `PUT /users/{id}/roles`
- `GET /rbac/policies`
- `PUT /rbac/policies/{id}`

## Organization & Workforce

- `GET /org/structure`
- `GET /org/employees`
- `GET /org/employees/{employeeId}`
- `GET /org/employees/{employeeId}/manager-chain`
- `GET /org/managers/{managerId}/direct-reports`
- `PUT /workforce/employees/{employeeId}/portal-access`

## Payroll

- `GET /payroll/runs`
- `POST /payroll/runs`
- `POST /payroll/runs/{runId}/approve`
- `POST /payroll/runs/{runId}/disburse`
- `GET /payroll/employees/{employeeId}/payslips`
- `GET /payroll/employees/{employeeId}/payslips/{period}`
- `POST /payroll/employees/{employeeId}/payslips/{period}/email`

## OpenHuman Interview Studio

- `POST /openhuman/interviews/schedule`
- `GET /openhuman/interviews`
- `GET /openhuman/interviews/{id}`
- `POST /openhuman/interviews/{id}/reschedule`
- `GET /openhuman/interviews/{id}/scorecard`
- `GET /openhuman/interviews/{id}/transcript`
- `GET /openhuman/interviews/{id}/recording`
- `POST /openhuman/interviews/{id}/export`

## System

- `GET /system/health`

## Contract Rules

- API Versioning: URL segment versioning (`/api/v1`)
- Response wrapper: `ApiEnvelope<T>` with `traceId`
- Error wrapper: `ErrorEnvelope` (`code`, `message`, `traceId`, `validationErrors`)
- Tenant scope: all write/read business operations must enforce `tenant_id` isolation
