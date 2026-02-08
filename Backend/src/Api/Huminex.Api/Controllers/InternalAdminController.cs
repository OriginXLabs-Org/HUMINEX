using Asp.Versioning;
using Huminex.Api.Configuration;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin/internal")]
[Authorize]
public sealed class InternalAdminController(
    AppDbContext dbContext,
    ITenantProvider tenantProvider,
    IOptions<InternalAdminOptions> internalAdminOptions,
    HealthCheckService healthCheckService) : ControllerBase
{
    private static readonly string[] AdminRoleNames = ["admin", "super_admin", "director"];

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
            .Select(x => x.TenantId).Where(x => x != Guid.Empty)
            .Concat(dbContext.Employees.IgnoreQueryFilters().Select(x => x.TenantId).Where(x => x != Guid.Empty))
            .Concat(dbContext.AuditTrails.IgnoreQueryFilters().Select(x => x.TenantId).Where(x => x != Guid.Empty))
            .Distinct()
            .CountAsync(cancellationToken);

        var employerAdminCount = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters()
            join role in dbContext.Roles.IgnoreQueryFilters() on ur.RoleId equals role.Id
            where AdminRoleNames.Contains(role.Name.ToLower())
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
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 200);
        var normalizedOffset = Math.Max(offset, 0);
        var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();
        var normalizedStatus = (status ?? string.Empty).Trim().ToLowerInvariant();

        var employers = await BuildEmployerRows(cancellationToken);
        var response = employers
            .Where(x =>
                string.IsNullOrWhiteSpace(normalizedSearch)
                || x.Name.ToLower().Contains(normalizedSearch)
                || x.Slug.ToLower().Contains(normalizedSearch)
                || x.ContactEmail.ToLower().Contains(normalizedSearch))
            .Where(x => string.IsNullOrWhiteSpace(normalizedStatus) || x.Status.ToLower() == normalizedStatus)
            .Skip(normalizedOffset)
            .Take(normalizedLimit)
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<EmployerOverviewResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("employers/{tenantId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<EmployerOverviewResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<EmployerOverviewResponse>>> GetEmployerById(
        [FromRoute] Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var employers = await BuildEmployerRows(cancellationToken);
        var employer = employers.FirstOrDefault(x => x.Id == tenantId);
        if (employer is null)
        {
            return NotFound();
        }

        return Ok(new ApiEnvelope<EmployerOverviewResponse>(employer, HttpContext.TraceIdentifier));
    }

    [HttpGet("employers/{tenantId:guid}/users")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalEmployerUserResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalEmployerUserResponse>>>> GetEmployerUsers(
        [FromRoute] Guid tenantId,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 500);
        var users = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(normalizedLimit)
            .Select(x => new
            {
                x.Id,
                x.TenantId,
                x.DisplayName,
                x.Email,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var roleAssignments = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters().AsNoTracking()
            join role in dbContext.Roles.IgnoreQueryFilters().AsNoTracking() on ur.RoleId equals role.Id
            where ur.TenantId == tenantId
            select new { ur.UserId, Role = role.Name }
        ).ToListAsync(cancellationToken);

        var roleMap = roleAssignments
            .GroupBy(x => x.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(x => x.Role).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToArray());

        var response = users
            .Select(x => new InternalEmployerUserResponse(
                x.Id,
                x.TenantId,
                x.DisplayName,
                x.Email,
                roleMap.TryGetValue(x.Id, out var roles) ? roles : [],
                x.CreatedAtUtc))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalEmployerUserResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalAdminUserResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalAdminUserResponse>>>> GetUsers(
        [FromQuery] int limit = 200,
        [FromQuery] string? search = null,
        [FromQuery] Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 1000);
        var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();

        var query = dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AsQueryable();

        if (tenantId.HasValue)
        {
            query = query.Where(x => x.TenantId == tenantId.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(x =>
                x.DisplayName.ToLower().Contains(normalizedSearch)
                || x.Email.ToLower().Contains(normalizedSearch));
        }

        var users = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(normalizedLimit)
            .Select(x => new
            {
                x.Id,
                x.TenantId,
                x.DisplayName,
                x.Email,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var userIds = users.Select(x => x.Id).ToArray();
        var roles = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters().AsNoTracking()
            join role in dbContext.Roles.IgnoreQueryFilters().AsNoTracking() on ur.RoleId equals role.Id
            where userIds.Contains(ur.UserId)
            select new { ur.UserId, role.Name }
        ).ToListAsync(cancellationToken);

        var roleMap = roles
            .GroupBy(x => x.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(x => x.Name).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToArray());

        var response = users
            .Select(x => new InternalAdminUserResponse(
                x.Id,
                x.TenantId,
                x.DisplayName,
                x.Email,
                roleMap.TryGetValue(x.Id, out var assignedRoles) ? assignedRoles : [],
                x.CreatedAtUtc))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalAdminUserResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("employers/{tenantId:guid}/activity")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalAdminAuditLogResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalAdminAuditLogResponse>>>> GetEmployerActivity(
        [FromRoute] Guid tenantId,
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
            .Where(x => x.TenantId == tenantId)
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

    [HttpGet("quotes")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalAdminQuoteResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalAdminQuoteResponse>>>> GetQuotes(
        [FromQuery] int limit = 200,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 1000);
        var normalizedStatus = (status ?? string.Empty).Trim().ToLowerInvariant();
        var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();

        var query = dbContext.Quotes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedStatus) && normalizedStatus != "all")
        {
            query = query.Where(x => x.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(x =>
                x.QuoteNumber.ToLower().Contains(normalizedSearch)
                || x.ContactName.ToLower().Contains(normalizedSearch)
                || x.ContactEmail.ToLower().Contains(normalizedSearch)
                || x.ServiceType.ToLower().Contains(normalizedSearch));
        }

        var quotes = await query
            .Take(normalizedLimit)
            .Select(x => new InternalAdminQuoteResponse(
                x.Id,
                x.TenantId,
                x.UserId,
                x.QuoteNumber,
                x.ContactName,
                x.ContactEmail,
                x.ContactPhone,
                x.ContactCompany,
                x.ClientType,
                x.ServiceType,
                x.Complexity,
                x.EstimatedPrice,
                x.DiscountPercent,
                x.FinalPrice,
                x.Status,
                x.Notes,
                x.CreatedAtUtc,
                x.UpdatedAtUtc))
            .ToArrayAsync(cancellationToken);

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalAdminQuoteResponse>>(quotes, HttpContext.TraceIdentifier));
    }

    [HttpPut("quotes/{quoteId:guid}/status")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminQuoteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminQuoteResponse>>> UpdateQuoteStatus(
        [FromRoute] Guid quoteId,
        [FromBody] UpdateInternalAdminQuoteStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedStatus = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedStatus is not ("pending" or "approved" or "rejected" or "converted" or "draft"))
        {
            return BadRequest(new
            {
                code = "invalid_status",
                message = "Status must be one of: draft, pending, approved, rejected, converted."
            });
        }

        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null)
        {
            return NotFound();
        }

        quote.SetStatus(normalizedStatus);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new InternalAdminQuoteResponse(
            quote.Id,
            quote.TenantId,
            quote.UserId,
            quote.QuoteNumber,
            quote.ContactName,
            quote.ContactEmail,
            quote.ContactPhone,
            quote.ContactCompany,
            quote.ClientType,
            quote.ServiceType,
            quote.Complexity,
            quote.EstimatedPrice,
            quote.DiscountPercent,
            quote.FinalPrice,
            quote.Status,
            quote.Notes,
            quote.CreatedAtUtc,
            quote.UpdatedAtUtc);

        dbContext.AuditTrails.Add(new Huminex.BuildingBlocks.Infrastructure.Persistence.Entities.AuditTrailEntity(
            quote.TenantId,
            tenantProvider.UserId,
            tenantProvider.UserEmail,
            "internal_admin_quote_status_updated",
            "quote",
            quote.Id.ToString(),
            "success",
            System.Text.Json.JsonSerializer.Serialize(new
            {
                quote.QuoteNumber,
                status = quote.Status
            })));
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new ApiEnvelope<InternalAdminQuoteResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpPost("quotes/{quoteId:guid}/convert-to-invoice")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminQuoteConversionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminQuoteConversionResponse>>> ConvertQuoteToInvoice(
        [FromRoute] Guid quoteId,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null)
        {
            return NotFound();
        }

        if (quote.Status != "approved")
        {
            return BadRequest(new
            {
                code = "quote_not_approved",
                message = "Only approved quotes can be converted to invoice."
            });
        }

        var existingInvoice = await dbContext.Invoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.QuoteId == quoteId, cancellationToken);
        if (existingInvoice is not null)
        {
            return Ok(new ApiEnvelope<InternalAdminQuoteConversionResponse>(
                new InternalAdminQuoteConversionResponse(
                    quote.Id,
                    quote.QuoteNumber,
                    existingInvoice.Id,
                    existingInvoice.InvoiceNumber,
                    existingInvoice.Status,
                    existingInvoice.TotalAmount),
                HttpContext.TraceIdentifier));
        }

        var tenantInvoiceCount = await dbContext.Invoices
            .IgnoreQueryFilters()
            .CountAsync(x => x.TenantId == quote.TenantId, cancellationToken);
        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMM}-{(tenantInvoiceCount + 1):D5}";

        var amount = quote.FinalPrice;
        var taxPercent = 18m;
        var taxAmount = Math.Round(amount * taxPercent / 100m, 2, MidpointRounding.AwayFromZero);
        var totalAmount = amount + taxAmount;
        var dueDate = DateTime.UtcNow.Date.AddDays(30);

        var invoice = new Huminex.BuildingBlocks.Infrastructure.Persistence.Entities.InvoiceEntity(
            quote.TenantId,
            quote.Id,
            quote.UserId,
            invoiceNumber,
            amount,
            taxPercent,
            taxAmount,
            totalAmount,
            dueDate,
            "sent");

        dbContext.Invoices.Add(invoice);
        quote.MarkConverted();
        await dbContext.SaveChangesAsync(cancellationToken);

        dbContext.AuditTrails.Add(new Huminex.BuildingBlocks.Infrastructure.Persistence.Entities.AuditTrailEntity(
            quote.TenantId,
            tenantProvider.UserId,
            tenantProvider.UserEmail,
            "internal_admin_quote_converted",
            "quote",
            quote.Id.ToString(),
            "success",
            System.Text.Json.JsonSerializer.Serialize(new
            {
                quote.QuoteNumber,
                invoice.Id,
                invoice.InvoiceNumber,
                invoice.TotalAmount
            })));
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new InternalAdminQuoteConversionResponse(
            quote.Id,
            quote.QuoteNumber,
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.Status,
            invoice.TotalAmount);

        return Ok(new ApiEnvelope<InternalAdminQuoteConversionResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("system-logs")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalSystemLogResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalSystemLogResponse>>>> GetSystemLogs(
        [FromQuery] string? level = null,
        [FromQuery] int limit = 200,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 1000);
        var normalizedLevel = (level ?? string.Empty).Trim().ToLowerInvariant();

        var logs = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(normalizedLimit * 2)
            .Select(x => new InternalSystemLogResponse(
                x.Id,
                DeriveLevel(x.Outcome, x.Action),
                x.ResourceType,
                $"{x.Action} by {x.ActorEmail} on {x.ResourceType}:{x.ResourceId}",
                x.MetadataJson,
                x.OccurredAtUtc))
            .ToListAsync(cancellationToken);

        var filtered = logs
            .Where(x => string.IsNullOrWhiteSpace(normalizedLevel) || normalizedLevel == "all" || x.Level == normalizedLevel)
            .Take(normalizedLimit)
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalSystemLogResponse>>(filtered, HttpContext.TraceIdentifier));
    }

    [HttpGet("system-health")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalSystemHealthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalSystemHealthResponse>>> GetSystemHealth(CancellationToken cancellationToken)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var report = await healthCheckService.CheckHealthAsync(_ => true, cancellationToken);
        var checks = report.Entries
            .Select(entry => new InternalSystemHealthCheckResponse(
                entry.Key,
                entry.Value.Status.ToString().ToLowerInvariant(),
                $"{entry.Value.Duration.TotalMilliseconds:0}ms",
                entry.Value.Description ?? string.Empty))
            .OrderBy(x => x.Name)
            .ToArray();

        var response = new InternalSystemHealthResponse(
            report.Status.ToString().ToLowerInvariant(),
            DateTime.UtcNow,
            checks);

        return Ok(new ApiEnvelope<InternalSystemHealthResponse>(response, HttpContext.TraceIdentifier));
    }

    private bool IsInternalAdmin()
    {
        var expected = internalAdminOptions.Value.Email.Trim();
        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        if (!tenantProvider.IsAuthenticated)
        {
            return false;
        }

        if (!string.Equals(tenantProvider.UserEmail, expected, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var allowedRoles = internalAdminOptions.Value.AllowedRoles is { Length: > 0 }
            ? internalAdminOptions.Value.AllowedRoles
            : AdminRoleNames;

        var normalizedRole = (tenantProvider.Role ?? string.Empty).Trim().ToLowerInvariant();
        if (allowedRoles.Any(role => string.Equals(role, normalizedRole, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return tenantProvider.Permissions.Any(permission =>
            string.Equals(permission, "internal.admin", StringComparison.OrdinalIgnoreCase));
    }

    private async Task<EmployerOverviewResponse[]> BuildEmployerRows(CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Select(x => new { x.TenantId, x.Email, x.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var adminEmailsByTenant = await (
            from ur in dbContext.UserRoles.IgnoreQueryFilters().AsNoTracking()
            join role in dbContext.Roles.IgnoreQueryFilters().AsNoTracking() on ur.RoleId equals role.Id
            join user in dbContext.Users.IgnoreQueryFilters().AsNoTracking() on ur.UserId equals user.Id
            where AdminRoleNames.Contains(role.Name.ToLower())
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

        return users
            .Where(x => x.TenantId != Guid.Empty)
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
            .ToArray();
    }

    private static string DeriveLevel(string outcome, string action)
    {
        var normalizedOutcome = (outcome ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedOutcome is "failure" or "error")
        {
            return "error";
        }

        if (normalizedOutcome is "blocked" or "denied")
        {
            return "warning";
        }

        var normalizedAction = (action ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedAction.Contains("delete") || normalizedAction.Contains("revoke"))
        {
            return "warning";
        }

        return "info";
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

public sealed record InternalEmployerUserResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string Email,
    IReadOnlyCollection<string> Roles,
    DateTime CreatedAtUtc);

public sealed record InternalAdminUserResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string Email,
    IReadOnlyCollection<string> Roles,
    DateTime CreatedAtUtc);

public sealed record InternalSystemLogResponse(
    Guid Id,
    string Level,
    string Source,
    string Message,
    string MetadataJson,
    DateTime CreatedAtUtc);

public sealed record InternalSystemHealthResponse(
    string Status,
    DateTime CheckedAtUtc,
    IReadOnlyCollection<InternalSystemHealthCheckResponse> Checks);

public sealed record InternalSystemHealthCheckResponse(
    string Name,
    string Status,
    string Latency,
    string Description);

public sealed record InternalAdminQuoteResponse(
    Guid Id,
    Guid TenantId,
    Guid UserId,
    string QuoteNumber,
    string ContactName,
    string ContactEmail,
    string ContactPhone,
    string ContactCompany,
    string ClientType,
    string ServiceType,
    string Complexity,
    decimal EstimatedPrice,
    decimal DiscountPercent,
    decimal FinalPrice,
    string Status,
    string Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpdateInternalAdminQuoteStatusRequest(string Status);

public sealed record InternalAdminQuoteConversionResponse(
    Guid QuoteId,
    string QuoteNumber,
    Guid InvoiceId,
    string InvoiceNumber,
    string InvoiceStatus,
    decimal InvoiceTotalAmount);
