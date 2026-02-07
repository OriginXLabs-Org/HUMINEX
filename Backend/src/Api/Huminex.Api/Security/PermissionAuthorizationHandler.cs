using Huminex.BuildingBlocks.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;

namespace Huminex.Api.Security;

public sealed class PermissionAuthorizationHandler(ITenantProvider tenantProvider)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (string.Equals(tenantProvider.Role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var requested = requirement.Permission.Trim().ToLowerInvariant();
        var hasPermission = tenantProvider.Permissions
            .Any(permission => string.Equals(permission.Trim(), requested, StringComparison.OrdinalIgnoreCase));

        if (hasPermission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
