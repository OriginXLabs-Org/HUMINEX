namespace Huminex.Api.Configuration;

public sealed class InternalAdminOptions
{
    public const string SectionName = "InternalAdmin";
    public string Email { get; set; } = "originxlabs@gmail.com";
    public string[] AllowedRoles { get; set; } = ["admin", "super_admin", "director"];
    public AzureResourceInventoryOptions Azure { get; set; } = new();
}

public sealed class AzureResourceInventoryOptions
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = "rg-huminex";
    public string Region { get; set; } = "centralindia";
    public string AksClusterName { get; set; } = "huminex-dev-aks";
    public string AksManagedResourceGroup { get; set; } = "MC_rg-huminex_huminex-dev-aks_centralindia";
    public string AksNodeScaleSetName { get; set; } = "aks-nodepool1";
    public string AksNamespace { get; set; } = "default";
    public string AcrName { get; set; } = "huminexdevacr";
    public string KeyVaultName { get; set; } = "huminex-dev-kv";
    public string StorageAccountName { get; set; } = "huminexdevstorage";
    public string ServiceBusNamespace { get; set; } = "huminex-dev-sb";
    public string RedisName { get; set; } = "huminex-dev-redis";
    public string PostgresServerName { get; set; } = "huminex-dev-pg";
    public string LogAnalyticsWorkspaceName { get; set; } = "huminex-dev-law";
    public string ApplicationInsightsName { get; set; } = "huminex-dev-ai";
    public string FrontDoorOrCdnName { get; set; } = "huminex-web";
    public string ApiPublicUrl { get; set; } = "https://api.gethuminex.com";
}
