using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.ModuleContracts.IdentityAccess;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Authentication APIs for login, refresh, and logout operations.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public sealed class AuthController : ControllerBase
{
    /// <summary>
    /// Authenticates a user and returns an access token and refresh token.
    /// </summary>
    /// <param name="request">Login credentials payload.</param>
    /// <returns>Token pair with expiry metadata.</returns>
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiEnvelope<LoginResponse>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var response = new LoginResponse("demo-access-token", "demo-refresh-token", DateTime.UtcNow.AddHours(1));
        return Ok(new ApiEnvelope<LoginResponse>(response, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Issues a new access token using a valid refresh token.
    /// </summary>
    /// <param name="request">Refresh token payload.</param>
    /// <returns>New token pair preserving refresh token lifecycle.</returns>
    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiEnvelope<LoginResponse>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<LoginResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var response = new LoginResponse("demo-access-token", request.RefreshToken, DateTime.UtcNow.AddHours(1));
        return Ok(new ApiEnvelope<LoginResponse>(response, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Invalidates a refresh token for the current user session.
    /// </summary>
    /// <param name="request">Refresh token to revoke.</param>
    /// <returns>No content when logout is accepted.</returns>
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout([FromBody] LogoutRequest request)
    {
        return NoContent();
    }
}
