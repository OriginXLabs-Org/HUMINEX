using Asp.Versioning;
using Huminex.Api.Configuration;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin/internal")]
[Authorize]
public sealed class InternalAdminController(
    AppDbContext dbContext,
    ITenantProvider tenantProvider,
    IOptions<InternalAdminOptions> internalAdminOptions) : ControllerBase
{
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminSummaryResponse>>> GetSummary(CancellationToken cancellationToken)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        var since = now.AddHours(-24);

        var employerTenants = await dbContext.Users
            .IgnoreQueryFilters()
            .Select(x => x.TenantId)
            .Distinct()
            .CountAsync(cancellationToken);

        var employerAdminCount = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters()
            join role in dbContext.Roles.IgnoreQueryFilters() on ur.RoleId equals role.Id
            where role.Name == "admin" || role.Name == "super_admin" || role.Name == "director"
            select new { ur.TenantId, ur.UserId }
        ).Distinct().CountAsync(cancellationToken);

        var totalEmployees = await dbContext.Employees.IgnoreQueryFilters().CountAsync(cancellationToken);

        var auditEventsLast24h = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .Where(x => x.OccurredAtUtc >= since)
            .CountAsync(cancellationToken);

        var lastAuditAtUtc = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .OrderByDescending(x => x.OccurredAtUtc)
            .Select(x => (DateTime?)x.OccurredAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var response = new InternalAdminSummaryResponse(
            employerTenants,
            employerAdminCount,
            totalEmployees,
            auditEventsLast24h,
            lastAuditAtUtc);

        return Ok(new ApiEnvelope<InternalAdminSummaryResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("employers")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<EmployerOverviewResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<EmployerOverviewResponse>>>> GetEmployers(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 200);
        var adminRoleNames = new[] { "admin", "super_admin", "director" };

        var users = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Select(x => new { x.TenantId, x.Email, x.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var adminEmailsByTenant = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters().AsNoTracking()
            join role in dbContext.Roles.IgnoreQueryFilters().AsNoTracking() on ur.RoleId equals role.Id
            join user in dbContext.Users.IgnoreQueryFilters().AsNoTracking() on ur.UserId equals user.Id
            where adminRoleNames.Contains(role.Name)
            select new { ur.TenantId, user.Email }
        ).ToListAsync(cancellationToken);

        var employeeCounts = await dbContext.Employees
            .IgnoreQueryFilters()
            .AsNoTracking()
            .GroupBy(x => x.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var lastAuditByTenant = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .AsNoTracking()
            .GroupBy(x => x.TenantId)
            .Select(group => new { TenantId = group.Key, LastAt = group.Max(x => x.OccurredAtUtc) })
            .ToListAsync(cancellationToken);

        var employeeCountMap = employeeCounts.ToDictionary(x => x.TenantId, x => x.Count);
        var auditMap = lastAuditByTenant.ToDictionary(x => x.TenantId, x => x.LastAt);
        var adminMap = adminEmailsByTenant
            .GroupBy(x => x.TenantId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(x => x.Email).Distinct(StringComparer.OrdinalIgnoreCase).ToArray());

        var employerRows = users
            .GroupBy(x => x.TenantId)
            .Select(group =>
            {
                var sampleEmail = adminMap.TryGetValue(group.Key, out var adminEmails) && adminEmails.Length > 0
                    ? adminEmails[0]
                    : group.Select(x => x.Email).FirstOrDefault() ?? "unknown@gethuminex.com";

                var displayName = DeriveEmployerDisplayName(sampleEmail, group.Key);
                var slug = DeriveSlug(sampleEmail, group.Key);
                var updatedAt = auditMap.TryGetValue(group.Key, out var lastAudit)
                    ? lastAudit
                    : group.Max(x => x.CreatedAtUtc);

                return new EmployerOverviewResponse(
                    group.Key,
                    displayName,
                    slug,
                    "business",
                    "active",
                    group.Min(x => x.CreatedAtUtc),
                    updatedAt,
                    adminMap.TryGetValue(group.Key, out var admins) ? admins.Length : 0,
                    employeeCountMap.TryGetValue(group.Key, out var employeesCount) ? employeesCount : 0,
                    sampleEmail);
            })
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(normalizedLimit)
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<EmployerOverviewResponse>>(employerRows, HttpContext.TraceIdentifier));
    }

    [HttpGet("audit-logs")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalAdminAuditLogResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalAdminAuditLogResponse>>>> GetAuditLogs(
        [FromQuery] int limit = 100,
        [FromQuery] DateTime? sinceUtc = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 500);
        var query = dbContext.AuditTrails
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtUtc)
            .AsQueryable();

        if (sinceUtc.HasValue)
        {
            query = query.Where(x => x.OccurredAtUtc >= sinceUtc.Value);
        }

        var logs = await query
            .Take(normalizedLimit)
            .Select(x => new InternalAdminAuditLogResponse(
                x.Id,
                x.TenantId,
                x.ActorUserId,
                x.ActorEmail,
                x.Action,
                x.ResourceType,
                x.ResourceId,
                x.Outcome,
                x.MetadataJson,
                x.OccurredAtUtc))
            .ToArrayAsync(cancellationToken);

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalAdminAuditLogResponse>>(logs, HttpContext.TraceIdentifier));
    }

    private bool IsInternalAdmin()
    {
        var expected = internalAdminOptions.Value.Email.Trim();
        return !string.IsNullOrWhiteSpace(expected)
               && string.Equals(tenantProvider.UserEmail, expected, StringComparison.OrdinalIgnoreCase);
    }

    private static string DeriveEmployerDisplayName(string email, Guid tenantId)
    {
        var domain = email.Split('@').ElementAtOrDefault(1);
        if (string.IsNullOrWhiteSpace(domain))
        {
            return $"Employer {tenantId.ToString()[..8]}";
        }

        var primary = domain.Split('.').FirstOrDefault();
        if (string.IsNullOrWhiteSpace(primary))
        {
            return $"Employer {tenantId.ToString()[..8]}";
        }

        return $"{char.ToUpperInvariant(primary[0])}{primary[1..]}";
    }

    private static string DeriveSlug(string email, Guid tenantId)
    {
        var domain = email.Split('@').ElementAtOrDefault(1);
        if (string.IsNullOrWhiteSpace(domain))
        {
            return tenantId.ToString("N")[..10];
        }

        var slug = domain.Split('.').FirstOrDefault();
        return string.IsNullOrWhiteSpace(slug) ? tenantId.ToString("N")[..10] : slug.ToLowerInvariant();
    }
}

public sealed record InternalAdminSummaryResponse(
    int EmployerTenants,
    int EmployerAdmins,
    int TotalEmployees,
    int AuditEventsLast24Hours,
    DateTime? LastAuditAtUtc);

public sealed record EmployerOverviewResponse(
    Guid Id,
    string Name,
    string Slug,
    string TenantType,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    int AdminCount,
    int EmployeeCount,
    string ContactEmail);

public sealed record InternalAdminAuditLogResponse(
    Guid Id,
    Guid TenantId,
    Guid ActorUserId,
    string ActorEmail,
    string Action,
    string ResourceType,
    string ResourceId,
    string Outcome,
    string MetadataJson,
    DateTime OccurredAtUtc);
