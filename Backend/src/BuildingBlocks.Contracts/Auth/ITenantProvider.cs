namespace Huminex.BuildingBlocks.Contracts.Auth;

public interface ITenantProvider
{
    Guid TenantId { get; }
    Guid UserId { get; }
    string UserEmail { get; }
    string Role { get; }
    IReadOnlyCollection<string> Permissions { get; }
    bool IsAuthenticated { get; }
}
