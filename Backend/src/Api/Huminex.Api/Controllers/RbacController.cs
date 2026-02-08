using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.IdentityAccess;
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
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = PermissionPolicies.RbacWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdatePolicy(string id, [FromBody] UpdatePolicyRequest request, CancellationToken cancellationToken)
    {
        await rbacRepository.UpsertPolicyAsync(id, request.Permissions, cancellationToken);
        return NoContent();
    }
}
