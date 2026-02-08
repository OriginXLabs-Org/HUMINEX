using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class InvoiceEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid QuoteId { get; private set; }
    public Guid UserId { get; private set; }
    public string InvoiceNumber { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public decimal TaxPercent { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public DateTime DueDateUtc { get; private set; }
    public string Status { get; private set; } = "sent";
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; private set; } = DateTime.UtcNow;

    private InvoiceEntity() { }

    public InvoiceEntity(
        Guid tenantId,
        Guid quoteId,
        Guid userId,
        string invoiceNumber,
        decimal amount,
        decimal taxPercent,
        decimal taxAmount,
        decimal totalAmount,
        DateTime dueDateUtc,
        string status = "sent")
    {
        TenantId = tenantId;
        QuoteId = quoteId;
        UserId = userId;
        InvoiceNumber = invoiceNumber;
        Amount = amount;
        TaxPercent = taxPercent;
        TaxAmount = taxAmount;
        TotalAmount = totalAmount;
        DueDateUtc = dueDateUtc;
        Status = status;
    }

    public void SetStatus(string status)
    {
        Status = status.Trim().ToLowerInvariant();
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
