using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class QuoteEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid UserId { get; private set; }
    public string QuoteNumber { get; private set; } = string.Empty;
    public string ContactName { get; private set; } = string.Empty;
    public string ContactEmail { get; private set; } = string.Empty;
    public string ContactPhone { get; private set; } = string.Empty;
    public string ContactCompany { get; private set; } = string.Empty;
    public string ClientType { get; private set; } = "business";
    public string ServiceType { get; private set; } = string.Empty;
    public string Complexity { get; private set; } = "standard";
    public decimal EstimatedPrice { get; private set; }
    public decimal DiscountPercent { get; private set; }
    public decimal FinalPrice { get; private set; }
    public string Status { get; private set; } = "pending";
    public string Notes { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; private set; } = DateTime.UtcNow;

    private QuoteEntity() { }

    public QuoteEntity(
        Guid tenantId,
        Guid userId,
        string quoteNumber,
        string contactName,
        string contactEmail,
        string serviceType,
        decimal estimatedPrice,
        decimal discountPercent,
        decimal finalPrice,
        string status,
        string clientType = "business",
        string contactPhone = "",
        string contactCompany = "",
        string complexity = "standard",
        string notes = "")
    {
        TenantId = tenantId;
        UserId = userId;
        QuoteNumber = quoteNumber;
        ContactName = contactName;
        ContactEmail = contactEmail;
        ServiceType = serviceType;
        EstimatedPrice = estimatedPrice;
        DiscountPercent = discountPercent;
        FinalPrice = finalPrice;
        Status = status;
        ClientType = clientType;
        ContactPhone = contactPhone;
        ContactCompany = contactCompany;
        Complexity = complexity;
        Notes = notes;
    }

    public void SetStatus(string status)
    {
        Status = status.Trim().ToLowerInvariant();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkConverted()
    {
        Status = "converted";
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
