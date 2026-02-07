# HUMINEX API Documentation

Base URL: `/api/v1`

## Identity & RBAC
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
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
- `POST /payroll/runs` (requires `Idempotency-Key`)
- `POST /payroll/runs/{runId}/approve` (requires `Idempotency-Key`)
- `POST /payroll/runs/{runId}/disburse` (requires `Idempotency-Key`)
- `GET /payroll/employees/{employeeId}/payslips`
- `GET /payroll/employees/{employeeId}/payslips/{period}`
- `POST /payroll/employees/{employeeId}/payslips/{period}/email` (requires `Idempotency-Key`)

## OpenHuman
- `POST /openhuman/interviews/schedule`
- `GET /openhuman/interviews`
- `GET /openhuman/interviews/{id}`
- `POST /openhuman/interviews/{id}/reschedule`
- `GET /openhuman/interviews/{id}/scorecard`
- `GET /openhuman/interviews/{id}/transcript`
- `GET /openhuman/interviews/{id}/recording`
- `POST /openhuman/interviews/{id}/export`

## Health
- `GET /system/health`

For request/response examples and detailed schemas, use Swagger at `/swagger`.
