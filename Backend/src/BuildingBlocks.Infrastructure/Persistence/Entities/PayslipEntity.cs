using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class PayslipEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public Guid EmployeeId { get; private set; }
    public Guid? PayrollRunId { get; private set; }
    public int PeriodYear { get; private set; }
    public int PeriodMonth { get; private set; }
    public decimal GrossAmount { get; private set; }
    public decimal DeductionsAmount { get; private set; }
    public decimal NetAmount { get; private set; }
    public string Status { get; private set; } = "processed";
    public DateTime? LastEmailedAtUtc { get; private set; }
    public string? DocumentBlobName { get; private set; }

    public EmployeeEntity Employee { get; private set; } = default!;
    public PayrollRunEntity? PayrollRun { get; private set; }

    private PayslipEntity() { }

    public PayslipEntity(
        Guid tenantId,
        Guid employeeId,
        Guid? payrollRunId,
        int periodYear,
        int periodMonth,
        decimal gross,
        decimal deductions,
        decimal net,
        string status)
    {
        TenantId = tenantId;
        EmployeeId = employeeId;
        PayrollRunId = payrollRunId;
        PeriodYear = periodYear;
        PeriodMonth = periodMonth;
        GrossAmount = gross;
        DeductionsAmount = deductions;
        NetAmount = net;
        Status = status;
    }

    public string Period => $"{PeriodYear:D4}-{PeriodMonth:D2}";

    public void MarkEmailed(DateTime timestampUtc)
    {
        LastEmailedAtUtc = timestampUtc;
    }

    public void AttachDocument(string blobName)
    {
        DocumentBlobName = blobName;
    }
}
