using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.IdentityAccess;
using Huminex.SharedKernel.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// RBAC policy administration APIs.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/rbac")]
public sealed class RbacController(IRbacRepository rbacRepository) : ControllerBase
{
    [HttpGet("roles")]
    [Authorize(Policy = PermissionPolicies.RbacRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<RoleResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<RoleResponse>>>> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await rbacRepository.GetRolesAsync(cancellationToken);
        var response = roles
            .Select(role => new RoleResponse(role.RoleId, role.Name, role.Description, role.UserCount))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<RoleResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpPost("roles")]
    [Authorize(Policy = PermissionPolicies.RbacWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<RoleResponse>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiEnvelope<RoleResponse>>> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new ErrorEnvelope("validation_error", "Role name is required.", HttpContext.TraceIdentifier));
        }

        var role = await rbacRepository.CreateRoleAsync(request.Name, request.Description ?? string.Empty, cancellationToken);
        var response = new RoleResponse(role.RoleId, role.Name, role.Description, role.UserCount);
        return CreatedAtAction(nameof(GetRoles), new ApiEnvelope<RoleResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpPut("roles/{id:guid}")]
    [Authorize(Policy = PermissionPolicies.RbacWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<RoleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<RoleResponse>>> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new ErrorEnvelope("validation_error", "Role name is required.", HttpContext.TraceIdentifier));
        }

        var updated = await rbacRepository.UpdateRoleAsync(id, request.Name, request.Description ?? string.Empty, cancellationToken);
        if (updated is null)
        {
            return NotFound(new ErrorEnvelope("role_not_found", $"Role {id} was not found.", HttpContext.TraceIdentifier));
        }

        var response = new RoleResponse(updated.RoleId, updated.Name, updated.Description, updated.UserCount);
        return Ok(new ApiEnvelope<RoleResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpDelete("roles/{id:guid}")]
    [Authorize(Policy = PermissionPolicies.RbacWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await rbacRepository.DeleteRoleAsync(id, cancellationToken);
        if (!deleted)
        {
            return Conflict(new ErrorEnvelope("role_in_use_or_not_found", "Role cannot be deleted because it is assigned to users or does not exist.", HttpContext.TraceIdentifier));
        }

        return NoContent();
    }

    /// <summary>
    /// Lists permission policies available for the current tenant.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Policy list with associated permissions.</returns>
    [HttpGet("policies")]
    [Authorize(Policy = PermissionPolicies.RbacRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<PolicyResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<PolicyResponse>>>> GetPolicies(CancellationToken cancellationToken)
    {
        var policies = await rbacRepository.GetPoliciesAsync(cancellationToken);
        var response = policies
            .Select(policy => new PolicyResponse(policy.PolicyId, policy.Name, policy.Permissions))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<PolicyResponse>>(response, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Creates or updates a policy's permission set for the current tenant.
    /// </summary>
    /// <param name="id">Policy identifier.</param>
    /// <param name="request">Permissions to persist.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>No content when policy upsert succeeds.</returns>
    [HttpPut("policies/{id}")]
    [Authorize(Policy = PermissionPolicies.RbacWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdatePolicy(string id, [FromBody] UpdatePolicyRequest request, CancellationToken cancellationToken)
    {
        await rbacRepository.UpsertPolicyAsync(id, request.Permissions, cancellationToken);
        return NoContent();
    }

    [HttpGet("access-review")]
    [Authorize(Policy = PermissionPolicies.RbacRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<AccessReviewUserResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<AccessReviewUserResponse>>>> GetAccessReview([FromQuery] int limit = 100, CancellationToken cancellationToken = default)
    {
        var review = await rbacRepository.GetAccessReviewAsync(limit, cancellationToken);
        var response = review
            .Select(user => new AccessReviewUserResponse(user.UserId, user.Name, user.Email, user.Roles, user.LastActivityAtUtc))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<AccessReviewUserResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("metrics")]
    [Authorize(Policy = PermissionPolicies.RbacRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IdentityAccessMetricsResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IdentityAccessMetricsResponse>>> GetIdentityMetrics(CancellationToken cancellationToken)
    {
        var metrics = await rbacRepository.GetIdentityMetricsAsync(cancellationToken);
        var response = new IdentityAccessMetricsResponse(
            metrics.TotalUsers,
            metrics.ActiveUsersLast24Hours,
            metrics.TotalRoles,
            metrics.TotalPolicies,
            metrics.UsersWithoutRoles);

        return Ok(new ApiEnvelope<IdentityAccessMetricsResponse>(response, HttpContext.TraceIdentifier));
    }
}
