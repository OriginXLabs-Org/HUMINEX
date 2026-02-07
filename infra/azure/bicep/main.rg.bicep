targetScope = 'resourceGroup'

@description('Azure region for HUMINEX resources.')
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

@description('PostgreSQL admin username.')
param postgresAdminUsername string

@secure()
@description('PostgreSQL admin password.')
param postgresAdminPassword string

@description('Existing Key Vault name for HUMINEX runtime and secrets integration.')
param keyVaultName string = 'kv-huminex'

var unique = uniqueString(subscription().subscriptionId, resourceGroup().id, environment)
var acrName = toLower('${namePrefix}${environment}acr${substring(unique, 0, 6)}')
var aksName = '${namePrefix}-${environment}-aks'
var logAnalyticsName = '${namePrefix}-${environment}-law'
var appInsightsName = '${namePrefix}-${environment}-appi'
var postgresServerName = toLower('${namePrefix}-${environment}-psql-${substring(unique, 0, 8)}')
var storageAccountName = toLower('${namePrefix}${environment}st${substring(unique, 0, 8)}')
var serviceBusNamespaceName = toLower('${namePrefix}-${environment}-sb-${substring(unique, 0, 8)}')
var serviceBusTopicName = 'huminex-business-events'
var appConfigName = toLower('${namePrefix}-${environment}-appcfg-${substring(unique, 0, 6)}')
var postgresDbName = 'huminex'
var acrPullRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var serviceBusDataOwnerRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '090c5cfd-751d-490a-894a-3ce6f1109419')
var storageBlobDataContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var appConfigurationDataReaderRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '516239f1-63e1-4d78-a4de-a74fb236a071')

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    minimumTlsVersion: '1.2'
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource serviceBusTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: serviceBusTopicName
  parent: serviceBusNamespace
  properties: {
    defaultMessageTimeToLive: 'P14D'
    enablePartitioning: true
  }
}

resource appConfigurationStore 'Microsoft.AppConfiguration/configurationStores@2024-05-01' = {
  name: appConfigName
  location: location
  sku: {
    name: 'standard'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
    createMode: 'Default'
    enablePurgeProtection: false
    softDeleteRetentionInDays: 7
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_D2ds_v5'
    tier: 'GeneralPurpose'
  }
  properties: {
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    version: '17'
    availabilityZone: '1'
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: postgresDbName
  parent: postgres
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource aks 'Microsoft.ContainerService/managedClusters@2024-05-01' = {
  name: aksName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    kubernetesVersion: ''
    dnsPrefix: '${namePrefix}-${environment}-aks'
    nodeResourceGroup: 'rg-${namePrefix}-${environment}-aks-nodes'
    agentPoolProfiles: [
      {
        name: 'system'
        mode: 'System'
        enableAutoScaling: true
        minCount: 1
        maxCount: 3
        vmSize: 'Standard_D4s_v3'
        type: 'VirtualMachineScaleSets'
        osType: 'Linux'
        osDiskSizeGB: 128
      }
    ]
    addonProfiles: {
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalytics.id
        }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
      }
    }
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'azure'
      loadBalancerSku: 'standard'
      outboundType: 'loadBalancer'
    }
    oidcIssuerProfile: {
      enabled: true
    }
    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }
  }
  tags: {
    platform: 'huminex'
    environment: environment
  }
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, acr.id, 'AcrPull', aks.id)
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, keyVault.id, 'KeyVaultSecretsUser', aks.id)
  scope: keyVault
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: aks.properties.addonProfiles.azureKeyvaultSecretsProvider.identity.objectId
    principalType: 'ServicePrincipal'
  }
}

resource serviceBusDataOwnerAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, serviceBusNamespace.id, 'ServiceBusDataOwner', aks.id)
  scope: serviceBusNamespace
  properties: {
    roleDefinitionId: serviceBusDataOwnerRoleDefinitionId
    principalId: aks.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageBlobDataContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, storageAccount.id, 'StorageBlobDataContributor', aks.id)
  scope: storageAccount
  properties: {
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
    principalId: aks.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource appConfigurationDataReaderAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, appConfigurationStore.id, 'AppConfigurationDataReader', aks.id)
  scope: appConfigurationStore
  properties: {
    roleDefinitionId: appConfigurationDataReaderRoleDefinitionId
    principalId: aks.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output aksClusterName string = aks.name
output acrLoginServer string = acr.properties.loginServer
output postgresServerFqdn string = postgres.properties.fullyQualifiedDomainName
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output keyVaultName string = keyVault.name
output serviceBusNamespace string = '${serviceBusNamespace.name}.servicebus.windows.net'
output serviceBusTopic string = serviceBusTopic.name
output storageBlobServiceUri string = storageAccount.properties.primaryEndpoints.blob
output appConfigurationEndpoint string = appConfigurationStore.properties.endpoint
