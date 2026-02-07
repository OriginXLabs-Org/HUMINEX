using Azure.Identity;
using Azure.Storage.Blobs;
using Huminex.Api.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Huminex.Api.HealthChecks;

public sealed class BlobStorageHealthCheck(IOptions<AzureStorageOptions> options) : IHealthCheck
{
    private readonly AzureStorageOptions _options = options.Value;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            BlobServiceClient client;
            if (!string.IsNullOrWhiteSpace(_options.BlobConnectionString))
            {
                client = new BlobServiceClient(_options.BlobConnectionString);
            }
            else if (!string.IsNullOrWhiteSpace(_options.BlobServiceUri))
            {
                client = new BlobServiceClient(new Uri(_options.BlobServiceUri), new DefaultAzureCredential());
            }
            else
            {
                return HealthCheckResult.Unhealthy("AzureStorage.BlobConnectionString or AzureStorage.BlobServiceUri must be configured.");
            }

            await client.GetAccountInfoAsync(cancellationToken: cancellationToken);
            return HealthCheckResult.Healthy("Blob storage account is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Blob storage health check failed.", ex);
        }
    }
}
