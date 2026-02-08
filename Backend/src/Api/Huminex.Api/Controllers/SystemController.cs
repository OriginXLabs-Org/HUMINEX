using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Platform-level health and diagnostics endpoints.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/system")]
public sealed class SystemController(IAuditTrailRepository auditTrailRepository) : ControllerBase
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

    /// <summary>
    /// Records internal admin login attempts/results for security auditing.
    /// </summary>
    /// <param name="request">Audit event payload from frontend internal-admin login flow.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Audit accept acknowledgement.</returns>
    [HttpPost("admin-auth-audit")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiEnvelope<AdminAuthAuditResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiEnvelope<AdminAuthAuditResponse>>> AdminAuthAudit(
        [FromBody] AdminAuthAuditRequest request,
        CancellationToken cancellationToken)
    {
        var status = request.Status.Trim().ToLowerInvariant();
        if (status is not ("attempt" or "blocked" or "success" or "failure"))
        {
            return BadRequest(new
            {
                code = "invalid_status",
                message = "Status must be one of: attempt, blocked, success, failure."
            });
        }

        var portal = string.IsNullOrWhiteSpace(request.Portal) ? "internal_admin" : request.Portal.Trim().ToLowerInvariant();
        var resourceId = string.IsNullOrWhiteSpace(request.Path) ? portal : request.Path.Trim();
        var reason = string.IsNullOrWhiteSpace(request.Reason) ? "unspecified" : request.Reason.Trim();

        await auditTrailRepository.AddAsync(
            "admin_auth_login",
            "internal_admin_auth",
            resourceId,
            status,
            new
            {
                portal,
                reason,
                path = request.Path,
                userAgent = request.UserAgent,
                requestedAtUtc = DateTime.UtcNow
            },
            cancellationToken);

        return Ok(new ApiEnvelope<AdminAuthAuditResponse>(
            new AdminAuthAuditResponse(true, "captured"),
            HttpContext.TraceIdentifier));
    }
}

public sealed record AdminAuthAuditRequest(string Portal, string Status, string Reason, string? Path, string? UserAgent);
public sealed record AdminAuthAuditResponse(bool Accepted, string Message);
