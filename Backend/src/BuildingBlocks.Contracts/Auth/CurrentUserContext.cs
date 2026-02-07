namespace Huminex.BuildingBlocks.Contracts.Auth;

public sealed record CurrentUserContext(
    Guid UserId,
    Guid TenantId,
    string Email,
    string Role
);
