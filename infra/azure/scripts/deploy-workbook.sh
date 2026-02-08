#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TEMPLATE_FILE="${ROOT_DIR}/infra/azure/bicep/monitoring.workbook.bicep"

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
NAME_PREFIX="${NAME_PREFIX:-huminex}"
LOCATION="${LOCATION:-centralindia}"
LOG_ANALYTICS_WORKSPACE_NAME="${LOG_ANALYTICS_WORKSPACE_NAME:-${NAME_PREFIX}-${ENVIRONMENT}-law}"
WORKBOOK_DISPLAY_NAME="${WORKBOOK_DISPLAY_NAME:-HUMINEX}"
OWNER="${OWNER:-platform@huminex}"
TEAM="${TEAM:-platform}"
COST_CENTER="${COST_CENTER:-huminex-platform}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required."
  exit 1
fi

echo "Using Azure account:"
az account show --query '{name:name, id:id, tenantId:tenantId}' -o table

echo "Deploying HUMINEX workbook to resource group ${RESOURCE_GROUP} (${ENVIRONMENT})..."
az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "huminex-workbook-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters \
      location="${LOCATION}" \
      environment="${ENVIRONMENT}" \
      namePrefix="${NAME_PREFIX}" \
      logAnalyticsWorkspaceName="${LOG_ANALYTICS_WORKSPACE_NAME}" \
      workbookDisplayName="${WORKBOOK_DISPLAY_NAME}" \
      owner="${OWNER}" \
      team="${TEAM}" \
      costCenter="${COST_CENTER}" \
  --query "properties.outputs" -o jsonc
