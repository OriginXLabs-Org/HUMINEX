#!/usr/bin/env bash
set -euo pipefail

# Provision Azure Managed Grafana for HUMINEX and print the portal URL + Grafana endpoint.
#
# This is the recommended "DNS-less" hosted UI:
# Azure gives a first-party URL like https://<name>.grafana.azure.com (no custom domain required).

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
LOCATION="${LOCATION:-centralindia}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
NAME="${NAME:-huminex-${ENVIRONMENT}-grafana}"
SKU="${SKU:-Standard}"

OWNER="${OWNER:-platform@huminex}"
TEAM="${TEAM:-platform}"
COST_CENTER="${COST_CENTER:-huminex-platform}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required."
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo "Azure CLI is not logged in. Run: az login"
  exit 1
fi

if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
fi

if ! az grafana show -g "$RESOURCE_GROUP" -n "$NAME" >/dev/null 2>&1; then
  az grafana create \
    --name "$NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku "$SKU" \
    --tags \
      app=huminex \
      environment="$ENVIRONMENT" \
      owner="$OWNER" \
      team="$TEAM" \
      cost-center="$COST_CENTER" >/dev/null
fi

# Enable identity (needed for Azure Monitor datasources / RBAC).
az grafana update -g "$RESOURCE_GROUP" -n "$NAME" --assign-identity >/dev/null

GRAFANA_ID="$(az grafana show -g "$RESOURCE_GROUP" -n "$NAME" --query id -o tsv)"
GRAFANA_URL="$(az grafana show -g "$RESOURCE_GROUP" -n "$NAME" --query properties.endpoint -o tsv)"

SIGNED_IN_OBJECT_ID="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)"
if [ -n "${SIGNED_IN_OBJECT_ID:-}" ]; then
  # Best-effort: grant the signed-in user Grafana Admin if not already assigned.
  # Note: role name differs across tenants; if this fails, assign manually in the portal.
  az role assignment create \
    --assignee-object-id "$SIGNED_IN_OBJECT_ID" \
    --assignee-principal-type User \
    --role "Grafana Admin" \
    --scope "$GRAFANA_ID" >/dev/null 2>&1 || true
fi

SUB_ID="$(az account show --query id -o tsv)"
PORTAL_URL="https://portal.azure.com/#@/resource${GRAFANA_ID}/overview"

echo "HUMINEX Azure Managed Grafana ready"
echo "Name: $NAME"
echo "Resource group: $RESOURCE_GROUP"
echo "Subscription: $SUB_ID"
echo "Portal: $PORTAL_URL"
echo "Grafana URL: $GRAFANA_URL"

