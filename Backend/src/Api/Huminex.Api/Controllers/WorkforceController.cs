using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.Workforce;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Workforce controls for employee portal access and visibility.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/workforce")]
public sealed class WorkforceController(IOrganizationRepository organizationRepository) : ControllerBase
{
    /// <summary>
    /// Enables or disables employee portal access and allowed widgets.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="request">Portal access settings payload.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Updated portal-access state.</returns>
    [HttpPut("employees/{employeeId:guid}/portal-access")]
    [Authorize(Policy = PermissionPolicies.WorkforcePortalAccessWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<PortalAccessResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<PortalAccessResponse>>> UpdatePortalAccess(Guid employeeId, [FromBody] PortalAccessRequest request, CancellationToken cancellationToken)
    {
        await organizationRepository.UpdatePortalAccessAsync(employeeId, request.IsEnabled, request.AllowedWidgets, cancellationToken);
        var response = new PortalAccessResponse(employeeId, request.IsEnabled, request.AllowedWidgets);
        return Ok(new ApiEnvelope<PortalAccessResponse>(response, HttpContext.TraceIdentifier));
    }
}
