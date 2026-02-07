#!/usr/bin/env bash
set -euo pipefail

# HUMINEX Azure bootstrap script
# - Verifies Azure login and subscription
# - Ensures resource group and key vault
# - Ensures postgres admin password secret exists in Key Vault
# - Deploys/updates Bicep infra stack
# - Creates/checks Entra app registrations (API + SPA)
# - Prints final details for local/.env and CI usage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

LOCATION="${LOCATION:-centralindia}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
NAME_PREFIX="${NAME_PREFIX:-huminex}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-kv-huminex}"
POSTGRES_ADMIN_SECRET_NAME="${POSTGRES_ADMIN_SECRET_NAME:-postgres-admin-password}"
POSTGRES_ADMIN_USERNAME="${POSTGRES_ADMIN_USERNAME:-huminexadmin}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-${SUBSCRIPTION_ID:-}}"
TENANT_ID_OVERRIDE="${AZURE_TENANT_ID:-${TENANT_ID:-}}"
FRONTEND_REDIRECT_URI="${FRONTEND_REDIRECT_URI:-http://localhost:8080}"

API_APP_DISPLAY_NAME="${API_APP_DISPLAY_NAME:-huminex-api-app}"
SPA_APP_DISPLAY_NAME="${SPA_APP_DISPLAY_NAME:-huminex-spa-app}"
API_IDENTIFIER_URI="${API_IDENTIFIER_URI:-api://huminex-api}"
API_SCOPE_NAME="${API_SCOPE_NAME:-access_as_user}"
API_SCOPE_DISPLAY="${API_SCOPE_DISPLAY:-Access HUMINEX API}"
API_SCOPE_DESC="${API_SCOPE_DESC:-Allow access to HUMINEX API on behalf of the signed-in user.}"
RESOLVED_API_IDENTIFIER_URI="${RESOLVED_API_IDENTIFIER_URI:-}"

BICEP_TEMPLATE="${REPO_ROOT}/infra/azure/bicep/main.subscription.bicep"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-huminex-platform-${ENVIRONMENT}-${LOCATION}}"
DRY_RUN="${DRY_RUN:-false}"
RESET_RG="${RESET_RG:-false}"
PRESERVED_POSTGRES_ADMIN_PASSWORD="${PRESERVED_POSTGRES_ADMIN_PASSWORD:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1"
    exit 1
  fi
}

generate_strong_password() {
  # 32-char password with upper/lower/number/symbol to satisfy Azure PostgreSQL complexity.
  local pw
  while true; do
    set +o pipefail
    pw="$(LC_ALL=C tr -dc 'A-Za-z0-9!@#%^*_+-=' </dev/urandom | head -c 32)"
    set -o pipefail
    if [[ ${#pw} -ge 24 ]]; then
      printf '%s' "${pw}"
      return 0
    fi
  done
}

info() {
  echo "[INFO] $*"
}

warn() {
  echo "[WARN] $*"
}

error() {
  echo "[ERROR] $*"
  exit 1
}

usage() {
  cat <<'EOF'
Usage: huminex-bootstrap.sh [--dry-run] [--help]

Options:
  --dry-run   Print mutating Azure actions without executing them.
  --reset-rg  Delete and recreate the resource group before deployment.
  --help      Show this help text.

Environment overrides:
  SUBSCRIPTION_ID, LOCATION, RESOURCE_GROUP, KEY_VAULT_NAME, NAME_PREFIX,
  ENVIRONMENT, POSTGRES_ADMIN_PASSWORD, FRONTEND_REDIRECT_URI, and others.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      --reset-rg)
        RESET_RG="true"
        shift
        ;;
      *)
        error "Unknown argument: $1"
        ;;
    esac
  done
}

run_mutation() {
  local cmd=("$@")
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY-RUN] ${cmd[*]}" >&2
    return 0
  fi
  "${cmd[@]}"
}

wait_for_keyvault_purge() {
  local attempt max_attempts
  attempt=0
  max_attempts=60

  while (( attempt < max_attempts )); do
    if [[ "$(az keyvault list-deleted --query "[?name=='${KEY_VAULT_NAME}'] | length(@)" -o tsv 2>/dev/null || echo "0")" == "0" ]]; then
      return 0
    fi
    sleep 5
    attempt=$((attempt + 1))
  done

  return 1
}

ensure_required_resource_providers() {
  local providers
  providers=(
    "Microsoft.ContainerService"
    "Microsoft.OperationalInsights"
    "Microsoft.OperationsManagement"
    "Microsoft.Insights"
    "Microsoft.DBforPostgreSQL"
    "Microsoft.KeyVault"
    "Microsoft.ContainerRegistry"
    "Microsoft.ServiceBus"
    "Microsoft.Storage"
    "Microsoft.AppConfiguration"
  )

  local ns
  for ns in "${providers[@]}"; do
    local state
    state="$(az provider show --namespace "${ns}" --query registrationState -o tsv 2>/dev/null || true)"
    if [[ "${state}" != "Registered" ]]; then
      run_mutation az provider register --namespace "${ns}" >/dev/null
      run_mutation az provider register --namespace "${ns}" --wait >/dev/null
    fi
  done
}

ensure_keyvault_secret_set_access() {
  local kv_id current_user_oid existing_assignment_count
  kv_id="$(az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" --query id -o tsv 2>/dev/null || true)"
  current_user_oid="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)"

  if [[ -z "${kv_id}" || -z "${current_user_oid}" ]]; then
    warn "Unable to resolve current user object id for Key Vault RBAC assignment. Ensure your user has 'Key Vault Secrets Officer' on ${KEY_VAULT_NAME}."
    return
  fi

  existing_assignment_count="$(az role assignment list \
    --scope "${kv_id}" \
    --assignee-object-id "${current_user_oid}" \
    --query "[?roleDefinitionName=='Key Vault Secrets Officer'] | length(@)" -o tsv 2>/dev/null || echo "0")"

  if [[ "${existing_assignment_count}" == "0" ]]; then
    run_mutation az role assignment create \
      --assignee-object-id "${current_user_oid}" \
      --assignee-principal-type User \
      --role "Key Vault Secrets Officer" \
      --scope "${kv_id}" >/dev/null
    warn "Assigned 'Key Vault Secrets Officer' to current user. RBAC propagation may take 30-120 seconds."
    if [[ "${DRY_RUN}" != "true" ]]; then
      sleep 20
    fi
  fi
}

ensure_azure_login() {
  info "Checking Azure CLI login..."
  if ! az account show >/dev/null 2>&1; then
    info "Not logged in. Running az login..."
    run_mutation az login >/dev/null
  fi

  if [[ -n "${SUBSCRIPTION_ID}" ]]; then
    info "Setting Azure subscription: ${SUBSCRIPTION_ID}"
    run_mutation az account set --subscription "${SUBSCRIPTION_ID}"
  fi
}

print_azure_context() {
  info "Azure context:"
  az account show --query '{subscriptionId:id, subscriptionName:name, tenantId:tenantId, user:user.name}' -o table
}

ensure_resource_group() {
  info "Ensuring resource group ${RESOURCE_GROUP} in ${LOCATION}..."
  if ! az group show --name "${RESOURCE_GROUP}" >/dev/null 2>&1; then
    run_mutation az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" >/dev/null
    if [[ "${DRY_RUN}" == "true" ]]; then
      warn "Resource group ${RESOURCE_GROUP} is missing. Dry-run skipped creation."
      return
    fi
  else
    local existing_location
    existing_location="$(az group show --name "${RESOURCE_GROUP}" --query location -o tsv)"

    if [[ "${RESET_RG}" == "true" ]]; then
      info "Reset requested. Backing up postgres admin secret (if present) before deleting ${RESOURCE_GROUP}..."
      if az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" >/dev/null 2>&1; then
        PRESERVED_POSTGRES_ADMIN_PASSWORD="$(az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "${POSTGRES_ADMIN_SECRET_NAME}" --query value -o tsv 2>/dev/null || true)"
      fi

      run_mutation az group delete --name "${RESOURCE_GROUP}" --yes >/dev/null
      if [[ "${DRY_RUN}" == "true" ]]; then
        warn "Resource group ${RESOURCE_GROUP} exists and would be deleted/recreated in ${LOCATION}."
        return
      fi
      run_mutation az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" >/dev/null
    elif [[ "${existing_location}" != "${LOCATION}" ]]; then
      error "Resource group ${RESOURCE_GROUP} exists in ${existing_location}. Re-run with --reset-rg to recreate it in ${LOCATION}."
    fi
  fi
  az group show --name "${RESOURCE_GROUP}" --query '{name:name, location:location, id:id}' -o table
}

ensure_key_vault() {
  info "Ensuring Key Vault ${KEY_VAULT_NAME} in ${RESOURCE_GROUP}..."
  if ! az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" >/dev/null 2>&1; then
    if ! run_mutation az keyvault create \
      --name "${KEY_VAULT_NAME}" \
      --resource-group "${RESOURCE_GROUP}" \
      --location "${LOCATION}" \
      --enable-rbac-authorization true >/dev/null; then
      local deleted_vault_location
      deleted_vault_location="$(az keyvault list-deleted --query "[?name=='${KEY_VAULT_NAME}'] | [0].properties.location" -o tsv 2>/dev/null || true)"
      if [[ -n "${deleted_vault_location}" ]]; then
        warn "Soft-deleted Key Vault ${KEY_VAULT_NAME} found in ${deleted_vault_location}. Purging and retrying create."
        run_mutation az keyvault purge --name "${KEY_VAULT_NAME}" --location "${deleted_vault_location}" --no-wait >/dev/null
        if ! wait_for_keyvault_purge; then
          error "Timed out waiting for Key Vault ${KEY_VAULT_NAME} purge to complete."
        fi
        run_mutation az keyvault create \
          --name "${KEY_VAULT_NAME}" \
          --resource-group "${RESOURCE_GROUP}" \
          --location "${LOCATION}" \
          --enable-rbac-authorization true >/dev/null
      else
        error "Key Vault name ${KEY_VAULT_NAME} is unavailable and no soft-deleted vault owned by this subscription was found. Set KEY_VAULT_NAME to a unique value and retry."
      fi
    fi
    if [[ "${DRY_RUN}" == "true" ]]; then
      warn "Key Vault ${KEY_VAULT_NAME} is missing. Dry-run skipped creation."
      return
    fi
  fi
  run_mutation az keyvault update \
    --name "${KEY_VAULT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --bypass AzureServices \
    --enabled-for-template-deployment true >/dev/null
  ensure_keyvault_secret_set_access
  az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" --query '{name:name, vaultUri:properties.vaultUri}' -o table
}

ensure_postgres_admin_secret() {
  info "Checking Key Vault secret: ${POSTGRES_ADMIN_SECRET_NAME}"
  if az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "${POSTGRES_ADMIN_SECRET_NAME}" >/dev/null 2>&1; then
    info "Secret exists."
    return
  fi

  local postgres_admin_password="${POSTGRES_ADMIN_PASSWORD:-}"
  if [[ -z "${postgres_admin_password}" && -n "${PRESERVED_POSTGRES_ADMIN_PASSWORD}" ]]; then
    postgres_admin_password="${PRESERVED_POSTGRES_ADMIN_PASSWORD}"
  fi
  if [[ -z "${postgres_admin_password}" ]]; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      warn "Secret ${POSTGRES_ADMIN_SECRET_NAME} missing. Dry-run skipped secret creation."
      return
    fi
    if [[ -t 0 ]]; then
      read -r -s -p "Enter PostgreSQL admin password for secret ${POSTGRES_ADMIN_SECRET_NAME}: " postgres_admin_password
      echo
    else
      warn "Secret ${POSTGRES_ADMIN_SECRET_NAME} not found and no POSTGRES_ADMIN_PASSWORD provided. Generating a strong password automatically."
      postgres_admin_password="$(generate_strong_password)"
    fi
  fi

  run_mutation az keyvault secret set \
    --vault-name "${KEY_VAULT_NAME}" \
    --name "${POSTGRES_ADMIN_SECRET_NAME}" \
    --value "${postgres_admin_password}" >/dev/null
  info "Secret ${POSTGRES_ADMIN_SECRET_NAME} created."
}

ensure_runtime_secrets() {
  local tenant_id app_api_client_id audience postgres_conn
  tenant_id="$(az account show --query tenantId -o tsv)"
  app_api_client_id="$(az ad app list --display-name "${API_APP_DISPLAY_NAME}" --query '[0].appId' -o tsv 2>/dev/null || true)"
  audience="${RESOLVED_API_IDENTIFIER_URI:-${API_IDENTIFIER_URI}}"

  # Build postgres connection string only if server already exists.
  local postgres_fqdn
  postgres_fqdn="$(az postgres flexible-server list --resource-group "${RESOURCE_GROUP}" --query '[0].fullyQualifiedDomainName' -o tsv 2>/dev/null || true)"
  local servicebus_namespace blob_service_uri appconfig_endpoint
  servicebus_namespace="$(az servicebus namespace list --resource-group "${RESOURCE_GROUP}" --query '[0].serviceBusEndpoint' -o tsv 2>/dev/null || true)"
  servicebus_namespace="${servicebus_namespace#sb://}"
  servicebus_namespace="${servicebus_namespace%/}"
  blob_service_uri="$(az storage account list --resource-group "${RESOURCE_GROUP}" --query '[0].primaryEndpoints.blob' -o tsv 2>/dev/null || true)"
  appconfig_endpoint="$(az appconfig list --resource-group "${RESOURCE_GROUP}" --query '[0].endpoint' -o tsv 2>/dev/null || true)"
  if [[ -n "${postgres_fqdn}" ]]; then
    postgres_conn="Host=${postgres_fqdn};Port=5432;Database=huminex;Username=${POSTGRES_ADMIN_USERNAME};Password=<FROM-KEYVAULT>;SSL Mode=Require;Trust Server Certificate=true"
  else
    postgres_conn=""
  fi

  # Ensure runtime secrets if missing. Values can be updated later manually.
  if ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "azuread-tenant-id" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "azuread-tenant-id" --value "${TENANT_ID_OVERRIDE:-${tenant_id}}" >/dev/null
  fi
  if [[ -n "${app_api_client_id}" ]] && ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "azuread-client-id" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "azuread-client-id" --value "${app_api_client_id}" >/dev/null
  fi
  if ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "azuread-audience" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "azuread-audience" --value "${audience}" >/dev/null
  fi
  if [[ -n "${postgres_conn}" ]] && ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "postgres-connection-string" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "postgres-connection-string" --value "${postgres_conn}" >/dev/null
  fi
  if [[ -n "${servicebus_namespace}" ]] && ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "servicebus-fully-qualified-namespace" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "servicebus-fully-qualified-namespace" --value "${servicebus_namespace}" >/dev/null
  fi
  if [[ -n "${blob_service_uri}" ]] && ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "blob-service-uri" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "blob-service-uri" --value "${blob_service_uri}" >/dev/null
  fi
  if [[ -n "${appconfig_endpoint}" ]] && ! az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "appconfig-endpoint" >/dev/null 2>&1; then
    run_mutation az keyvault secret set --vault-name "${KEY_VAULT_NAME}" --name "appconfig-endpoint" --value "${appconfig_endpoint}" >/dev/null
  fi
}

deploy_infrastructure() {
  local deployment_name existing_location
  deployment_name="${DEPLOYMENT_NAME}"

  existing_location="$(az deployment sub show --name "${deployment_name}" --query location -o tsv 2>/dev/null || true)"
  if [[ -n "${existing_location}" && "${existing_location}" != "${LOCATION}" ]]; then
    deployment_name="${deployment_name}-$(date +%Y%m%d%H%M%S)"
    warn "Deployment name location lock detected (${existing_location}). Using new deployment name: ${deployment_name}"
  fi

  info "Deploying/updating infrastructure via Bicep..."
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY-RUN] az deployment sub validate --name ${deployment_name}-validate --location ${LOCATION} --template-file ${BICEP_TEMPLATE} --parameters resourceGroupName=${RESOURCE_GROUP} location=${LOCATION} environment=${ENVIRONMENT} namePrefix=${NAME_PREFIX} keyVaultName=${KEY_VAULT_NAME} postgresAdminUsername=${POSTGRES_ADMIN_USERNAME} postgresAdminPasswordSecretName=${POSTGRES_ADMIN_SECRET_NAME}"
    if ! az deployment sub validate \
      --name "${deployment_name}-validate" \
      --location "${LOCATION}" \
      --template-file "${BICEP_TEMPLATE}" \
      --parameters \
        resourceGroupName="${RESOURCE_GROUP}" \
        location="${LOCATION}" \
        environment="${ENVIRONMENT}" \
        namePrefix="${NAME_PREFIX}" \
        keyVaultName="${KEY_VAULT_NAME}" \
        postgresAdminUsername="${POSTGRES_ADMIN_USERNAME}" \
        postgresAdminPasswordSecretName="${POSTGRES_ADMIN_SECRET_NAME}" >/dev/null; then
      warn "Bicep validate returned errors in dry-run (often expected if dependent resources are not present yet)."
    fi
    info "Dry run validation completed. No resources were changed."
    return
  fi

  az deployment sub create \
      --name "${deployment_name}" \
      --location "${LOCATION}" \
      --template-file "${BICEP_TEMPLATE}" \
      --parameters \
        resourceGroupName="${RESOURCE_GROUP}" \
        location="${LOCATION}" \
        environment="${ENVIRONMENT}" \
        namePrefix="${NAME_PREFIX}" \
        keyVaultName="${KEY_VAULT_NAME}" \
        postgresAdminUsername="${POSTGRES_ADMIN_USERNAME}" \
        postgresAdminPasswordSecretName="${POSTGRES_ADMIN_SECRET_NAME}" >/dev/null

  info "Deployment outputs:"
  az deployment sub show \
    --name "${deployment_name}" \
    --query properties.outputs -o json
}

ensure_entra_app_api() {
  info "Ensuring Entra API app registration: ${API_APP_DISPLAY_NAME}"
  local app_id object_id effective_identifier_uri
  app_id="$(az ad app list --display-name "${API_APP_DISPLAY_NAME}" --query '[0].appId' -o tsv)"

  if [[ -z "${app_id}" ]]; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      run_mutation az ad app create \
        --display-name "${API_APP_DISPLAY_NAME}" \
        --sign-in-audience "AzureADMyOrg" \
        --query appId -o tsv >/dev/null
      warn "API app ${API_APP_DISPLAY_NAME} is missing. Dry-run skipped creation."
      return
    fi

    app_id="$(az ad app create \
      --display-name "${API_APP_DISPLAY_NAME}" \
      --sign-in-audience "AzureADMyOrg" \
      --query appId -o tsv)"
  fi

  object_id="$(az ad app show --id "${app_id}" --query id -o tsv)"
  effective_identifier_uri="${API_IDENTIFIER_URI}"

  # Ensure identifier URI is aligned; fallback to policy-safe api://<appId> when tenant policy blocks custom URI.
  if ! run_mutation az ad app update --id "${app_id}" --identifier-uris "${effective_identifier_uri}" >/dev/null; then
    effective_identifier_uri="api://${app_id}"
    warn "Tenant policy rejected identifier URI ${API_IDENTIFIER_URI}. Falling back to ${effective_identifier_uri}."
    run_mutation az ad app update --id "${app_id}" --identifier-uris "${effective_identifier_uri}" >/dev/null
  fi
  RESOLVED_API_IDENTIFIER_URI="${effective_identifier_uri}"

  # Ensure exposed delegated scope exists.
  local scope_id existing_scope_json scope_payload
  existing_scope_json="$(az ad app show --id "${app_id}" --query "api.oauth2PermissionScopes[?value=='${API_SCOPE_NAME}'] | [0]" -o json)"
  if [[ "${existing_scope_json}" == "null" ]]; then
    scope_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    scope_payload="$(cat <<JSON
{"api":{"oauth2PermissionScopes":[{"adminConsentDescription":"${API_SCOPE_DESC}","adminConsentDisplayName":"${API_SCOPE_DISPLAY}","id":"${scope_id}","isEnabled":true,"type":"User","userConsentDescription":"${API_SCOPE_DESC}","userConsentDisplayName":"${API_SCOPE_DISPLAY}","value":"${API_SCOPE_NAME}"}]}}
JSON
)"
    if [[ "${DRY_RUN}" == "true" ]]; then
      echo "[DRY-RUN] az rest --method PATCH --uri https://graph.microsoft.com/v1.0/applications/${object_id} --headers Content-Type=application/json --body <scope-payload>"
    else
      az rest \
        --method PATCH \
        --uri "https://graph.microsoft.com/v1.0/applications/${object_id}" \
        --headers "Content-Type=application/json" \
        --body "${scope_payload}" >/dev/null
    fi
  fi

  echo
  info "API App Registration"
  az ad app show --id "${app_id}" --query '{displayName:displayName, appId:appId, objectId:id, identifierUris:identifierUris}' -o table
}

ensure_entra_app_spa() {
  info "Ensuring Entra SPA app registration: ${SPA_APP_DISPLAY_NAME}"
  local spa_app_id api_app_id api_scope_id api_resource_access_json
  spa_app_id="$(az ad app list --display-name "${SPA_APP_DISPLAY_NAME}" --query '[0].appId' -o tsv)"
  api_app_id="$(az ad app list --display-name "${API_APP_DISPLAY_NAME}" --query '[0].appId' -o tsv)"

  if [[ -z "${api_app_id}" ]]; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      warn "API app registration ${API_APP_DISPLAY_NAME} was not found. Dry-run skipped SPA app validation/creation."
      return
    fi
    error "API app registration ${API_APP_DISPLAY_NAME} was not found."
  fi

  local attempt
  attempt=0
  while (( attempt < 12 )); do
    api_scope_id="$(az ad app show --id "${api_app_id}" --query "api.oauth2PermissionScopes[?value=='${API_SCOPE_NAME}'] | [0].id" -o tsv 2>/dev/null || true)"
    if [[ -z "${api_scope_id}" || "${api_scope_id}" == "null" ]]; then
      api_scope_id="$(az ad app show --id "${api_app_id}" --query "api.oauth2PermissionScopes[0].id" -o tsv 2>/dev/null || true)"
    fi
    if [[ -n "${api_scope_id}" && "${api_scope_id}" != "null" ]]; then
      break
    fi
    sleep 5
    attempt=$((attempt + 1))
  done

  if [[ -z "${api_scope_id}" || "${api_scope_id}" == "null" ]]; then
    error "API scope id is not available for ${API_APP_DISPLAY_NAME}. Ensure delegated scope '${API_SCOPE_NAME}' exists and retry."
  fi

  api_resource_access_json="[{\"resourceAppId\":\"${api_app_id}\",\"resourceAccess\":[{\"id\":\"${api_scope_id}\",\"type\":\"Scope\"}]}]"

  if [[ -z "${spa_app_id}" ]]; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      run_mutation az ad app create \
        --display-name "${SPA_APP_DISPLAY_NAME}" \
        --sign-in-audience "AzureADMyOrg" \
        --web-redirect-uris "${FRONTEND_REDIRECT_URI}" \
        --required-resource-accesses "${api_resource_access_json}" \
        --query appId -o tsv >/dev/null
      warn "SPA app ${SPA_APP_DISPLAY_NAME} is missing. Dry-run skipped creation."
      return
    fi

    spa_app_id="$(az ad app create \
      --display-name "${SPA_APP_DISPLAY_NAME}" \
      --sign-in-audience "AzureADMyOrg" \
      --web-redirect-uris "${FRONTEND_REDIRECT_URI}" \
      --required-resource-accesses "${api_resource_access_json}" \
      --query appId -o tsv)"
  else
    run_mutation az ad app update \
      --id "${spa_app_id}" \
      --web-redirect-uris "${FRONTEND_REDIRECT_URI}" \
      --required-resource-accesses "${api_resource_access_json}" >/dev/null
  fi

  echo
  info "SPA App Registration"
  az ad app show --id "${spa_app_id}" --query '{displayName:displayName, appId:appId, objectId:id, redirectUris:web.redirectUris}' -o table
}

print_resource_summary() {
  echo
  info "Resource summary in ${RESOURCE_GROUP}:"
  az resource list --resource-group "${RESOURCE_GROUP}" --query "[].{name:name, type:type, location:location}" -o table

  local aks_name acr_login postgres_fqdn
  aks_name="$(az aks list --resource-group "${RESOURCE_GROUP}" --query '[0].name' -o tsv 2>/dev/null || true)"
  acr_login="$(az acr list --resource-group "${RESOURCE_GROUP}" --query '[0].loginServer' -o tsv 2>/dev/null || true)"
  postgres_fqdn="$(az postgres flexible-server list --resource-group "${RESOURCE_GROUP}" --query '[0].fullyQualifiedDomainName' -o tsv 2>/dev/null || true)"

  echo
  info "Key output values:"
  echo "RESOURCE_GROUP=${RESOURCE_GROUP}"
  echo "KEY_VAULT_NAME=${KEY_VAULT_NAME}"
  echo "AKS_CLUSTER=${aks_name}"
  echo "ACR_LOGIN_SERVER=${acr_login}"
  echo "POSTGRES_FQDN=${postgres_fqdn}"
}

main() {
  parse_args "$@"
  require_cmd az
  require_cmd uuidgen

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "Dry-run mode enabled. Mutating actions will be printed and skipped."
  fi
  if [[ "${RESET_RG}" == "true" ]]; then
    warn "Reset mode enabled. Resource group ${RESOURCE_GROUP} will be deleted and recreated."
  fi

  ensure_azure_login
  print_azure_context
  ensure_required_resource_providers
  ensure_resource_group
  ensure_key_vault
  ensure_postgres_admin_secret
  deploy_infrastructure
  ensure_entra_app_api
  ensure_entra_app_spa
  ensure_runtime_secrets
  print_resource_summary

  echo
  info "HUMINEX Azure bootstrap completed."
}

main "$@"
