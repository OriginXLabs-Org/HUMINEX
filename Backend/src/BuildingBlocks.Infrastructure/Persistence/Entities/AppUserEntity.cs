using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class AppUserEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    public ICollection<UserRoleEntity> UserRoles { get; } = new List<UserRoleEntity>();

    private AppUserEntity() { }

    public AppUserEntity(Guid tenantId, Guid userId, string displayName, string email)
    {
        Id = userId;
        TenantId = tenantId;
        DisplayName = displayName;
        Email = email.Trim().ToLowerInvariant();
    }

    public void TouchIdentity(string displayName, string email)
    {
        DisplayName = displayName;
        Email = email.Trim().ToLowerInvariant();
    }
}
