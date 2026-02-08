using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.IdentityAccess;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// User profile and role-management APIs.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}")]
public sealed class UsersController(IUserRepository userRepository, ITenantProvider tenantProvider) : ControllerBase
{
    /// <summary>
    /// Returns the current authenticated user's profile within tenant scope.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>User identity profile with resolved role.</returns>
    [HttpGet("users/me")]
    [Authorize(Policy = PermissionPolicies.UserReadSelf)]
    [ProducesResponseType(typeof(ApiEnvelope<UserProfileResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<UserProfileResponse>>> Me(CancellationToken cancellationToken)
    {
        var user = await userRepository.EnsureUserAsync(
            tenantProvider.UserId,
            tenantProvider.UserEmail,
            tenantProvider.UserEmail.Split('@')[0],
            cancellationToken);

        var roles = await userRepository.GetRolesAsync(user.Id, cancellationToken);
        var role = roles.FirstOrDefault() ?? tenantProvider.Role;
        var profile = new UserProfileResponse(user.Id, tenantProvider.TenantId, user.DisplayName, user.Email, role);
        return Ok(new ApiEnvelope<UserProfileResponse>(profile, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Replaces role assignments for a specific user in the same tenant.
    /// </summary>
    /// <param name="id">Target user identifier.</param>
    /// <param name="request">New role set to apply.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>No content when role update succeeds.</returns>
    [HttpPut("users/{id:guid}/roles")]
    [Authorize(Policy = PermissionPolicies.UserRoleWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRoles(Guid id, [FromBody] UpdateUserRolesRequest request, CancellationToken cancellationToken)
    {
        // Prevent cross-tenant role manipulation: user lookup uses tenant query filters.
        var existing = await userRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        await userRepository.UpdateRolesAsync(id, request.Roles, cancellationToken);
        return NoContent();
    }
}
