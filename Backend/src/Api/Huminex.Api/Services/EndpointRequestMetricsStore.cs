using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace Huminex.Api.Services;

public interface IEndpointRequestMetricsStore
{
    void Increment(string method, string routeTemplate);
    long GetCount(string method, string routeTemplate);
}

public sealed class EndpointRequestMetricsStore : IEndpointRequestMetricsStore
{
    private readonly ConcurrentDictionary<string, long> _counts = new(StringComparer.OrdinalIgnoreCase);
    private static readonly Regex VersionConstraintRegex = new(@"\{version:[^}]+\}", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex RouteConstraintRegex = new(@"\{([^}:]+):[^}]+\}", RegexOptions.Compiled);

    public void Increment(string method, string routeTemplate)
    {
        var key = BuildKey(method, routeTemplate);
        _counts.AddOrUpdate(key, 1, static (_, current) => current + 1);
    }

    public long GetCount(string method, string routeTemplate)
    {
        var key = BuildKey(method, routeTemplate);
        return _counts.TryGetValue(key, out var count) ? count : 0;
    }

    private static string BuildKey(string method, string routeTemplate)
    {
        var normalizedMethod = string.IsNullOrWhiteSpace(method) ? "GET" : method.Trim().ToUpperInvariant();
        var normalizedRoute = NormalizeRouteTemplate(routeTemplate);
        return $"{normalizedMethod}:{normalizedRoute}";
    }

    private static string NormalizeRouteTemplate(string routeTemplate)
    {
        var route = (routeTemplate ?? string.Empty).Trim();
        if (route.Length == 0)
        {
            return "/";
        }

        var queryIndex = route.IndexOf('?');
        if (queryIndex >= 0)
        {
            route = route[..queryIndex];
        }

        route = route.Trim('/');
        route = VersionConstraintRegex.Replace(route, "{version}");
        route = RouteConstraintRegex.Replace(route, "{$1}");
        route = $"/{route}".ToLowerInvariant();
        return route;
    }
}
