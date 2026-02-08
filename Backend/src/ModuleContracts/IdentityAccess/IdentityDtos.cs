namespace Huminex.ModuleContracts.IdentityAccess;

public sealed record UserProfileResponse(Guid UserId, Guid TenantId, string Name, string Email, string Role);
public sealed record UpdateUserRolesRequest(IReadOnlyCollection<string> Roles);
public sealed record PolicyResponse(string PolicyId, string Name, IReadOnlyCollection<string> Permissions);
public sealed record UpdatePolicyRequest(IReadOnlyCollection<string> Permissions);
public sealed record RoleResponse(Guid RoleId, string Name, string Description, int UserCount);
public sealed record CreateRoleRequest(string Name, string Description);
public sealed record UpdateRoleRequest(string Name, string Description);
public sealed record AccessReviewUserResponse(Guid UserId, string Name, string Email, IReadOnlyCollection<string> Roles, DateTime? LastActivityAtUtc);
public sealed record IdentityAccessMetricsResponse(int TotalUsers, int ActiveUsersLast24Hours, int TotalRoles, int TotalPolicies, int UsersWithoutRoles);
