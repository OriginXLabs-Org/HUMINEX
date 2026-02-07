using Azure.Identity;
using Azure.Messaging.ServiceBus;
using Azure.Messaging.ServiceBus.Administration;
using Huminex.Api.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Huminex.Api.HealthChecks;

public sealed class ServiceBusHealthCheck(IOptions<ServiceBusOptions> options) : IHealthCheck
{
    private readonly ServiceBusOptions _options = options.Value;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var adminClient = BuildAdminClient();
            await adminClient.GetNamespacePropertiesAsync(cancellationToken);
            return HealthCheckResult.Healthy("Service Bus namespace is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Service Bus health check failed.", ex);
        }
    }

    private ServiceBusAdministrationClient BuildAdminClient()
    {
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return new ServiceBusAdministrationClient(_options.ConnectionString);
        }

        if (!string.IsNullOrWhiteSpace(_options.FullyQualifiedNamespace))
        {
            return new ServiceBusAdministrationClient(_options.FullyQualifiedNamespace, new DefaultAzureCredential());
        }

        throw new InvalidOperationException("ServiceBus.ConnectionString or ServiceBus.FullyQualifiedNamespace must be configured.");
    }
}
