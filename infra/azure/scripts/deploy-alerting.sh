#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TEMPLATE_FILE="${ROOT_DIR}/infra/azure/bicep/monitoring.alerts.bicep"

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-huminex}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
NAME_PREFIX="${NAME_PREFIX:-huminex}"
LOCATION="${LOCATION:-centralindia}"
LOG_ANALYTICS_WORKSPACE_NAME="${LOG_ANALYTICS_WORKSPACE_NAME:-${NAME_PREFIX}-${ENVIRONMENT}-law}"
APP_INSIGHTS_NAME="${APP_INSIGHTS_NAME:-${NAME_PREFIX}-${ENVIRONMENT}-appi}"
SLACK_CHANNEL_MENTION="${SLACK_CHANNEL_MENTION:-#huminex-alerts}"
WORKBOOK_PORTAL_URL="${WORKBOOK_PORTAL_URL:-https://portal.azure.com/#view/Microsoft_Azure_Monitoring/AzureMonitoringBrowseBlade/~/workbooks}"
DAILY_SPEND_THRESHOLD_USD="${DAILY_SPEND_THRESHOLD_USD:-300}"
MONTHLY_SPEND_THRESHOLD_USD="${MONTHLY_SPEND_THRESHOLD_USD:-9000}"
OWNER="${OWNER:-platform@huminex}"
TEAM="${TEAM:-platform}"
COST_CENTER="${COST_CENTER:-huminex-platform}"

if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
  echo "Missing required env: SLACK_WEBHOOK_URL"
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required."
  exit 1
fi

echo "Using Azure account:"
az account show --query '{name:name, id:id, tenantId:tenantId}' -o table

echo "Deploying HUMINEX alerting stack to resource group ${RESOURCE_GROUP} (${ENVIRONMENT})..."
az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "huminex-alerting-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters \
      location="${LOCATION}" \
      environment="${ENVIRONMENT}" \
      namePrefix="${NAME_PREFIX}" \
      logAnalyticsWorkspaceName="${LOG_ANALYTICS_WORKSPACE_NAME}" \
      appInsightsName="${APP_INSIGHTS_NAME}" \
      slackWebhookUrl="${SLACK_WEBHOOK_URL}" \
      slackChannelMention="${SLACK_CHANNEL_MENTION}" \
      workbookPortalUrl="${WORKBOOK_PORTAL_URL}" \
      dailySpendThresholdUsd="${DAILY_SPEND_THRESHOLD_USD}" \
      monthlySpendThresholdUsd="${MONTHLY_SPEND_THRESHOLD_USD}" \
      owner="${OWNER}" \
      team="${TEAM}" \
      costCenter="${COST_CENTER}" \
  --query "properties.outputs" -o jsonc

echo
echo "Deployment complete. Verify in Azure Portal:"
echo "1) Monitor > Alerts > Alert rules (prefix: ${NAME_PREFIX}-${ENVIRONMENT}-)"
echo "2) Monitor > Alerts > Action groups (critical/warning)"
echo "3) Logic Apps > ${NAME_PREFIX}-${ENVIRONMENT}-alert-relay-la"
