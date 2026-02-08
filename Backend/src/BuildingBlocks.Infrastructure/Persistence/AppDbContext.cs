using System.Linq.Expressions;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenantProvider)
    : DbContext(options), IAppDbContext
{
    public Guid CurrentTenantId => tenantProvider.TenantId;

    public DbSet<AppUserEntity> Users => Set<AppUserEntity>();
    public DbSet<RoleEntity> Roles => Set<RoleEntity>();
    public DbSet<UserRoleEntity> UserRoles => Set<UserRoleEntity>();
    public DbSet<PermissionPolicyEntity> PermissionPolicies => Set<PermissionPolicyEntity>();
    public DbSet<PermissionPolicyPermissionEntity> PermissionPolicyPermissions => Set<PermissionPolicyPermissionEntity>();
    public DbSet<EmployeeEntity> Employees => Set<EmployeeEntity>();
    public DbSet<PayrollRunEntity> PayrollRuns => Set<PayrollRunEntity>();
    public DbSet<PayslipEntity> Payslips => Set<PayslipEntity>();
    public DbSet<QuoteEntity> Quotes => Set<QuoteEntity>();
    public DbSet<InvoiceEntity> Invoices => Set<InvoiceEntity>();
    public DbSet<IdempotencyRecordEntity> IdempotencyRecords => Set<IdempotencyRecordEntity>();
    public DbSet<AuditTrailEntity> AuditTrails => Set<AuditTrailEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("core");

        modelBuilder.Entity<AppUserEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DisplayName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired();
            entity.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();
        });

        modelBuilder.Entity<RoleEntity>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<UserRoleEntity>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(x => new { x.TenantId, x.UserId, x.RoleId });
            entity.HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId);
        });

        modelBuilder.Entity<PermissionPolicyEntity>(entity =>
        {
            entity.ToTable("permission_policies");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PolicyId).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(180).IsRequired();
            entity.HasIndex(x => new { x.TenantId, x.PolicyId }).IsUnique();
        });

        modelBuilder.Entity<PermissionPolicyPermissionEntity>(entity =>
        {
            entity.ToTable("permission_policy_permissions");
            entity.HasKey(x => new { x.TenantId, x.PermissionPolicyEntityId, x.Permission });
            entity.Property(x => x.Permission).HasMaxLength(160).IsRequired();
            entity.HasOne(x => x.Policy)
                .WithMany(x => x.Permissions)
                .HasForeignKey(x => x.PermissionPolicyEntityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmployeeEntity>(entity =>
        {
            entity.ToTable("employees");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EmployeeCode).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Department).HasMaxLength(120).IsRequired();
            entity.Property(x => x.AllowedWidgetsCsv).HasMaxLength(2000);
            entity.HasIndex(x => new { x.TenantId, x.EmployeeCode }).IsUnique();
            entity.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();
            entity.HasOne(x => x.Manager)
                .WithMany(x => x.DirectReports)
                .HasForeignKey(x => x.ManagerEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PayrollRunEntity>(entity =>
        {
            entity.ToTable("payroll_runs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.HasIndex(x => new { x.TenantId, x.PeriodYear, x.PeriodMonth }).IsUnique();
        });

        modelBuilder.Entity<PayslipEntity>(entity =>
        {
            entity.ToTable("payslips");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.DocumentBlobName).HasMaxLength(600);
            entity.HasIndex(x => new { x.TenantId, x.EmployeeId, x.PeriodYear, x.PeriodMonth }).IsUnique();
            entity.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
            entity.HasOne(x => x.PayrollRun).WithMany(x => x.Payslips).HasForeignKey(x => x.PayrollRunId);
        });

        modelBuilder.Entity<QuoteEntity>(entity =>
        {
            entity.ToTable("quotes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuoteNumber).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ContactName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ContactEmail).HasMaxLength(320).IsRequired();
            entity.Property(x => x.ContactPhone).HasMaxLength(40).IsRequired();
            entity.Property(x => x.ContactCompany).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ClientType).HasMaxLength(40).IsRequired();
            entity.Property(x => x.ServiceType).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Complexity).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
            entity.Property(x => x.EstimatedPrice).HasColumnType("numeric(18,2)");
            entity.Property(x => x.DiscountPercent).HasColumnType("numeric(10,2)");
            entity.Property(x => x.FinalPrice).HasColumnType("numeric(18,2)");
            entity.HasIndex(x => new { x.TenantId, x.QuoteNumber }).IsUnique();
            entity.HasIndex(x => new { x.TenantId, x.Status, x.CreatedAtUtc });
        });

        modelBuilder.Entity<InvoiceEntity>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.InvoiceNumber).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Amount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.TaxPercent).HasColumnType("numeric(10,2)");
            entity.Property(x => x.TaxAmount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.TotalAmount).HasColumnType("numeric(18,2)");
            entity.HasIndex(x => new { x.TenantId, x.InvoiceNumber }).IsUnique();
            entity.HasIndex(x => new { x.TenantId, x.Status, x.CreatedAtUtc });
        });

        modelBuilder.Entity<IdempotencyRecordEntity>(entity =>
        {
            entity.ToTable("idempotency_records");
            entity.HasKey(x => new { x.TenantId, x.Key, x.HttpMethod, x.RequestPath });
            entity.Property(x => x.Key).HasMaxLength(128).IsRequired();
            entity.Property(x => x.HttpMethod).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RequestPath).HasMaxLength(512).IsRequired();
            entity.Property(x => x.ResponseBodyJson).HasColumnType("text");
            entity.HasIndex(x => x.ExpiresAtUtc);
        });

        modelBuilder.Entity<AuditTrailEntity>(entity =>
        {
            entity.ToTable("audit_trails");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ActorEmail).HasMaxLength(320).IsRequired();
            entity.Property(x => x.Action).HasMaxLength(160).IsRequired();
            entity.Property(x => x.ResourceType).HasMaxLength(120).IsRequired();
            entity.Property(x => x.ResourceId).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Outcome).HasMaxLength(40).IsRequired();
            entity.Property(x => x.MetadataJson).HasColumnType("text").IsRequired();
            entity.HasIndex(x => new { x.TenantId, x.OccurredAtUtc });
            entity.HasIndex(x => new { x.TenantId, x.ActorUserId, x.OccurredAtUtc });
        });

        ApplyTenantQueryFilter<AppUserEntity>(modelBuilder);
        ApplyTenantQueryFilter<RoleEntity>(modelBuilder);
        ApplyTenantQueryFilter<UserRoleEntity>(modelBuilder);
        ApplyTenantQueryFilter<PermissionPolicyEntity>(modelBuilder);
        ApplyTenantQueryFilter<PermissionPolicyPermissionEntity>(modelBuilder);
        ApplyTenantQueryFilter<EmployeeEntity>(modelBuilder);
        ApplyTenantQueryFilter<PayrollRunEntity>(modelBuilder);
        ApplyTenantQueryFilter<PayslipEntity>(modelBuilder);
        ApplyTenantQueryFilter<QuoteEntity>(modelBuilder);
        ApplyTenantQueryFilter<InvoiceEntity>(modelBuilder);
        ApplyTenantQueryFilter<IdempotencyRecordEntity>(modelBuilder);
        ApplyTenantQueryFilter<AuditTrailEntity>(modelBuilder);
    }

    private void ApplyTenantQueryFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity
    {
        Expression<Func<TEntity, bool>> filter = entity => entity.TenantId == CurrentTenantId;
        modelBuilder.Entity<TEntity>().HasQueryFilter(filter);
    }
}
