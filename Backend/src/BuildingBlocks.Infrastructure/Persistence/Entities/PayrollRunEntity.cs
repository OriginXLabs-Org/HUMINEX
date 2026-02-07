using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class PayrollRunEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public int PeriodYear { get; private set; }
    public int PeriodMonth { get; private set; }
    public string Status { get; private set; } = "draft";
    public int EmployeesCount { get; private set; }
    public decimal GrossAmount { get; private set; }
    public decimal NetAmount { get; private set; }
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    public ICollection<PayslipEntity> Payslips { get; } = new List<PayslipEntity>();

    private PayrollRunEntity() { }

    public PayrollRunEntity(Guid tenantId, int periodYear, int periodMonth)
    {
        TenantId = tenantId;
        PeriodYear = periodYear;
        PeriodMonth = periodMonth;
    }

    public string Period => $"{PeriodYear:D4}-{PeriodMonth:D2}";

    public void SetApproved() => Status = "approved";
    public void SetDisbursed() => Status = "disbursed";
    public void SetTotals(int employeesCount, decimal gross, decimal net)
    {
        EmployeesCount = employeesCount;
        GrossAmount = gross;
        NetAmount = net;
    }
}
