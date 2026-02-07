using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class PermissionPolicyEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public string PolicyId { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    public ICollection<PermissionPolicyPermissionEntity> Permissions { get; } = new List<PermissionPolicyPermissionEntity>();

    private PermissionPolicyEntity() { }

    public PermissionPolicyEntity(Guid tenantId, string policyId, string name)
    {
        TenantId = tenantId;
        PolicyId = policyId;
        Name = name;
    }

    public void Rename(string name)
    {
        Name = name;
    }
}
