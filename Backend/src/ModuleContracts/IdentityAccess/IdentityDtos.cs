namespace Huminex.ModuleContracts.IdentityAccess;

public sealed record UserProfileResponse(Guid UserId, Guid TenantId, string Name, string Email, string Role);
public sealed record UpdateUserRolesRequest(IReadOnlyCollection<string> Roles);
public sealed record PolicyResponse(string PolicyId, string Name, IReadOnlyCollection<string> Permissions);
public sealed record UpdatePolicyRequest(IReadOnlyCollection<string> Permissions);
