namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class IdempotencyRecordEntity : ITenantEntity
{
    public Guid TenantId { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string HttpMethod { get; private set; } = string.Empty;
    public string RequestPath { get; private set; } = string.Empty;
    public int StatusCode { get; private set; }
    public string? ResponseBodyJson { get; private set; }
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; private set; }

    private IdempotencyRecordEntity() { }

    public IdempotencyRecordEntity(
        Guid tenantId,
        string key,
        string httpMethod,
        string requestPath,
        int statusCode,
        string? responseBodyJson,
        DateTime expiresAtUtc)
    {
        TenantId = tenantId;
        Key = key;
        HttpMethod = httpMethod;
        RequestPath = requestPath;
        StatusCode = statusCode;
        ResponseBodyJson = responseBodyJson;
        ExpiresAtUtc = expiresAtUtc;
    }
}
