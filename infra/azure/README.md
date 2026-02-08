# HUMINEX Azure Bicep Deployment

This folder contains Azure-first infrastructure templates for HUMINEX with consistent naming identity:

- Resource Group: `rg-huminex`
- Prefix: `huminex`

## What this deploys

- Azure Resource Group (`rg-huminex`)
- Azure Container Registry (ACR)
- Azure Kubernetes Service (AKS)
- Azure PostgreSQL Flexible Server + `huminex` database
- Azure Service Bus namespace + topic (`huminex-business-events`)
- Azure Storage account (blob storage for payroll/interview documents)
- Azure App Configuration
- Azure Key Vault
- Log Analytics Workspace
- Application Insights
- ACR Pull role assignment for AKS kubelet identity

## Files

- `infra/azure/bicep/main.subscription.bicep`
  - Subscription-scope entrypoint (creates RG and invokes RG module)
- `infra/azure/bicep/main.rg.bicep`
  - Resource Group-scope stack
- `infra/azure/bicep/main.dev.bicepparam`
  - Dev parameters starter

## Prerequisites

- Azure CLI logged in:
  - `az login`
  - `az account set --subscription "<your-subscription-id>"`
- Permissions to create resource groups and AKS/ACR/Postgres resources.
- Existing Key Vault in `rg-huminex`:
  - `kv-huminex`
  - Secret: `postgres-admin-password`

## Deploy (recommended)

Compatible with all Azure CLI versions:

```bash
az deployment sub create \
  --name huminex-platform-dev \
  --location centralindia \
  --template-file infra/azure/bicep/main.subscription.bicep \
  --parameters @infra/azure/bicep/main.dev.parameters.json
```

If your Azure CLI supports Bicep parameter files (`.bicepparam`), this also works:

```bash
az deployment sub create \
  --name huminex-platform-dev \
  --location centralindia \
  --template-file infra/azure/bicep/main.subscription.bicep \
  --parameters infra/azure/bicep/main.dev.bicepparam
```

## One-command bootstrap

Use the bootstrap script to validate login/context, ensure baseline resources, deploy infra, and check/create Entra apps:

```bash
bash infra/azure/scripts/huminex-bootstrap.sh
```

Preview actions without mutating Azure:

```bash
bash infra/azure/scripts/huminex-bootstrap.sh --dry-run
```

Run a read-only verification after deployment:

```bash
bash infra/azure/scripts/verify-huminex.sh
```

Non-blocking verification (useful during bring-up):

```bash
bash infra/azure/scripts/verify-huminex.sh --warn-only
```

## Post-deploy checks

```bash
az group show -n rg-huminex -o table
az acr list -g rg-huminex -o table
az aks list -g rg-huminex -o table
az postgres flexible-server list -g rg-huminex -o table
az servicebus namespace list -g rg-huminex -o table
az storage account list -g rg-huminex -o table
az appconfig list -g rg-huminex -o table
```

## Notes

- Resource names are automatically suffixed for global uniqueness where required.
- Update region/SKU values in `main.rg.bicep` based on cost/perf target.
- For production, tighten networking (private endpoints, private AKS/Postgres access).

## HUMINEX Slack Alerting Stack

Use the dedicated alerting template to wire Azure Monitor alerts to Slack through a Logic App relay:

- Template: `infra/azure/bicep/monitoring.alerts.bicep`
- Deploy script: `infra/azure/scripts/deploy-alerting.sh`

### What it creates

- Logic App webhook relay to Slack
- Action Groups:
  - `${namePrefix}-${environment}-ag-critical`
  - `${namePrefix}-${environment}-ag-warning`
- 23 alert rules (log + metric) across:
  - AKS / infra
  - App Insights API health/performance
  - Security/identity
  - FinOps/cost anomalies
  - Platform deployment/scale events

### Deploy

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"
export SLACK_CHANNEL_MENTION="#huminex-alerts"
export ENVIRONMENT="prod" # or dev/stage
bash infra/azure/scripts/deploy-alerting.sh
```

### Optional overrides

- `RESOURCE_GROUP` (default: `rg-huminex`)
- `LOG_ANALYTICS_WORKSPACE_NAME` (default: `${namePrefix}-${environment}-law`)
- `APP_INSIGHTS_NAME` (default: `${namePrefix}-${environment}-appi`)
- `DAILY_SPEND_THRESHOLD_USD` (default: `300`)
- `MONTHLY_SPEND_THRESHOLD_USD` (default: `9000`)
- `OWNER`, `TEAM`, `COST_CENTER`

### Validation in Portal

1. `Monitor > Alerts > Alert rules` (filter name prefix `huminex-<env>-`)
2. `Monitor > Alerts > Action groups`
3. `Logic Apps > huminex-<env>-alert-relay-la`
4. Trigger a test alert and verify delivery in Slack channel `#huminex-alerts`

## HUMINEX Workbook Deployment

Use the workbook deployment script to publish the shared `HUMINEX` workbook with deterministic Log Analytics binding.

- Workbook definition: `infra/azure/bicep/definitions/huminex.workbook.json`
- Deploy script (authoritative): `infra/azure/scripts/deploy-workbook.sh`

```bash
export ENVIRONMENT="dev" # or stage/prod
bash infra/azure/scripts/deploy-workbook.sh
```

The script:

1. Resolves the environment LAW resource ID.
2. Replaces `__LAW_RESOURCE_ID__` placeholders in workbook JSON.
3. Upserts workbook content through Azure workbook management API (`az monitor app-insights workbook create/update`).
4. Verifies `serializedData` is non-empty and contains the expected LAW resource ID.

### Verification Script

```bash
export ENVIRONMENT="dev" # or stage/prod
bash infra/azure/scripts/verify-observability-auth.sh
```

It validates:

1. Workbook exists and has non-null serialized content.
2. Workbook is bound to the expected LAW resource ID.
3. SPA app registration includes required redirect URIs (admin, tenant, popup callback, localhost).

## GitHub Actions Secrets Required

For `.github/workflows/azure-infra-deploy.yml` and `.github/workflows/backend-image-push.yml`:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_SECRET`
- `ACR_LOGIN_SERVER` (example: `huminexdevacrxxxxxx.azurecr.io`)

## Key Vault Runtime Secrets (AKS CSI)

Add these secrets to `kv-huminex` for Kubernetes runtime:

- `postgres-connection-string`
- `azuread-tenant-id`
- `azuread-client-id`
- `azuread-audience`

They are mapped by `infra/k8s/base/secret-provider-class.yaml` into Kubernetes secret `huminex-api-secrets`.
