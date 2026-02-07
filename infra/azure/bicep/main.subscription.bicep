targetScope = 'subscription'

@description('Azure region for HUMINEX resources.')
param location string = 'centralindia'

@description('Resource group name for HUMINEX platform.')
param resourceGroupName string = 'rg-huminex'

@description('Deployment environment (dev/stage/prod).')
@allowed([
  'dev'
  'stage'
  'prod'
])
param environment string = 'dev'

@description('Global naming prefix. Keep as huminex for resource identity.')
param namePrefix string = 'huminex'

@description('PostgreSQL admin username.')
param postgresAdminUsername string = 'huminexadmin'

@description('Existing Key Vault name that stores deployment secrets.')
param keyVaultName string = 'kv-huminex'

@description('Key Vault secret name for PostgreSQL admin password.')
param postgresAdminPasswordSecretName string = 'postgres-admin-password'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    platform: 'huminex'
    environment: environment
    managedBy: 'bicep'
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
  scope: rg
}

module huminexStack './main.rg.bicep' = {
  name: 'huminex-stack-${environment}'
  scope: rg
  params: {
    location: location
    environment: environment
    namePrefix: namePrefix
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: kv.getSecret(postgresAdminPasswordSecretName)
    keyVaultName: keyVaultName
  }
}

output aksClusterName string = huminexStack.outputs.aksClusterName
output acrLoginServer string = huminexStack.outputs.acrLoginServer
output postgresServerFqdn string = huminexStack.outputs.postgresServerFqdn
