using Huminex.Api.Services;
using Microsoft.AspNetCore.Routing;

namespace Huminex.Api.Middleware;

public sealed class EndpointRequestMetricsMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IEndpointRequestMetricsStore metricsStore)
    {
        var method = context.Request.Method;
        var template = context.Request.Path.Value ?? "/";
        var endpoint = context.GetEndpoint();
        if (endpoint is RouteEndpoint routeEndpoint && !string.IsNullOrWhiteSpace(routeEndpoint.RoutePattern.RawText))
        {
            template = routeEndpoint.RoutePattern.RawText!;
        }

        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
        {
            metricsStore.Increment(method, template);
        }

        await next(context);
    }
}
