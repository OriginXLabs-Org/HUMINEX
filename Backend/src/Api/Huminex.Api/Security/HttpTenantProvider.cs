using System.Security.Claims;
using Huminex.Api.Configuration;
using Huminex.BuildingBlocks.Contracts.Auth;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Security;

public sealed class HttpTenantProvider(IHttpContextAccessor httpContextAccessor, IOptions<DevSecurityOptions> options) : ITenantProvider
{
    private readonly DevSecurityOptions _options = options.Value;

    public Guid TenantId => Resolve().TenantId;
    public Guid UserId => Resolve().UserId;
    public string UserEmail => Resolve().UserEmail;
    public string Role => Resolve().Role;
    public IReadOnlyCollection<string> Permissions => Resolve().Permissions;
    public bool IsAuthenticated => Resolve().IsAuthenticated;

    private TenantSnapshot Resolve()
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return BuildFallback(false);
        }

        var principal = httpContext.User;
        if (principal?.Identity?.IsAuthenticated is true)
        {
            // For authenticated principals, do NOT fall back to a configured tenant/user identity.
            // Missing tenant/user context should be treated as an invalid/unsupported token and rejected by middleware.
            var tenantId = TryReadGuidClaim(principal, "tenant_id")
                ?? TryReadGuidClaim(principal, "tid")
                ?? TryReadGuidHeader(httpContext, "X-Tenant-Id")
                ?? Guid.Empty;

            var userId = TryReadGuidClaim(principal, "oid")
                ?? TryReadGuidClaim(principal, ClaimTypes.NameIdentifier)
                ?? TryReadGuidClaim(principal, "sub")
                ?? TryReadGuidHeader(httpContext, "X-User-Id")
                ?? Guid.Empty;

            var email = principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue("emails")
                ?? principal.FindFirstValue("preferred_username")
                ?? httpContext.Request.Headers["X-User-Email"].FirstOrDefault()
                ?? string.Empty;

            var roles = principal.FindAll(ClaimTypes.Role).Select(x => x.Value)
                .Concat(principal.FindAll("roles").Select(x => x.Value))
                .Concat(new[] { httpContext.Request.Headers["X-User-Role"].FirstOrDefault() ?? string.Empty })
                .Select(x => (x ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var role = RolePermissionMatrix.IsAdmin(roles)
                ? "admin"
                : roles.FirstOrDefault() ?? string.Empty;

            var permissions = principal.FindAll("permissions").Select(x => x.Value)
                .Concat(principal.FindAll("permission").Select(x => x.Value))
                .Concat(ParseCsvHeader(httpContext.Request.Headers["X-User-Permissions"].FirstOrDefault()))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            return new TenantSnapshot(
                tenantId,
                userId,
                email,
                role,
                permissions.Length == 0 ? RolePermissionMatrix.ResolvePermissions(roles) : permissions,
                true);
        }

        if (_options.EnableHeaderIdentityFallback)
        {
            var headerTenantId = TryReadGuidHeader(httpContext, "X-Tenant-Id") ?? TryParseGuid(_options.FallbackTenantId);
            var headerUserId = TryReadGuidHeader(httpContext, "X-User-Id") ?? TryParseGuid(_options.FallbackUserId);
            var headerEmail = httpContext.Request.Headers["X-User-Email"].FirstOrDefault() ?? _options.FallbackUserEmail;
            var headerRole = httpContext.Request.Headers["X-User-Role"].FirstOrDefault() ?? _options.FallbackRole;
            var headerPermissions = ParseCsvHeader(httpContext.Request.Headers["X-User-Permissions"].FirstOrDefault());

            return new TenantSnapshot(
                headerTenantId,
                headerUserId,
                headerEmail,
                headerRole,
                headerPermissions.Length == 0 ? _options.FallbackPermissions : headerPermissions,
                false);
        }

        return BuildFallback(false);
    }

    private TenantSnapshot BuildFallback(bool authenticated)
    {
        return new TenantSnapshot(
            TryParseGuid(_options.FallbackTenantId),
            TryParseGuid(_options.FallbackUserId),
            _options.FallbackUserEmail,
            _options.FallbackRole,
            _options.FallbackPermissions,
            authenticated);
    }

    private static Guid TryParseGuid(string value) => Guid.TryParse(value, out var parsed) ? parsed : Guid.Empty;

    private static Guid? TryReadGuidHeader(HttpContext httpContext, string headerName)
    {
        var value = httpContext.Request.Headers[headerName].FirstOrDefault();
        return Guid.TryParse(value, out var parsed) ? parsed : null;
    }

    private static Guid? TryReadGuidClaim(ClaimsPrincipal principal, string claimType)
    {
        var value = principal.FindFirstValue(claimType);
        return Guid.TryParse(value, out var parsed) ? parsed : null;
    }

    private static string[] ParseCsvHeader(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private sealed record TenantSnapshot(
        Guid TenantId,
        Guid UserId,
        string UserEmail,
        string Role,
        IReadOnlyCollection<string> Permissions,
        bool IsAuthenticated);
}
