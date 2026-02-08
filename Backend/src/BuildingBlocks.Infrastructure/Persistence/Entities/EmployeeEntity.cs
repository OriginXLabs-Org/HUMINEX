using Huminex.SharedKernel.Primitives;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

public sealed class EmployeeEntity : Entity, ITenantEntity
{
    public Guid TenantId { get; private set; }
    public string EmployeeCode { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty;
    public string Department { get; private set; } = string.Empty;
    public Guid? ManagerEmployeeId { get; private set; }
    public Guid? UserId { get; private set; }
    public bool IsPortalAccessEnabled { get; private set; } = true;
    public string AllowedWidgetsCsv { get; private set; } = string.Empty;

    public EmployeeEntity? Manager { get; private set; }
    public ICollection<EmployeeEntity> DirectReports { get; } = new List<EmployeeEntity>();

    private EmployeeEntity() { }

    public EmployeeEntity(
        Guid tenantId,
        string employeeCode,
        string name,
        string email,
        string role,
        string department,
        Guid? managerEmployeeId,
        Guid? userId)
    {
        TenantId = tenantId;
        EmployeeCode = employeeCode;
        Name = name;
        Email = email.Trim().ToLowerInvariant();
        Role = role;
        Department = department;
        ManagerEmployeeId = managerEmployeeId;
        UserId = userId;
    }

    public IReadOnlyCollection<string> AllowedWidgets => AllowedWidgetsCsv
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(value => value.Trim())
        .Where(value => value.Length > 0)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    public void UpdateRole(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            throw new ArgumentException("Role cannot be empty.", nameof(role));
        }

        Role = role.Trim().ToLowerInvariant();
    }

    public void UpdatePortalAccess(bool isEnabled, IReadOnlyCollection<string> allowedWidgets)
    {
        IsPortalAccessEnabled = isEnabled;
        AllowedWidgetsCsv = string.Join(',', allowedWidgets.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim().ToLowerInvariant()));
    }
}
