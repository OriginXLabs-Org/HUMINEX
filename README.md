# HUMINEX Platform

Enterprise workforce platform for payroll, HR, workforce operations, billing, and OpenHuman integration.

## Current Working Structure
- `Backend/` active .NET 8 API + migrations + tests
- `Frontend/` active React/Vite application
- `infra/` Azure Bicep, k8s manifests, Argo CD apps
- `Huminex-Automation/` UI/API/load automation suite
- `openhuman/` independent repo skeleton for interview system

## Target Layout (Migration-ready)
- `backend/`, `frontend/`, `k8s/`, `e2e/playwright/` are scaffolded for gradual migration.
- Existing production code still runs from `Backend/` and `Frontend/`.

## Local Development
### Backend
```bash
dotnet restore Backend/src/Api/Huminex.Api/Huminex.Api.csproj
dotnet build Backend/src/Api/Huminex.Api/Huminex.Api.csproj
dotnet run --project Backend/src/Api/Huminex.Api/Huminex.Api.csproj
```

### Frontend
```bash
npm --prefix Frontend install
npm --prefix Frontend run dev
```

## Testing
### Backend
```bash
dotnet test Backend/tests/Unit/Huminex.Tests.Unit.csproj
dotnet test Backend/tests/Integration/Huminex.Tests.Integration.csproj
dotnet test Backend/tests/Architecture/Huminex.Tests.Architecture.csproj
```

### Frontend
```bash
npm --prefix Frontend run test:run
npm --prefix Frontend run build
```

### Full Automation
```bash
npm --prefix Huminex-Automation install
npm --prefix Huminex-Automation run test:api
npm --prefix Huminex-Automation run test:ui
```

## CI/CD Workflows
- `.github/workflows/backend-ci.yml`
- `.github/workflows/backend-image-push.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/e2e-playwright.yml`
- `.github/workflows/infra-deploy.yml`

## Vercel Deployment
Frontend production deploy is handled from `frontend-ci.yml` when these secrets exist:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Documentation
- `Shared/docs/HUMINEX-IMPLEMENTATION-TODO-PLANNER.md`
- `Shared/docs/GITHUB-CI-CD-PLAYBOOK.md`
- `Shared/docs/TEST-AUTOMATION-STRATEGY.md`
