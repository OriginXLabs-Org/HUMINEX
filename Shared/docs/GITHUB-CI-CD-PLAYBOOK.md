# HUMINEX GitHub CI/CD Playbook

## Workflows
- `.github/workflows/backend-ci.yml`
- `.github/workflows/backend-image-push.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/e2e-playwright.yml`
- `.github/workflows/infra-deploy.yml`
- `.github/workflows/codeql.yml`

## Required GitHub Secrets
### Azure
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `ACR_LOGIN_SERVER`

### Vercel
- Not required in GitHub Actions (Vercel Git webhook handles deployment)

### Optional
- `SONAR_TOKEN`
- `SONAR_HOST_URL`

## Pipeline order
1. Backend CI (restore/build/unit/integration/contracts)
2. Frontend CI (unit/build)
3. E2E Playwright (UI smoke + API smoke)
4. CodeQL static analysis (C# + JS/TS)
5. Backend image push to ACR (main branch) + Trivy image scan (SARIF)
6. Infra deploy (manual or main)
7. Argo CD sync from `infra/argocd/*.yaml`

## Local pre-push checks
```bash
# Backend
 dotnet test Backend/tests/Unit/Huminex.Tests.Unit.csproj
 dotnet test Backend/tests/Integration/Huminex.Tests.Integration.csproj
 dotnet test Backend/tests/Architecture/Huminex.Tests.Architecture.csproj

# Frontend
 npm --prefix Frontend run test:run
 npm --prefix Frontend run build

# Automation
 npm --prefix Huminex-Automation run test:api
 npm --prefix Huminex-Automation run test:ui
```
