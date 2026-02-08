# HUMINEX Automation

End-to-end automation suite for HUMINEX platform quality gates.

## Scope
- UI E2E: Playwright TypeScript tests
- API smoke: auth/health/payroll checks
- Load smoke: k6 scripts
- Mock data: reusable test fixtures

## Quick Start
```bash
cd Huminex-Automation
npm install
npx playwright install --with-deps chromium
npm run test:api
npm run test:ui
```

## Hosted admin auth smoke
```bash
cd Huminex-Automation
HUMINEX_RUN_HOSTED_AUTH_SMOKE=true \
PLAYWRIGHT_BASE_URL=https://www.gethuminex.com \
npx playwright test playwright/tests/hosted-admin-auth.spec.ts
```

## Environment variables
- `API_BASE_URL` (default: `http://localhost:5035`)
- `PLAYWRIGHT_BASE_URL` (default: `http://127.0.0.1:4173`)
- `HUMINEX_RUN_HOSTED_AUTH_SMOKE=true` to run hosted admin redirect-mode smoke test
- `SKIP_WEBSERVER=true` to run UI tests against already-running frontend
- `VUS` and `DURATION` for load script

## Load test
```bash
k6 run load/payroll-load.js
```

## Notes
- These tests are intentionally smoke-first and CI-friendly.
- Expand coverage by adding role-specific and tenant-isolation scenarios.
