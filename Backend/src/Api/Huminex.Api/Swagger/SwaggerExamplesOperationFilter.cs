using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Huminex.Api.Swagger;

public sealed class SwaggerExamplesOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var route = context.ApiDescription.RelativePath?.ToLowerInvariant() ?? string.Empty;
        var method = context.ApiDescription.HttpMethod?.ToUpperInvariant() ?? string.Empty;

        if (method == "POST" && route.Contains("auth/login"))
        {
            AddRequestExample(operation, "application/json", new OpenApiObject
            {
                ["email"] = new OpenApiString("admin@gethuminex.com"),
                ["password"] = new OpenApiString("StrongPassword!123")
            });
        }

        if (method == "PUT" && route.Contains("users/") && route.Contains("/roles"))
        {
            AddRequestExample(operation, "application/json", new OpenApiObject
            {
                ["roles"] = new OpenApiArray
                {
                    new OpenApiString("admin"),
                    new OpenApiString("finance_manager")
                }
            });
        }

        if (method == "POST" && route.Contains("payroll/runs"))
        {
            AddRequestExample(operation, "application/json", new OpenApiObject
            {
                ["period"] = new OpenApiString("2026-02")
            });
        }

        if (method == "PUT" && route.Contains("workforce/employees/") && route.Contains("portal-access"))
        {
            AddRequestExample(operation, "application/json", new OpenApiObject
            {
                ["isEnabled"] = new OpenApiBoolean(true),
                ["allowedWidgets"] = new OpenApiArray
                {
                    new OpenApiString("overview"),
                    new OpenApiString("payslips"),
                    new OpenApiString("benefits")
                }
            });
        }
    }

    private static void AddRequestExample(OpenApiOperation operation, string contentType, IOpenApiAny example)
    {
        if (operation.RequestBody?.Content is null)
        {
            return;
        }

        if (operation.RequestBody.Content.TryGetValue(contentType, out var mediaType))
        {
            mediaType.Example = example;
        }
    }
}
