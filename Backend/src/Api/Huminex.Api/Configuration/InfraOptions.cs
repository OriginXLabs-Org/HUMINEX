namespace Huminex.Api.Configuration;

public sealed class PostgresOptions
{
    public const string SectionName = "Postgres";
    public string ConnectionString { get; set; } = string.Empty;
    public bool ApplyMigrationsOnStartup { get; set; }
}

public sealed class RedisOptions
{
    public const string SectionName = "Redis";
    public string ConnectionString { get; set; } = string.Empty;
}

public sealed class ServiceBusOptions
{
    public const string SectionName = "ServiceBus";
    public string ConnectionString { get; set; } = string.Empty;
    public string FullyQualifiedNamespace { get; set; } = string.Empty;
    public string EventsTopicName { get; set; } = "huminex-business-events";
}

public sealed class AzureStorageOptions
{
    public const string SectionName = "AzureStorage";
    public string BlobConnectionString { get; set; } = string.Empty;
    public string BlobServiceUri { get; set; } = string.Empty;
    public string InterviewArtifactsContainer { get; set; } = "openhuman-artifacts";
    public string PayrollDocumentsContainer { get; set; } = "payroll-documents";
}

public sealed class AcsEmailOptions
{
    public const string SectionName = "AcsEmail";
    public string ConnectionString { get; set; } = string.Empty;
    public string SenderAddress { get; set; } = string.Empty;
}

public sealed class AzureAppConfigurationOptions
{
    public const string SectionName = "AzureAppConfiguration";
    public string Endpoint { get; set; } = string.Empty;
}
