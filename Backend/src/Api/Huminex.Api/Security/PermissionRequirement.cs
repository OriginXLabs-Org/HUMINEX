using Microsoft.AspNetCore.Authorization;

namespace Huminex.Api.Security;

public sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;
