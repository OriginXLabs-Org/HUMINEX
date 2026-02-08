#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEFINITION_FILE="${ROOT_DIR}/infra/azure/bicep/definitions/huminex.workbook.json"

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
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

echo "Using Azure account:"
az account show --query '{name:name, id:id, tenantId:tenantId}' -o table

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
LAW_ID="$(az resource show -g "${RESOURCE_GROUP}" -n "${LOG_ANALYTICS_WORKSPACE_NAME}" --resource-type Microsoft.OperationalInsights/workspaces --query id -o tsv)"
WORKBOOK_GUID="$(az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "huminex-workbook-guid-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)" \
  --template-file "${ROOT_DIR}/infra/azure/bicep/monitoring.workbook.bicep" \
  --parameters \
    location="${LOCATION}" \
    environment="${ENVIRONMENT}" \
    namePrefix="${NAME_PREFIX}" \
    logAnalyticsWorkspaceName="${LOG_ANALYTICS_WORKSPACE_NAME}" \
    workbookDisplayName="${WORKBOOK_DISPLAY_NAME}" \
    owner="${OWNER}" \
    team="${TEAM}" \
    costCenter="${COST_CENTER}" \
  --query "properties.outputs.workbookName.value" -o tsv)"

WORKBOOK_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Insights/workbooks/${WORKBOOK_GUID}"
RESOLVED_JSON="/tmp/huminex_workbook_${ENVIRONMENT}_resolved.json"
PAYLOAD_JSON="/tmp/huminex_workbook_${ENVIRONMENT}_payload.json"

sed "s|__LAW_RESOURCE_ID__|${LAW_ID}|g" "${DEFINITION_FILE}" > "${RESOLVED_JSON}"

jq -n \
  --arg location "${LOCATION}" \
  --arg owner "${OWNER}" \
  --arg team "${TEAM}" \
  --arg env "${ENVIRONMENT}" \
  --arg cc "${COST_CENTER}" \
  --arg displayName "${WORKBOOK_DISPLAY_NAME}" \
  --arg sourceId "/subscriptions/${SUBSCRIPTION_ID}" \
  --rawfile sd "${RESOLVED_JSON}" \
  '{
    location: $location,
    kind: "shared",
    tags: {
      app: "huminex",
      environment: $env,
      owner: $owner,
      team: $team,
      "cost-center": $cc
    },
    properties: {
      displayName: $displayName,
      serializedData: $sd,
      version: "1.0",
      category: "workbook",
      sourceId: $sourceId
    }
  }' > "${PAYLOAD_JSON}"

az rest --method put \
  --uri "https://management.azure.com${WORKBOOK_ID}?api-version=2023-06-01" \
  --body @"${PAYLOAD_JSON}" \
  --query "properties.{displayName:displayName,serializedDataLen:length(serializedData)}" -o jsonc

echo
echo "Workbook ready: ${WORKBOOK_DISPLAY_NAME}"
echo "Portal URL: https://portal.azure.com/#@/resource${WORKBOOK_ID}/workbook"
