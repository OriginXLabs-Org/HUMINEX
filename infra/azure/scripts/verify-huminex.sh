#!/usr/bin/env bash
set -euo pipefail

# HUMINEX Azure verification script (read-only)
# - Validates Azure context
# - Verifies required resource group/services
# - Verifies Key Vault security settings and required secrets
# - Verifies Entra app registrations and API scope

LOCATION="${LOCATION:-centralindia}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-kv-huminex}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-${SUBSCRIPTION_ID:-}}"
API_APP_DISPLAY_NAME="${API_APP_DISPLAY_NAME:-huminex-api-app}"
SPA_APP_DISPLAY_NAME="${SPA_APP_DISPLAY_NAME:-huminex-spa-app}"
API_IDENTIFIER_URI="${API_IDENTIFIER_URI:-api://huminex-api}"
API_SCOPE_NAME="${API_SCOPE_NAME:-access_as_user}"
WARN_ONLY="${WARN_ONLY:-false}"

required_kv_secrets=(
  "postgres-admin-password"
  "azuread-tenant-id"
  "azuread-client-id"
  "azuread-audience"
  "postgres-connection-string"
  "servicebus-fully-qualified-namespace"
  "blob-service-uri"
  "appconfig-endpoint"
)

pass_count=0
fail_count=0
warn_count=0

usage() {
  cat <<'EOF'
Usage: verify-huminex.sh [--warn-only] [--help]

Options:
  --warn-only   Do not fail the process on failed checks (exit 0).
  --help        Show this help text.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --warn-only)
        WARN_ONLY="true"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "[ERROR] Unknown argument: $1"
        exit 1
        ;;
    esac
  done
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Required command not found: $1"
    exit 1
  fi
}

pass() {
  pass_count=$((pass_count + 1))
  echo "[PASS] $*"
}

fail() {
  fail_count=$((fail_count + 1))
  echo "[FAIL] $*"
}

warn() {
  warn_count=$((warn_count + 1))
  echo "[WARN] $*"
}

check_cmd() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    pass "${name}"
    return 0
  fi
  fail "${name}"
  return 1
}

check_azure_login() {
  check_cmd "Azure CLI logged in" az account show
}

check_subscription() {
  if [[ -n "${SUBSCRIPTION_ID}" ]]; then
    if az account set --subscription "${SUBSCRIPTION_ID}" >/dev/null 2>&1; then
      pass "Azure subscription set (${SUBSCRIPTION_ID})"
    else
      fail "Azure subscription set (${SUBSCRIPTION_ID})"
    fi
  else
    warn "SUBSCRIPTION_ID not provided; using current az account context."
  fi

  local current_sub current_tenant current_user
  current_sub="$(az account show --query id -o tsv 2>/dev/null || true)"
  current_tenant="$(az account show --query tenantId -o tsv 2>/dev/null || true)"
  current_user="$(az account show --query user.name -o tsv 2>/dev/null || true)"
  echo "[INFO] Context: subscription=${current_sub:-unknown} tenant=${current_tenant:-unknown} user=${current_user:-unknown}"
}

check_resource_group() {
  if check_cmd "Resource group exists (${RESOURCE_GROUP})" az group show --name "${RESOURCE_GROUP}"; then
    local rg_location
    rg_location="$(az group show --name "${RESOURCE_GROUP}" --query location -o tsv 2>/dev/null || true)"
    if [[ -n "${rg_location}" && "${rg_location}" != "${LOCATION}" ]]; then
      warn "Resource group location is '${rg_location}', expected '${LOCATION}'."
    fi
  fi
}

check_key_vault() {
  if ! check_cmd "Key Vault exists (${KEY_VAULT_NAME})" az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}"; then
    return
  fi

  local enabled_template bypass_mode network_acl_json
  enabled_template="$(az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" --query properties.enabledForTemplateDeployment -o tsv 2>/dev/null || true)"
  bypass_mode="$(az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" --query properties.networkAcls.bypass -o tsv 2>/dev/null || true)"
  network_acl_json="$(az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" --query properties.networkAcls -o json 2>/dev/null || true)"

  if [[ "${enabled_template}" == "true" ]]; then
    pass "Key Vault template deployment enabled"
  else
    fail "Key Vault template deployment enabled"
  fi

  if [[ "${bypass_mode}" == "AzureServices" ]]; then
    pass "Key Vault network bypass set to AzureServices"
  elif [[ -z "${bypass_mode}" ]]; then
    pass "Key Vault network ACLs not configured (bypass not required)"
  else
    fail "Key Vault network bypass set to AzureServices"
  fi

  local secret_name
  for secret_name in "${required_kv_secrets[@]}"; do
    if az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "${secret_name}" >/dev/null 2>&1; then
      pass "Key Vault secret exists (${secret_name})"
    else
      fail "Key Vault secret exists (${secret_name})"
    fi
  done
}

check_resource_presence() {
  local aks_count acr_count pg_count sb_count st_count appcfg_count
  aks_count="$(az aks list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"
  acr_count="$(az acr list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"
  pg_count="$(az postgres flexible-server list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"
  sb_count="$(az servicebus namespace list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"
  st_count="$(az storage account list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"
  appcfg_count="$(az appconfig list --resource-group "${RESOURCE_GROUP}" --query "length(@)" -o tsv 2>/dev/null || echo "0")"

  if [[ "${aks_count}" =~ ^[0-9]+$ ]] && (( aks_count > 0 )); then
    pass "AKS cluster present"
  else
    fail "AKS cluster present"
  fi

  if [[ "${acr_count}" =~ ^[0-9]+$ ]] && (( acr_count > 0 )); then
    pass "ACR registry present"
  else
    fail "ACR registry present"
  fi

  if [[ "${pg_count}" =~ ^[0-9]+$ ]] && (( pg_count > 0 )); then
    pass "PostgreSQL flexible server present"
  else
    fail "PostgreSQL flexible server present"
  fi

  if [[ "${sb_count}" =~ ^[0-9]+$ ]] && (( sb_count > 0 )); then
    pass "Service Bus namespace present"
  else
    fail "Service Bus namespace present"
  fi

  if [[ "${st_count}" =~ ^[0-9]+$ ]] && (( st_count > 0 )); then
    pass "Storage account present"
  else
    fail "Storage account present"
  fi

  if [[ "${appcfg_count}" =~ ^[0-9]+$ ]] && (( appcfg_count > 0 )); then
    pass "Azure App Configuration store present"
  else
    fail "Azure App Configuration store present"
  fi
}

check_aks_managed_identity_rbac() {
  local aks_name aks_principal_id sb_id st_id appcfg_id
  aks_name="$(az aks list --resource-group "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)"
  if [[ -z "${aks_name}" ]]; then
    fail "AKS managed identity RBAC checks (AKS cluster missing)"
    return
  fi

  aks_principal_id="$(az aks show --resource-group "${RESOURCE_GROUP}" --name "${aks_name}" --query "identity.principalId" -o tsv 2>/dev/null || true)"
  if [[ -z "${aks_principal_id}" || "${aks_principal_id}" == "null" ]]; then
    fail "AKS managed identity principal resolved"
    return
  fi
  pass "AKS managed identity principal resolved"

  sb_id="$(az servicebus namespace list --resource-group "${RESOURCE_GROUP}" --query "[0].id" -o tsv 2>/dev/null || true)"
  st_id="$(az storage account list --resource-group "${RESOURCE_GROUP}" --query "[0].id" -o tsv 2>/dev/null || true)"
  appcfg_id="$(az appconfig list --resource-group "${RESOURCE_GROUP}" --query "[0].id" -o tsv 2>/dev/null || true)"

  if [[ -n "${sb_id}" ]]; then
    if az role assignment list --scope "${sb_id}" --assignee "${aks_principal_id}" --query "[?roleDefinitionName=='Azure Service Bus Data Owner'] | length(@)" -o tsv 2>/dev/null | grep -Eq '^[1-9][0-9]*$'; then
      pass "AKS managed identity has Service Bus Data Owner"
    else
      fail "AKS managed identity has Service Bus Data Owner"
    fi
  else
    fail "Service Bus namespace id resolved for RBAC check"
  fi

  if [[ -n "${st_id}" ]]; then
    if az role assignment list --scope "${st_id}" --assignee "${aks_principal_id}" --query "[?roleDefinitionName=='Storage Blob Data Contributor'] | length(@)" -o tsv 2>/dev/null | grep -Eq '^[1-9][0-9]*$'; then
      pass "AKS managed identity has Storage Blob Data Contributor"
    else
      fail "AKS managed identity has Storage Blob Data Contributor"
    fi
  else
    fail "Storage account id resolved for RBAC check"
  fi

  if [[ -n "${appcfg_id}" ]]; then
    if az role assignment list --scope "${appcfg_id}" --assignee "${aks_principal_id}" --query "[?roleDefinitionName=='App Configuration Data Reader'] | length(@)" -o tsv 2>/dev/null | grep -Eq '^[1-9][0-9]*$'; then
      pass "AKS managed identity has App Configuration Data Reader"
    else
      fail "AKS managed identity has App Configuration Data Reader"
    fi
  else
    fail "App Configuration id resolved for RBAC check"
  fi
}

check_entra_apps() {
  local api_app_id spa_app_id scope_id
  api_app_id="$(az ad app list --display-name "${API_APP_DISPLAY_NAME}" --query "[0].appId" -o tsv 2>/dev/null || true)"
  spa_app_id="$(az ad app list --display-name "${SPA_APP_DISPLAY_NAME}" --query "[0].appId" -o tsv 2>/dev/null || true)"

  if [[ -n "${api_app_id}" ]]; then
    pass "Entra API app exists (${API_APP_DISPLAY_NAME})"
  else
    fail "Entra API app exists (${API_APP_DISPLAY_NAME})"
  fi

  if [[ -n "${spa_app_id}" ]]; then
    pass "Entra SPA app exists (${SPA_APP_DISPLAY_NAME})"
  else
    fail "Entra SPA app exists (${SPA_APP_DISPLAY_NAME})"
  fi

  if [[ -n "${api_app_id}" ]]; then
    local identifier_uri
    identifier_uri="$(az ad app show --id "${api_app_id}" --query "identifierUris[0]" -o tsv 2>/dev/null || true)"
    if [[ "${identifier_uri}" == "${API_IDENTIFIER_URI}" ]]; then
      pass "API identifier URI matches (${API_IDENTIFIER_URI})"
    elif [[ "${identifier_uri}" == "api://${api_app_id}" ]]; then
      pass "API identifier URI uses tenant policy-safe appId format (api://${api_app_id})"
    else
      fail "API identifier URI matches (${API_IDENTIFIER_URI})"
    fi

    scope_id="$(az ad app show --id "${api_app_id}" --query "api.oauth2PermissionScopes[?value=='${API_SCOPE_NAME}'] | [0].id" -o tsv 2>/dev/null || true)"
    if [[ -n "${scope_id}" && "${scope_id}" != "null" ]]; then
      pass "API delegated scope exists (${API_SCOPE_NAME})"
    else
      fail "API delegated scope exists (${API_SCOPE_NAME})"
    fi
  fi
}

print_summary() {
  echo
  echo "========== HUMINEX Azure Verification Summary =========="
  echo "PASS: ${pass_count}"
  echo "FAIL: ${fail_count}"
  echo "WARN: ${warn_count}"
  echo "========================================================"
}

main() {
  parse_args "$@"
  require_cmd az

  check_azure_login
  if ! az account show >/dev/null 2>&1; then
    print_summary
    if [[ "${WARN_ONLY}" == "true" ]]; then
      exit 0
    fi
    exit 1
  fi

  check_subscription
  check_resource_group
  check_key_vault
  check_resource_presence
  check_aks_managed_identity_rbac
  check_entra_apps
  print_summary

  if (( fail_count > 0 )) && [[ "${WARN_ONLY}" != "true" ]]; then
    exit 1
  fi
}

main "$@"
