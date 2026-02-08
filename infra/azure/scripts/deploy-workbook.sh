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
if ! command -v uuidgen >/dev/null 2>&1; then
  echo "uuidgen is required."
  exit 1
fi

echo "Using Azure account:"
az account show --query '{name:name, id:id, tenantId:tenantId}' -o table

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
LAW_ID="$(az resource show -g "${RESOURCE_GROUP}" -n "${LOG_ANALYTICS_WORKSPACE_NAME}" --resource-type Microsoft.OperationalInsights/workspaces --query id -o tsv)"
WORKBOOKS_RESPONSE="$(az rest --method get --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Insights/workbooks?api-version=2023-06-01" -o json)"
EXISTING_WORKBOOK_ID="$(echo "${WORKBOOKS_RESPONSE}" | jq -r --arg name "${WORKBOOK_DISPLAY_NAME}" '.value[]? | select(.properties.displayName == $name) | .id' | head -n1)"

if [[ -n "${EXISTING_WORKBOOK_ID}" ]]; then
  WORKBOOK_ID="${EXISTING_WORKBOOK_ID}"
else
  WORKBOOK_GUID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  WORKBOOK_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Insights/workbooks/${WORKBOOK_GUID}"
fi
WORKBOOK_NAME="${WORKBOOK_ID##*/}"
RESOLVED_JSON="/tmp/huminex_workbook_${ENVIRONMENT}_resolved.json"

sed "s|__LAW_RESOURCE_ID__|${LAW_ID}|g" "${DEFINITION_FILE}" > "${RESOLVED_JSON}"
SERIALIZED_DATA_COMPACT="$(jq -c . "${RESOLVED_JSON}")"

if [[ -n "${EXISTING_WORKBOOK_ID}" ]]; then
  UPSERT_RESPONSE="$(az monitor app-insights workbook update \
    --resource-group "${RESOURCE_GROUP}" \
    --resource-name "${WORKBOOK_NAME}" \
    --kind shared \
    --category workbook \
    --version 'Notebook/1.0' \
    --display-name "${WORKBOOK_DISPLAY_NAME}" \
    --source-id "/subscriptions/${SUBSCRIPTION_ID}" \
    --serialized-data "${SERIALIZED_DATA_COMPACT}" \
    --tags "app=huminex" "environment=${ENVIRONMENT}" "owner=${OWNER}" "team=${TEAM}" "cost-center=${COST_CENTER}" \
    -o json)"
else
  UPSERT_RESPONSE="$(az monitor app-insights workbook create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${WORKBOOK_NAME}" \
    --location "${LOCATION}" \
    --kind shared \
    --category workbook \
    --version 'Notebook/1.0' \
    --display-name "${WORKBOOK_DISPLAY_NAME}" \
    --source-id "/subscriptions/${SUBSCRIPTION_ID}" \
    --serialized-data "${SERIALIZED_DATA_COMPACT}" \
    --tags "app=huminex" "environment=${ENVIRONMENT}" "owner=${OWNER}" "team=${TEAM}" "cost-center=${COST_CENTER}" \
    -o json)"
fi

echo "${UPSERT_RESPONSE}" | jq '{displayName,serializedDataLen:(.serializedData // "" | length)}'

WB_GET_RESPONSE="$(az monitor app-insights workbook show --resource-group "${RESOURCE_GROUP}" --resource-name "${WORKBOOK_NAME}" --can-fetch-content true -o json)"
SERIALIZED_LEN="$(echo "${WB_GET_RESPONSE}" | jq -r '(.serializedData // "" | length)')"
SERIALIZED_TEXT="$(echo "${WB_GET_RESPONSE}" | jq -r '.serializedData // ""')"

if [[ "${SERIALIZED_LEN}" -lt 1000 ]]; then
  echo "Workbook deploy verification failed: serializedData is missing or too small (length=${SERIALIZED_LEN})."
  exit 1
fi

if ! grep -Fq "${LAW_ID}" <<< "${SERIALIZED_TEXT}"; then
  echo "Workbook deploy verification failed: serializedData does not include expected Log Analytics workspace id."
  exit 1
fi

echo
echo "Workbook ready: ${WORKBOOK_DISPLAY_NAME}"
echo "Portal URL: https://portal.azure.com/#@/resource${WORKBOOK_ID}/workbook"
