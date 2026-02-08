targetScope = 'resourceGroup'

@description('Azure region for workbook resource.')
param location string = resourceGroup().location

@description('Deployment environment (dev/stage/prod).')
@allowed([
  'dev'
  'stage'
  'prod'
])
param environment string

@description('Global naming prefix. Keep as huminex for resource identity.')
param namePrefix string = 'huminex'

@description('Log Analytics workspace name used by HUMINEX observability.')
param logAnalyticsWorkspaceName string = '${namePrefix}-${environment}-law'

@description('Workbook display name.')
param workbookDisplayName string = 'HUMINEX'

@description('Tag value: owner')
param owner string = 'platform@huminex'

@description('Tag value: team')
param team string = 'platform'

@description('Tag value: cost-center')
param costCenter string = 'huminex-platform'

var workbookName = guid(resourceGroup().id, workbookDisplayName, environment)
var resourceTags = {
  app: 'huminex'
  environment: environment
  owner: owner
  team: team
  'cost-center': costCenter
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

var workbookTemplateText = loadTextContent('./definitions/huminex.workbook.json')
var workbookSerializedData = replace(workbookTemplateText, '__LAW_RESOURCE_ID__', logAnalytics.id)

resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: workbookName
  location: location
  kind: 'shared'
  tags: resourceTags
  properties: {
    displayName: workbookDisplayName
    serializedData: workbookSerializedData
    version: '1.0'
    category: 'workbook'
    sourceId: subscription().id
  }
}

output workbookName string = workbook.name
output workbookDisplayNameOut string = workbook.properties.displayName
output workbookResourceId string = workbook.id
output workbookPortalUrl string = 'https://portal.azure.com/#@/resource${workbook.id}/workbook'
