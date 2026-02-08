using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace Huminex.Tests.Architecture;

public class ApiContractTests
{
    [Fact]
    public void V1_CoreContracts_ShouldExposeExpectedRoutes()
    {
        var assembly = Assembly.Load("Huminex.Api");
        var controllers = assembly.GetTypes().Where(type => typeof(ControllerBase).IsAssignableFrom(type));
        var discoveredRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var controller in controllers)
        {
            var controllerRoute = controller.GetCustomAttribute<RouteAttribute>()?.Template ?? string.Empty;

            var methods = controller
                .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
                .Where(method => method.GetCustomAttributes().OfType<HttpMethodAttribute>().Any());

            foreach (var method in methods)
            {
                var httpAttributes = method.GetCustomAttributes().OfType<HttpMethodAttribute>();
                foreach (var attribute in httpAttributes)
                {
                    var methodRoute = attribute.Template ?? string.Empty;
                    var route = Combine(controllerRoute, methodRoute)
                        .Replace("{version:apiVersion}", "1")
                        .Trim('/');

                    discoveredRoutes.Add($"{attribute.HttpMethods.First().ToUpperInvariant()} /{route}");
                }
            }
        }

        var expected = new[]
        {
            "GET /api/v1/users/me",
            "PUT /api/v1/users/{id:guid}/roles",
            "GET /api/v1/rbac/roles",
            "POST /api/v1/rbac/roles",
            "PUT /api/v1/rbac/roles/{id:guid}",
            "DELETE /api/v1/rbac/roles/{id:guid}",
            "GET /api/v1/rbac/policies",
            "PUT /api/v1/rbac/policies/{id}",
            "GET /api/v1/rbac/access-review",
            "GET /api/v1/rbac/metrics",
            "GET /api/v1/org/structure",
            "GET /api/v1/org/employees",
            "GET /api/v1/org/employees/{employeeId:guid}",
            "GET /api/v1/org/employees/{employeeId:guid}/manager-chain",
            "GET /api/v1/org/managers/{managerId:guid}/direct-reports",
            "PUT /api/v1/workforce/employees/{employeeId:guid}/portal-access",
            "GET /api/v1/payroll/runs",
            "POST /api/v1/payroll/runs",
            "POST /api/v1/payroll/runs/{runId:guid}/approve",
            "POST /api/v1/payroll/runs/{runId:guid}/disburse",
            "GET /api/v1/payroll/employees/{employeeId:guid}/payslips",
            "GET /api/v1/payroll/employees/{employeeId:guid}/payslips/{period}",
            "POST /api/v1/payroll/employees/{employeeId:guid}/payslips/{period}/email"
        };

        foreach (var route in expected)
        {
            Assert.Contains(route, discoveredRoutes);
        }
    }

    private static string Combine(string left, string right)
    {
        if (string.IsNullOrWhiteSpace(left))
        {
            return right;
        }

        if (string.IsNullOrWhiteSpace(right))
        {
            return left;
        }

        return $"{left.TrimEnd('/')}/{right.TrimStart('/')}";
    }
}
