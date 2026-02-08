#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
LOCATION="${LOCATION:-centralindia}"
DOCS_DIR="${DOCS_DIR:-huminex-architecture/site}"
PREFIX="${PREFIX:-huminexengdocs}"
OWNER="${OWNER:-platform@huminex}"
TEAM="${TEAM:-platform}"
COST_CENTER="${COST_CENTER:-huminex-platform}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

if [ ! -d "$DOCS_DIR" ]; then
  echo "Docs directory not found: $DOCS_DIR"
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required."
  exit 1
fi

ensure_resource_group() {
  if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
  fi
}

resolve_storage_account() {
  local existing
  existing="$(az storage account list -g "$RESOURCE_GROUP" --query "[?tags.app=='huminex' && tags.purpose=='engineering-docs'].name | [0]" -o tsv 2>/dev/null || true)"

  if [ -n "$existing" ] && [ "$existing" != "null" ]; then
    echo "$existing"
    return
  fi

  local seed suffix name
  seed="$(az account show --query id -o tsv | tr -d '-' | tail -c 7)"
  suffix="$(date -u +%m%d%H)${seed}"
  name="${PREFIX}${suffix}"
  name="${name:0:24}"

  az storage account create \
    --name "$name" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --https-only true \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --tags \
      app=huminex \
      purpose=engineering-docs \
      environment="$ENVIRONMENT" \
      owner="$OWNER" \
      team="$TEAM" \
      cost-center="$COST_CENTER" >/dev/null

  echo "$name"
}

ensure_resource_group
STORAGE_ACCOUNT="$(resolve_storage_account)"

az storage blob service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login \
  --static-website \
  --index-document index.html \
  --404-document index.html >/dev/null

ACCOUNT_KEY=""
if ! az storage blob upload-batch \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login \
  --destination '$web' \
  --source "$DOCS_DIR" \
  --overwrite >/dev/null 2>&1; then
  ACCOUNT_KEY="$(az storage account keys list -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" --query '[0].value' -o tsv)"
  az storage blob upload-batch \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$ACCOUNT_KEY" \
    --destination '$web' \
    --source "$DOCS_DIR" \
    --overwrite >/dev/null
fi

DOCS_URL="$(az storage account show -n "$STORAGE_ACCOUNT" -g "$RESOURCE_GROUP" --query "primaryEndpoints.web" -o tsv)"

echo "HUMINEX engineering docs deployed"
echo "Storage account: $STORAGE_ACCOUNT"
echo "URL: $DOCS_URL"
