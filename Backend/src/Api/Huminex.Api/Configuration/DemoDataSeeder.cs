using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Configuration;

public sealed class DemoDataSeeder(IServiceProvider serviceProvider, IOptions<DevSecurityOptions> options)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await dbContext.Employees.AnyAsync(cancellationToken))
        {
            return;
        }

        var dev = options.Value;
        var tenantId = Guid.TryParse(dev.FallbackTenantId, out var tenant) ? tenant : Guid.Parse("11111111-1111-1111-1111-111111111111");
        var adminUserId = Guid.TryParse(dev.FallbackUserId, out var userId) ? userId : Guid.Parse("22222222-2222-2222-2222-222222222222");

        var adminUser = new AppUserEntity(tenantId, adminUserId, "Admin User", dev.FallbackUserEmail);
        var adminRole = new RoleEntity(tenantId, "admin", "Tenant Admin");
        dbContext.Users.Add(adminUser);
        dbContext.Roles.Add(adminRole);
        await dbContext.SaveChangesAsync(cancellationToken);

        dbContext.UserRoles.Add(new UserRoleEntity(tenantId, adminUser.Id, adminRole.Id));

        var policy = new PermissionPolicyEntity(tenantId, "employee-admin", "Employee Admin");
        dbContext.PermissionPolicies.Add(policy);
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.PermissionPolicyPermissions.Add(new PermissionPolicyPermissionEntity(tenantId, policy.Id, "org.read"));
        dbContext.PermissionPolicyPermissions.Add(new PermissionPolicyPermissionEntity(tenantId, policy.Id, "payroll.read"));

        var founder = new EmployeeEntity(tenantId, "EMP-0001", "Aarav Founder", "founder@gethuminex.com", "founder", "Executive", null, adminUser.Id);
        var cto = new EmployeeEntity(tenantId, "EMP-0002", "Riya CTO", "cto@gethuminex.com", "cto", "Executive", founder.Id, null);
        var seniorEngineer = new EmployeeEntity(tenantId, "EMP-1001", "Kabir Senior Engineer", "se@gethuminex.com", "senior_engineer", "Engineering", cto.Id, null);
        seniorEngineer.UpdatePortalAccess(true, ["overview", "payslips", "benefits", "documents"]);

        dbContext.Employees.AddRange(founder, cto, seniorEngineer);

        var janRun = new PayrollRunEntity(tenantId, 2026, 1);
        janRun.SetTotals(3, 525000m, 470000m);
        var decRun = new PayrollRunEntity(tenantId, 2025, 12);
        decRun.SetTotals(3, 510000m, 455000m);

        dbContext.PayrollRuns.AddRange(janRun, decRun);
        await dbContext.SaveChangesAsync(cancellationToken);

        dbContext.Payslips.AddRange(
            new PayslipEntity(tenantId, seniorEngineer.Id, janRun.Id, 2026, 1, 185000m, 22000m, 163000m, "processed"),
            new PayslipEntity(tenantId, seniorEngineer.Id, decRun.Id, 2025, 12, 182000m, 21500m, 160500m, "paid"));

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
