# HUMINEX Infrastructure Starters

## Local Docker (PostgreSQL + API + Swagger)

```bash
docker compose -f docker-compose.local.yml up -d --build
```

- API: `http://localhost:5035/swagger`
- PostgreSQL host port: `5434`

DataGrip connection:
- Host: `localhost`
- Port: `5434`
- Database: `huminex`
- User: `postgres`
- Password: `postgres`

## AKS + Argo CD (Starter Manifests)

- Argo CD Application: `infra/argocd/apps/huminex-api-dev.yaml`
- Argo CD UI ingress: `infra/argocd/argocd-server-ingress.yaml`
- Kubernetes base: `infra/k8s/base`
- Dev overlay: `infra/k8s/overlays/dev`
- Key Vault CSI mapping: `infra/k8s/base/secret-provider-class.yaml`
- NGINX ingress manifests:
  - `infra/k8s/base/ingress.yaml`
  - `infra/k8s/base/ingress-canary.yaml`

Before applying:
1. Replace `repoURL` in `infra/argocd/apps/huminex-api-dev.yaml`.
2. Set image name/tag to your ACR image.
3. Update `tenantId` in `infra/k8s/base/secret-provider-class.yaml`.
4. Ensure Key Vault `kv-huminex` contains:
   - `postgres-connection-string`
   - `azuread-tenant-id`
   - `azuread-client-id`
   - `azuread-audience`
   - `servicebus-fully-qualified-namespace`
   - `blob-service-uri`
   - `appconfig-endpoint`

### Argo CD UI (Live, no localhost tunnel)

Apply ingress:

```bash
kubectl apply -f infra/argocd/argocd-server-ingress.yaml
```

Live URL:

```text
https://huminex-argocd-dev.centralindia.cloudapp.azure.com
```

Admin username:

```text
admin
```

Admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## Canary Rollout

This starter uses:
- `Rollout` (`infra/k8s/base/rollout.yaml`)
- `AnalysisTemplate` (`infra/k8s/base/analysis-template.yaml`)
- `HPA` (`infra/k8s/base/hpa.yaml`)

Canary is configured to progressively shift traffic and run health checks between steps.

## CI/CD Workflows

- CI + tests + contract checks + optional Sonar + Trivy scan:
  - `.github/workflows/backend-ci.yml`
- Docker image build/push (ACR):
  - `.github/workflows/backend-image-push.yml`
- Azure infrastructure deployment:
  - `.github/workflows/azure-infra-deploy.yml`

Required GitHub Secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_SECRET`
- `ACR_LOGIN_SERVER`

Optional Sonar:
- `SONAR_TOKEN`
- `SONAR_HOST_URL`

## Post-deploy verification

```bash
bash infra/azure/scripts/verify-huminex.sh
```

Check API health via ingress / service:

```bash
curl -f https://api.gethuminex.com/health/live
curl -f https://api.gethuminex.com/health/ready
```
