using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence;

public interface IAppDbContext
{
    DbSet<AppUserEntity> Users { get; }
    DbSet<RoleEntity> Roles { get; }
    DbSet<UserRoleEntity> UserRoles { get; }
    DbSet<PermissionPolicyEntity> PermissionPolicies { get; }
    DbSet<PermissionPolicyPermissionEntity> PermissionPolicyPermissions { get; }
    DbSet<EmployeeEntity> Employees { get; }
    DbSet<PayrollRunEntity> PayrollRuns { get; }
    DbSet<PayslipEntity> Payslips { get; }
    DbSet<IdempotencyRecordEntity> IdempotencyRecords { get; }
    DbSet<AuditTrailEntity> AuditTrails { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
