namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class UserRoleEntity : ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid RoleId { get; private set; }

    public AppUserEntity User { get; private set; } = default!;
    public RoleEntity Role { get; private set; } = default!;

    private UserRoleEntity() { }

    public UserRoleEntity(Guid tenantId, Guid userId, Guid roleId)
    {
        TenantId = tenantId;
        UserId = userId;
        RoleId = roleId;
    }
}
