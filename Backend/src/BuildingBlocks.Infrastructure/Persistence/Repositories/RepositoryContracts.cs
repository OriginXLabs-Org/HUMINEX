using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;

public sealed record PolicyProjection(string PolicyId, string Name, IReadOnlyCollection<string> Permissions);

public interface IUserRepository
{
    Task<AppUserEntity?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AppUserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<AppUserEntity> EnsureUserAsync(Guid userId, string email, string displayName, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetRolesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpdateRolesAsync(Guid userId, IReadOnlyCollection<string> roleNames, CancellationToken cancellationToken = default);
}

public interface IRbacRepository
{
    Task<IReadOnlyCollection<PolicyProjection>> GetPoliciesAsync(CancellationToken cancellationToken = default);
    Task UpsertPolicyAsync(string policyId, IReadOnlyCollection<string> permissions, CancellationToken cancellationToken = default);
}

public interface IOrganizationRepository
{
    Task<(IReadOnlyCollection<EmployeeEntity> Employees, int TotalCount)> GetEmployeesPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<EmployeeEntity>> GetAllEmployeesAsync(CancellationToken cancellationToken = default);
    Task<EmployeeEntity?> GetEmployeeByIdAsync(Guid employeeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<EmployeeEntity>> GetManagerChainAsync(Guid employeeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<EmployeeEntity>> GetDirectReportsAsync(Guid managerId, CancellationToken cancellationToken = default);
    Task UpdatePortalAccessAsync(Guid employeeId, bool isEnabled, IReadOnlyCollection<string> allowedWidgets, CancellationToken cancellationToken = default);
}

public interface IPayrollRepository
{
    Task<IReadOnlyCollection<PayrollRunEntity>> GetRunsAsync(CancellationToken cancellationToken = default);
    Task<PayrollRunEntity> CreateRunAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<PayrollRunEntity?> GetRunByIdAsync(Guid runId, CancellationToken cancellationToken = default);
    Task<PayrollRunEntity?> ApproveRunAsync(Guid runId, CancellationToken cancellationToken = default);
    Task<PayrollRunEntity?> DisburseRunAsync(Guid runId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<PayslipEntity>> GetPayslipsByEmployeeAsync(Guid employeeId, CancellationToken cancellationToken = default);
    Task<PayslipEntity?> GetPayslipByEmployeePeriodAsync(Guid employeeId, int year, int month, CancellationToken cancellationToken = default);
    Task MarkPayslipEmailedAsync(Guid employeeId, int year, int month, CancellationToken cancellationToken = default);
    Task AttachPayslipDocumentAsync(Guid employeeId, int year, int month, string blobName, CancellationToken cancellationToken = default);
}

public interface IAuditTrailRepository
{
    Task AddAsync(string action, string resourceType, string resourceId, string outcome, object metadata, CancellationToken cancellationToken = default);
}
