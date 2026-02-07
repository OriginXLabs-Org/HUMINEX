using System.Text.Json;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Huminex.Api.Idempotency;

public sealed class IdempotencyFilter(AppDbContext dbContext, ITenantProvider tenantProvider) : IAsyncActionFilter
{
    private const string HeaderName = "Idempotency-Key";
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromHours(24);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var values)
            || string.IsNullOrWhiteSpace(values.FirstOrDefault()))
        {
            context.Result = new BadRequestObjectResult(new
            {
                code = "idempotency_key_required",
                message = $"{HeaderName} header is required for this operation."
            });
            return;
        }

        var key = values.FirstOrDefault()?.Trim() ?? string.Empty;
        if (key.Length > 128)
        {
            context.Result = new BadRequestObjectResult(new
            {
                code = "idempotency_key_invalid",
                message = "Idempotency key must be 128 characters or less."
            });
            return;
        }

        var requestPath = context.HttpContext.Request.Path.ToString().ToLowerInvariant();
        var httpMethod = context.HttpContext.Request.Method.ToUpperInvariant();
        var now = DateTime.UtcNow;

        var existing = await dbContext.IdempotencyRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key && x.HttpMethod == httpMethod && x.RequestPath == requestPath && x.ExpiresAtUtc > now);

        if (existing is not null)
        {
            context.Result = Replay(existing);
            return;
        }

        var executedContext = await next();
        if (executedContext.Exception is not null)
        {
            return;
        }

        var statusCode = ResolveStatusCode(executedContext.Result);
        if (statusCode < 200 || statusCode >= 500)
        {
            return;
        }

        var responseBody = SerializeBody(executedContext.Result);
        dbContext.IdempotencyRecords.Add(new IdempotencyRecordEntity(
            tenantProvider.TenantId,
            key,
            httpMethod,
            requestPath,
            statusCode,
            responseBody,
            now.Add(DefaultTtl)));

        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            var raced = await dbContext.IdempotencyRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Key == key && x.HttpMethod == httpMethod && x.RequestPath == requestPath && x.ExpiresAtUtc > now);

            if (raced is not null)
            {
                context.Result = Replay(raced);
            }
        }
    }

    private static IActionResult Replay(IdempotencyRecordEntity record)
    {
        if (string.IsNullOrWhiteSpace(record.ResponseBodyJson))
        {
            return new StatusCodeResult(record.StatusCode);
        }

        return new ContentResult
        {
            ContentType = "application/json",
            StatusCode = record.StatusCode,
            Content = record.ResponseBodyJson
        };
    }

    private static int ResolveStatusCode(IActionResult? result) =>
        result switch
        {
            ObjectResult objectResult when objectResult.StatusCode.HasValue => objectResult.StatusCode.Value,
            StatusCodeResult statusCodeResult => statusCodeResult.StatusCode,
            ObjectResult => StatusCodes.Status200OK,
            _ => StatusCodes.Status200OK
        };

    private static string? SerializeBody(IActionResult? result)
    {
        if (result is ObjectResult objectResult && objectResult.Value is not null)
        {
            return JsonSerializer.Serialize(objectResult.Value, JsonOptions);
        }

        return null;
    }
}
