namespace Huminex.ModuleContracts.IdentityAccess;

public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record LogoutRequest(string RefreshToken);
public sealed record UserProfileResponse(Guid UserId, Guid TenantId, string Name, string Email, string Role);
public sealed record UpdateUserRolesRequest(IReadOnlyCollection<string> Roles);
public sealed record PolicyResponse(string PolicyId, string Name, IReadOnlyCollection<string> Permissions);
public sealed record UpdatePolicyRequest(IReadOnlyCollection<string> Permissions);
