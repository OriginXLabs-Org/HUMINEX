using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class RoleEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public ICollection<UserRoleEntity> UserRoles { get; } = new List<UserRoleEntity>();

    private RoleEntity() { }

    public RoleEntity(Guid tenantId, string name, string description = "")
    {
        TenantId = tenantId;
        Name = name.Trim().ToLowerInvariant();
        Description = description;
    }
}
