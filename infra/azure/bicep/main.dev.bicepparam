using './main.subscription.bicep'

param location = 'centralindia'
param resourceGroupName = 'rg-huminex'
param environment = 'dev'
param namePrefix = 'huminex'
param postgresAdminUsername = 'huminexadmin'
param keyVaultName = 'kv-huminex'
param postgresAdminPasswordSecretName = 'postgres-admin-password'
