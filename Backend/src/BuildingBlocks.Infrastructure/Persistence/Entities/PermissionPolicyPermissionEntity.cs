namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class PermissionPolicyPermissionEntity : ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid PermissionPolicyEntityId { get; private set; }
    public string Permission { get; private set; } = string.Empty;

    public PermissionPolicyEntity Policy { get; private set; } = default!;

    private PermissionPolicyPermissionEntity() { }

    public PermissionPolicyPermissionEntity(Guid tenantId, Guid policyId, string permission)
    {
        TenantId = tenantId;
        PermissionPolicyEntityId = policyId;
        Permission = permission.Trim().ToLowerInvariant();
    }
}
