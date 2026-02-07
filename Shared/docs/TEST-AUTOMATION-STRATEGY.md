# HUMINEX Test Automation Strategy

## Backend
- Unit tests: parser/validators/policy constants
- Integration tests: tenant isolation, RBAC negatives, idempotency, auth smoke
- Contract tests: API route contract checks

## Frontend
- Unit tests (Vitest): pricing and domain logic
- E2E (Playwright): home, pricing, portal auth CTAs

## API Smoke
- Health endpoint
- Auth login endpoint
- Payroll list endpoint with tenant/user headers

## Load Smoke
- k6 script on payroll list endpoint
- configurable via `VUS` and `DURATION`

## Automation folder
- `Huminex-Automation/playwright`
- `Huminex-Automation/api`
- `Huminex-Automation/load`
- `Huminex-Automation/mocks`
