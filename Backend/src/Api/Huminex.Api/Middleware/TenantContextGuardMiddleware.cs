using Huminex.BuildingBlocks.Contracts.Auth;

namespace Huminex.Api.Middleware;

public sealed class TenantContextGuardMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider)
    {
        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            && !context.Request.Path.StartsWithSegments("/api/v1/auth", StringComparison.OrdinalIgnoreCase)
            && !context.Request.Path.StartsWithSegments("/api/v1/system/health", StringComparison.OrdinalIgnoreCase)
            && !context.Request.Path.StartsWithSegments("/health/live", StringComparison.OrdinalIgnoreCase)
            && !context.Request.Path.StartsWithSegments("/health/ready", StringComparison.OrdinalIgnoreCase)
            && tenantProvider.TenantId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "tenant_context_missing",
                message = "Tenant context was not resolved. Provide tenant claim or X-Tenant-Id header."
            });
            return;
        }

        await next(context);
    }
}
