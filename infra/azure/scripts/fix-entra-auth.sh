#!/usr/bin/env bash
set -euo pipefail

# HUMINEX Entra SPA + API auth fixer/validator
# - Non-destructive: does NOT delete apps
# - Fixes missing SPs, delegated permission, consent, redirect URIs
# - Optionally assigns app role to a user

TENANT_ID="${TENANT_ID:-798c33e1-22be-463e-be2f-2920646fa78c}"
API_APP_ID="${API_APP_ID:-40efefe7-8bc1-4452-9261-8f1973a0b5fa}"
SPA_APP_ID="${SPA_APP_ID:-8585bece-66ed-405c-bfa5-568689345f91}"
API_SCOPE_VALUE="${API_SCOPE_VALUE:-access_as_user}"
REDIRECT_URIS_DEFAULT=("http://localhost:8080" "https://www.gethuminex.com")
ROLE_TO_ASSIGN="${ROLE_TO_ASSIGN:-Admin}"
ASSIGN_ROLE="${ASSIGN_ROLE:-true}"
TARGET_USER_OBJECT_ID="${TARGET_USER_OBJECT_ID:-}"
DRY_RUN="${DRY_RUN:-false}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Options:
  --dry-run                     Print mutating commands only
  --tenant-id <tenant-id>       Entra tenant id (default: ${TENANT_ID})
  --api-app-id <app-id>         API app registration appId (default: ${API_APP_ID})
  --spa-app-id <app-id>         SPA app registration appId (default: ${SPA_APP_ID})
  --scope <scope>               Delegated scope value (default: ${API_SCOPE_VALUE})
  --role <Admin|Employer|Employee>  App role to assign (default: ${ROLE_TO_ASSIGN})
  --target-user-oid <oid>       Specific user object id for role assignment
  --no-role-assignment          Skip user app-role assignment
  -h, --help                    Show help

Env alternatives:
  TENANT_ID, API_APP_ID, SPA_APP_ID, API_SCOPE_VALUE, ROLE_TO_ASSIGN,
  TARGET_USER_OBJECT_ID, ASSIGN_ROLE, DRY_RUN
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --api-app-id) API_APP_ID="$2"; shift 2 ;;
    --spa-app-id) SPA_APP_ID="$2"; shift 2 ;;
    --scope) API_SCOPE_VALUE="$2"; shift 2 ;;
    --role) ROLE_TO_ASSIGN="$2"; shift 2 ;;
    --target-user-oid) TARGET_USER_OBJECT_ID="$2"; shift 2 ;;
    --no-role-assignment) ASSIGN_ROLE=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] $*"
  else
    eval "$@"
  fi
}

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }; }
need_cmd az
need_cmd jq

pass() { echo "[PASS] $*"; }
warn() { echo "[WARN] $*"; }
info() { echo "[INFO] $*"; }

info "Checking Azure login and tenant..."
if ! az account show >/dev/null 2>&1; then
  echo "Azure CLI not logged in. Run: az login" >&2
  exit 1
fi
CURRENT_TENANT="$(az account show --query tenantId -o tsv)"
if [[ "$CURRENT_TENANT" != "$TENANT_ID" ]]; then
  warn "Current tenant is ${CURRENT_TENANT}, expected ${TENANT_ID}. Continuing with current context."
fi

info "Validating app registrations..."
API_APP_OBJ_ID="$(az ad app show --id "$API_APP_ID" --query id -o tsv)"
SPA_APP_OBJ_ID="$(az ad app show --id "$SPA_APP_ID" --query id -o tsv)"
pass "App registrations found (API + SPA)."

info "Ensuring service principals exist..."
if ! az ad sp show --id "${API_APP_ID}" >/dev/null 2>&1; then
  run "az ad sp create --id ${API_APP_ID} -o none"
fi
if ! az ad sp show --id "${SPA_APP_ID}" >/dev/null 2>&1; then
  run "az ad sp create --id ${SPA_APP_ID} -o none"
fi
API_SP_ID="$(az ad sp show --id "$API_APP_ID" --query id -o tsv)"
SPA_SP_ID="$(az ad sp show --id "$SPA_APP_ID" --query id -o tsv)"
pass "Service principals present. API SP=${API_SP_ID}, SPA SP=${SPA_SP_ID}"

info "Reading API delegated scope and role IDs..."
SCOPE_ID="$(az ad app show --id "$API_APP_ID" --query "api.oauth2PermissionScopes[?value=='${API_SCOPE_VALUE}'].id | [0]" -o tsv)"
if [[ -z "$SCOPE_ID" || "$SCOPE_ID" == "null" ]]; then
  echo "Delegated scope '${API_SCOPE_VALUE}' not found on API app." >&2
  exit 1
fi
ROLE_ID="$(az ad app show --id "$API_APP_ID" --query "appRoles[?value=='${ROLE_TO_ASSIGN}'].id | [0]" -o tsv)"
if [[ "$ASSIGN_ROLE" == "true" && ( -z "$ROLE_ID" || "$ROLE_ID" == "null" ) ]]; then
  echo "Role '${ROLE_TO_ASSIGN}' not found on API app." >&2
  exit 1
fi
pass "Scope and role metadata resolved."

info "Setting API token version to v2..."
run "az ad app update --id ${API_APP_OBJ_ID} --requested-access-token-version 2"

info "Setting SPA requiredResourceAccess -> API delegated scope..."
TMP_REQ="$(mktemp)"
cat > "$TMP_REQ" <<JSON
[
  {
    "resourceAppId": "${API_APP_ID}",
    "resourceAccess": [
      {
        "id": "${SCOPE_ID}",
        "type": "Scope"
      }
    ]
  }
]
JSON
run "az ad app update --id ${SPA_APP_OBJ_ID} --required-resource-accesses @${TMP_REQ}"

info "Setting SPA redirect URIs on SPA platform..."
TMP_PATCH="$(mktemp)"
cat > "$TMP_PATCH" <<JSON
{
  "spa": {
    "redirectUris": [
      "${REDIRECT_URIS_DEFAULT[0]}",
      "${REDIRECT_URIS_DEFAULT[1]}"
    ]
  }
}
JSON
run "az rest --method PATCH --uri https://graph.microsoft.com/v1.0/applications/${SPA_APP_OBJ_ID} --headers Content-Type=application/json --body @${TMP_PATCH}"

info "Granting delegated consent + admin consent..."
run "az ad app permission grant --id ${SPA_APP_ID} --api ${API_APP_ID} --scope ${API_SCOPE_VALUE}"
run "az ad app permission admin-consent --id ${SPA_APP_ID}"

if [[ "$ASSIGN_ROLE" == "true" ]]; then
  if [[ -z "$TARGET_USER_OBJECT_ID" ]]; then
    TARGET_USER_OBJECT_ID="$(az ad signed-in-user show --query id -o tsv)"
  fi
  if [[ -n "$TARGET_USER_OBJECT_ID" && "$TARGET_USER_OBJECT_ID" != "null" ]]; then
    info "Assigning role '${ROLE_TO_ASSIGN}' to user ${TARGET_USER_OBJECT_ID}..."
    TMP_ASSIGN="$(mktemp)"
    cat > "$TMP_ASSIGN" <<JSON
{
  "principalId": "${TARGET_USER_OBJECT_ID}",
  "resourceId": "${API_SP_ID}",
  "appRoleId": "${ROLE_ID}"
}
JSON
    EXISTING_ROLE_COUNT="$(az rest --method GET --uri "https://graph.microsoft.com/v1.0/users/${TARGET_USER_OBJECT_ID}/appRoleAssignments" -o json | jq --arg API_SP "$API_SP_ID" --arg ROLE "$ROLE_ID" '[.value[] | select(.resourceId==$API_SP and .appRoleId==$ROLE)] | length')"
    if [[ "$EXISTING_ROLE_COUNT" == "0" ]]; then
      run "az rest --method POST --uri https://graph.microsoft.com/v1.0/users/${TARGET_USER_OBJECT_ID}/appRoleAssignments --headers Content-Type=application/json --body @${TMP_ASSIGN}"
    else
      info "Role '${ROLE_TO_ASSIGN}' already assigned for target user."
    fi
  else
    warn "Could not resolve target user object id; skipped role assignment."
  fi
fi

info "Validation summary"

echo "- API app:"; az ad app show --id "$API_APP_ID" --query '{appId:appId,displayName:displayName,identifierUris:identifierUris,requestedAccessTokenVersion:api.requestedAccessTokenVersion}' -o json

echo "- SPA app:"; az ad app show --id "$SPA_APP_ID" --query '{appId:appId,displayName:displayName,requiredResourceAccess:requiredResourceAccess,spaRedirects:spa.redirectUris}' -o json

echo "- OAuth2 delegated grants for SPA SP:"; az rest --method GET --uri "https://graph.microsoft.com/v1.0/servicePrincipals/${SPA_SP_ID}/oauth2PermissionGrants" -o json | jq '{value:[.value[]|{scope,consentType,resourceId}]}'

if [[ -n "${TARGET_USER_OBJECT_ID:-}" && "$TARGET_USER_OBJECT_ID" != "null" ]]; then
  echo "- App role assignments for target user against API SP:";
  az rest --method GET --uri "https://graph.microsoft.com/v1.0/users/${TARGET_USER_OBJECT_ID}/appRoleAssignments" -o json | jq --arg API_SP "$API_SP_ID" '{value:[.value[]|select(.resourceId==$API_SP)|{principalDisplayName,resourceDisplayName,appRoleId}]}'
fi

echo "- Potential display-name duplicates (review):"
az ad app list --filter "startsWith(displayName,'huminex-api-app')" --query "[].{appId:appId,displayName:displayName,id:id}" -o table

pass "Entra fix/validation completed."
