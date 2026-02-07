using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.ModuleContracts.System;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Platform-level health and diagnostics endpoints.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/system")]
public sealed class SystemController : ControllerBase
{
    /// <summary>
    /// Returns service health status for uptime probes and monitoring.
    /// </summary>
    /// <returns>Health metadata including service name and UTC timestamp.</returns>
    [HttpGet("health")]
    [ProducesResponseType(typeof(ApiEnvelope<HealthResponse>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<HealthResponse>> Health()
    {
        return Ok(new ApiEnvelope<HealthResponse>(
            new HealthResponse("Huminex.Api", "healthy", DateTime.UtcNow),
            HttpContext.TraceIdentifier));
    }
}
