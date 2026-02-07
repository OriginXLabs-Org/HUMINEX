using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;

public sealed class UserRepository(AppDbContext dbContext, ITenantProvider tenantProvider) : IUserRepository
{
    public Task<AppUserEntity?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

    public Task<AppUserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == email.Trim().ToLowerInvariant(), cancellationToken);

    public async Task<AppUserEntity> EnsureUserAsync(Guid userId, string email, string displayName, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            user = new AppUserEntity(tenantProvider.TenantId, userId, displayName, email);
            dbContext.Users.Add(user);
        }
        else
        {
            user.TouchIdentity(displayName, email);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<IReadOnlyCollection<string>> GetRolesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.UserRoles
            .Where(x => x.UserId == userId)
            .Select(x => x.Role.Name)
            .Distinct()
            .OrderBy(name => name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task UpdateRolesAsync(Guid userId, IReadOnlyCollection<string> roleNames, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new InvalidOperationException($"User {userId} not found in current tenant scope.");
        }

        var normalizedRoles = roleNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var roles = await dbContext.Roles
            .Where(x => normalizedRoles.Contains(x.Name))
            .ToListAsync(cancellationToken);

        var missingRoles = normalizedRoles.Where(name => roles.All(role => role.Name != name)).ToArray();
        if (missingRoles.Length > 0)
        {
            foreach (var missingRole in missingRoles)
            {
                var role = new RoleEntity(tenantProvider.TenantId, missingRole, $"Auto-created role {missingRole}");
                dbContext.Roles.Add(role);
                roles.Add(role);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var existingAssignments = await dbContext.UserRoles.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        dbContext.UserRoles.RemoveRange(existingAssignments);
        foreach (var role in roles)
        {
            dbContext.UserRoles.Add(new UserRoleEntity(tenantProvider.TenantId, userId, role.Id));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

public sealed class RbacRepository(AppDbContext dbContext, ITenantProvider tenantProvider) : IRbacRepository
{
    public async Task<IReadOnlyCollection<PolicyProjection>> GetPoliciesAsync(CancellationToken cancellationToken = default)
    {
        var policies = await dbContext.PermissionPolicies
            .Include(x => x.Permissions)
            .OrderBy(x => x.PolicyId)
            .ToListAsync(cancellationToken);

        return policies
            .Select(policy => new PolicyProjection(
                policy.PolicyId,
                policy.Name,
                policy.Permissions.Select(x => x.Permission).OrderBy(x => x).ToArray()))
            .ToArray();
    }

    public async Task UpsertPolicyAsync(string policyId, IReadOnlyCollection<string> permissions, CancellationToken cancellationToken = default)
    {
        var normalizedPolicyId = policyId.Trim().ToLowerInvariant();
        var normalizedPermissions = permissions
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(x => x)
            .ToArray();

        var policy = await dbContext.PermissionPolicies
            .Include(x => x.Permissions)
            .FirstOrDefaultAsync(x => x.PolicyId == normalizedPolicyId, cancellationToken);

        if (policy is null)
        {
            policy = new PermissionPolicyEntity(tenantProvider.TenantId, normalizedPolicyId, normalizedPolicyId.Replace('-', ' '));
            dbContext.PermissionPolicies.Add(policy);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        dbContext.PermissionPolicyPermissions.RemoveRange(policy.Permissions);
        foreach (var permission in normalizedPermissions)
        {
            dbContext.PermissionPolicyPermissions.Add(new PermissionPolicyPermissionEntity(tenantProvider.TenantId, policy.Id, permission));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

public sealed class OrganizationRepository(AppDbContext dbContext) : IOrganizationRepository
{
    public async Task<(IReadOnlyCollection<EmployeeEntity> Employees, int TotalCount)> GetEmployeesPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var totalCount = await dbContext.Employees.CountAsync(cancellationToken);
        var employees = await dbContext.Employees
            .OrderBy(x => x.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (employees, totalCount);
    }

    public async Task<IReadOnlyCollection<EmployeeEntity>> GetAllEmployeesAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Employees.OrderBy(x => x.Name).ToArrayAsync(cancellationToken);
    }

    public Task<EmployeeEntity?> GetEmployeeByIdAsync(Guid employeeId, CancellationToken cancellationToken = default) =>
        dbContext.Employees.FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);

    public async Task<IReadOnlyCollection<EmployeeEntity>> GetManagerChainAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var chain = new List<EmployeeEntity>();
        var cursor = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);
        while (cursor?.ManagerEmployeeId is Guid managerId)
        {
            var manager = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == managerId, cancellationToken);
            if (manager is null)
            {
                break;
            }

            chain.Add(manager);
            cursor = manager;
        }

        return chain;
    }

    public async Task<IReadOnlyCollection<EmployeeEntity>> GetDirectReportsAsync(Guid managerId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Employees
            .Where(x => x.ManagerEmployeeId == managerId)
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task UpdatePortalAccessAsync(Guid employeeId, bool isEnabled, IReadOnlyCollection<string> allowedWidgets, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found in current tenant scope.");

        employee.UpdatePortalAccess(isEnabled, allowedWidgets);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

public sealed class PayrollRepository(AppDbContext dbContext, ITenantProvider tenantProvider) : IPayrollRepository
{
    public async Task<IReadOnlyCollection<PayrollRunEntity>> GetRunsAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.PayrollRuns
            .OrderByDescending(x => x.PeriodYear)
            .ThenByDescending(x => x.PeriodMonth)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<PayrollRunEntity> CreateRunAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var run = new PayrollRunEntity(tenantProvider.TenantId, year, month);
        dbContext.PayrollRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);
        return run;
    }

    public Task<PayrollRunEntity?> GetRunByIdAsync(Guid runId, CancellationToken cancellationToken = default) =>
        dbContext.PayrollRuns.FirstOrDefaultAsync(x => x.Id == runId, cancellationToken);

    public async Task<PayrollRunEntity?> ApproveRunAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        var run = await dbContext.PayrollRuns.FirstOrDefaultAsync(x => x.Id == runId, cancellationToken);
        if (run is null)
        {
            return null;
        }

        run.SetApproved();
        await dbContext.SaveChangesAsync(cancellationToken);
        return run;
    }

    public async Task<PayrollRunEntity?> DisburseRunAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        var run = await dbContext.PayrollRuns.FirstOrDefaultAsync(x => x.Id == runId, cancellationToken);
        if (run is null)
        {
            return null;
        }

        run.SetDisbursed();
        await dbContext.SaveChangesAsync(cancellationToken);
        return run;
    }

    public async Task<IReadOnlyCollection<PayslipEntity>> GetPayslipsByEmployeeAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Payslips
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.PeriodYear)
            .ThenByDescending(x => x.PeriodMonth)
            .ToArrayAsync(cancellationToken);
    }

    public Task<PayslipEntity?> GetPayslipByEmployeePeriodAsync(Guid employeeId, int year, int month, CancellationToken cancellationToken = default) =>
        dbContext.Payslips.FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.PeriodYear == year && x.PeriodMonth == month, cancellationToken);

    public async Task MarkPayslipEmailedAsync(Guid employeeId, int year, int month, CancellationToken cancellationToken = default)
    {
        var payslip = await GetPayslipByEmployeePeriodAsync(employeeId, year, month, cancellationToken)
            ?? throw new InvalidOperationException($"Payslip for {employeeId}/{year}-{month} not found in current tenant scope.");

        payslip.MarkEmailed(DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AttachPayslipDocumentAsync(Guid employeeId, int year, int month, string blobName, CancellationToken cancellationToken = default)
    {
        var payslip = await GetPayslipByEmployeePeriodAsync(employeeId, year, month, cancellationToken)
            ?? throw new InvalidOperationException($"Payslip for {employeeId}/{year}-{month} not found in current tenant scope.");

        payslip.AttachDocument(blobName);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

public sealed class AuditTrailRepository(AppDbContext dbContext, ITenantProvider tenantProvider) : IAuditTrailRepository
{
    public async Task AddAsync(string action, string resourceType, string resourceId, string outcome, object metadata, CancellationToken cancellationToken = default)
    {
        var entry = new AuditTrailEntity(
            tenantProvider.TenantId,
            tenantProvider.UserId,
            tenantProvider.UserEmail,
            action.Trim().ToLowerInvariant(),
            resourceType.Trim().ToLowerInvariant(),
            resourceId,
            outcome.Trim().ToLowerInvariant(),
            JsonSerializer.Serialize(metadata));

        dbContext.AuditTrails.Add(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
