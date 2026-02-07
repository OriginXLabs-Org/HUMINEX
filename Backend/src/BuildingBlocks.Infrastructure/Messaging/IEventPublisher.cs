namespace Huminex.BuildingBlocks.Infrastructure.Messaging;

public interface IEventPublisher
{
    Task PublishAsync<TEvent>(TEvent payload, CancellationToken cancellationToken = default);
}
