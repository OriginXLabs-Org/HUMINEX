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
6. Backend image push updates `infra/k8s/overlays/dev/kustomization.yaml` with `${GITHUB_SHA}`
7. Argo CD auto-sync applies new Git commit to AKS
8. Infra deploy (manual or main)

## CD verification (Argo CD + AKS)
### Argo CD (CLI)
```bash
# login (example)
argocd login <ARGOCD_SERVER> --username admin --password <PASSWORD> --insecure

# app status
argocd app get huminex-platform-dev
argocd app history huminex-platform-dev
argocd app resources huminex-platform-dev
```

### Argo CD (UI)
- Open Argo CD portal.
- Check app `huminex-platform-dev` is `Synced` + `Healthy`.
- Open `History and Rollback` and verify latest commit includes image tag change.

### AKS (CLI)
```bash
az aks get-credentials -g rg-huminex -n huminex-dev-aks --overwrite-existing
kubectl get ns
kubectl -n huminex get rollout,pods,svc,ingress
kubectl -n huminex argo rollouts get rollout huminex-api
kubectl -n huminex describe rollout huminex-api
kubectl -n huminex get pods -o wide
```

### AKS (Portal)
- Azure Portal -> AKS `huminex-dev-aks` -> Workloads.
- Verify rollout/pods are healthy in namespace `huminex`.
- Verify Services and Ingress endpoints are assigned.

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
