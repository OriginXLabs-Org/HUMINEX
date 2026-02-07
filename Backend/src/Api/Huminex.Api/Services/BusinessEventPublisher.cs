using System.Text.Json;
using Azure.Identity;
using Azure.Messaging.ServiceBus;
using Huminex.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Services;

public interface IBusinessEventPublisher
{
    Task PublishAsync(string eventName, object payload, CancellationToken cancellationToken = default);
}

public sealed class BusinessEventPublisher(IOptions<ServiceBusOptions> serviceBusOptions) : IBusinessEventPublisher
{
    private readonly ServiceBusOptions _options = serviceBusOptions.Value;

    public async Task PublishAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.EventsTopicName))
        {
            return;
        }

        await using var client = BuildClient();
        var sender = client.CreateSender(_options.EventsTopicName);
        var message = new ServiceBusMessage(JsonSerializer.Serialize(payload))
        {
            Subject = eventName,
            ContentType = "application/json",
            MessageId = Guid.NewGuid().ToString("N")
        };

        await sender.SendMessageAsync(message, cancellationToken);
    }

    private ServiceBusClient BuildClient()
    {
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return new ServiceBusClient(_options.ConnectionString);
        }

        if (!string.IsNullOrWhiteSpace(_options.FullyQualifiedNamespace))
        {
            return new ServiceBusClient(_options.FullyQualifiedNamespace, new DefaultAzureCredential());
        }

        throw new InvalidOperationException("ServiceBus.ConnectionString or ServiceBus.FullyQualifiedNamespace must be configured.");
    }
}
