using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class AuditTrailEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string ActorEmail { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string ResourceType { get; private set; } = string.Empty;
    public string ResourceId { get; private set; } = string.Empty;
    public string Outcome { get; private set; } = string.Empty;
    public string MetadataJson { get; private set; } = "{}";
    public DateTime OccurredAtUtc { get; private set; } = DateTime.UtcNow;

    private AuditTrailEntity() { }

    public AuditTrailEntity(
        Guid tenantId,
        Guid actorUserId,
        string actorEmail,
        string action,
        string resourceType,
        string resourceId,
        string outcome,
        string metadataJson)
    {
        TenantId = tenantId;
        ActorUserId = actorUserId;
        ActorEmail = actorEmail;
        Action = action;
        ResourceType = resourceType;
        ResourceId = resourceId;
        Outcome = outcome;
        MetadataJson = metadataJson;
    }
}
