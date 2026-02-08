#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
NAME_PREFIX="${NAME_PREFIX:-huminex}"
WORKBOOK_DISPLAY_NAME="${WORKBOOK_DISPLAY_NAME:-HUMINEX}"
SPA_APP_ID="${SPA_APP_ID:-8585bece-66ed-405c-bfa5-568689345f91}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required."
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

LAW_NAME="${NAME_PREFIX}-${ENVIRONMENT}-law"
LAW_ID="$(az resource show -g "${RESOURCE_GROUP}" -n "${LAW_NAME}" --resource-type Microsoft.OperationalInsights/workspaces --query id -o tsv)"

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
WORKBOOKS_JSON="$(az rest --method get --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Insights/workbooks?api-version=2021-03-08" -o json)"
WORKBOOK_NAME="$(echo "${WORKBOOKS_JSON}" | jq -r --arg n "${WORKBOOK_DISPLAY_NAME}" '.value[]? | select(.properties.displayName == $n) | .name' | head -n1)"
WORKBOOK_ID="$(echo "${WORKBOOKS_JSON}" | jq -r --arg n "${WORKBOOK_DISPLAY_NAME}" '.value[]? | select(.properties.displayName == $n) | .id' | head -n1)"

if [[ -z "${WORKBOOK_ID}" || -z "${WORKBOOK_NAME}" ]]; then
  echo "FAIL: Workbook '${WORKBOOK_DISPLAY_NAME}' not found in ${RESOURCE_GROUP}."
  exit 1
fi

WORKBOOK_JSON="$(az monitor app-insights workbook show -g "${RESOURCE_GROUP}" --resource-name "${WORKBOOK_NAME}" --can-fetch-content true -o json)"
SERIALIZED="$(echo "${WORKBOOK_JSON}" | jq -r '.serializedData // ""')"
SERIALIZED_LEN="$(echo "${WORKBOOK_JSON}" | jq -r '(.serializedData // "" | length)')"

if [[ "${SERIALIZED_LEN}" -lt 1000 ]]; then
  echo "FAIL: Workbook serializedData is empty or too small (len=${SERIALIZED_LEN})."
  exit 1
fi

if ! grep -Fq "${LAW_ID}" <<< "${SERIALIZED}"; then
  echo "FAIL: Workbook serializedData does not contain expected LAW resource id."
  exit 1
fi

REQUIRED_URIS=(
  "https://www.gethuminex.com"
  "https://www.gethuminex.com/admin/login"
  "https://www.gethuminex.com/tenant/login"
  "https://www.gethuminex.com/auth/popup-callback.html"
  "http://localhost:8080"
  "http://localhost:8080/auth/popup-callback.html"
)

APP_URIS_JSON="$(az ad app show --id "${SPA_APP_ID}" --query 'spa.redirectUris' -o json)"

for uri in "${REQUIRED_URIS[@]}"; do
  if ! echo "${APP_URIS_JSON}" | jq -e --arg uri "${uri}" 'index($uri) != null' >/dev/null; then
    echo "FAIL: Missing SPA redirect URI: ${uri}"
    exit 1
  fi
done

echo "PASS: Workbook and auth observability checks passed."
echo "Workbook ID: ${WORKBOOK_ID}"
echo "LAW ID: ${LAW_ID}"
