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
    IConfiguration configuration,
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
        var totalQuotes = await dbContext.Quotes.IgnoreQueryFilters().CountAsync(cancellationToken);
        var pendingQuotes = await dbContext.Quotes.IgnoreQueryFilters().CountAsync(x => x.Status == "pending", cancellationToken);
        var totalInvoices = await dbContext.Invoices.IgnoreQueryFilters().CountAsync(cancellationToken);
        var totalRevenue = await dbContext.Invoices
            .IgnoreQueryFilters()
            .Where(x => x.Status == "paid" || x.Status == "sent")
            .SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;

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
            totalQuotes,
            pendingQuotes,
            totalInvoices,
            totalRevenue,
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

    [HttpGet("invoices")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InternalAdminInvoiceResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<InternalAdminInvoiceResponse>>>> GetInvoices(
        [FromQuery] int limit = 200,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 1000);
        var normalizedStatus = (status ?? string.Empty).Trim().ToLowerInvariant();
        var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        var query = (
            from invoice in dbContext.Invoices.IgnoreQueryFilters().AsNoTracking()
            join quote in dbContext.Quotes.IgnoreQueryFilters().AsNoTracking() on invoice.QuoteId equals quote.Id into quoteGroup
            from quote in quoteGroup.DefaultIfEmpty()
            select new { Invoice = invoice, Quote = quote }
        ).AsQueryable();

        if (tenantId.HasValue)
        {
            query = query.Where(x => x.Invoice.TenantId == tenantId.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedStatus) && normalizedStatus != "all")
        {
            query = query.Where(x => x.Invoice.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(x =>
                x.Invoice.InvoiceNumber.ToLower().Contains(normalizedSearch)
                || (x.Quote != null && (
                    x.Quote.QuoteNumber.ToLower().Contains(normalizedSearch)
                    || x.Quote.ContactName.ToLower().Contains(normalizedSearch)
                    || x.Quote.ContactEmail.ToLower().Contains(normalizedSearch)
                    || x.Quote.ContactCompany.ToLower().Contains(normalizedSearch)
                )));
        }

        var invoices = await query
            .OrderByDescending(x => x.Invoice.CreatedAtUtc)
            .Take(normalizedLimit)
            .ToListAsync(cancellationToken);

        var response = invoices
            .Select(x => new InternalAdminInvoiceResponse(
                x.Invoice.Id,
                x.Invoice.TenantId,
                x.Invoice.QuoteId,
                x.Invoice.UserId,
                x.Invoice.InvoiceNumber,
                x.Quote?.QuoteNumber ?? string.Empty,
                x.Quote?.ContactName ?? string.Empty,
                x.Quote?.ContactEmail ?? string.Empty,
                x.Quote?.ContactCompany ?? string.Empty,
                x.Invoice.Amount,
                x.Invoice.TaxPercent,
                x.Invoice.TaxAmount,
                x.Invoice.TotalAmount,
                x.Invoice.DueDateUtc,
                ResolveInvoiceStatus(x.Invoice.Status, x.Invoice.DueDateUtc, now),
                x.Invoice.CreatedAtUtc,
                x.Invoice.UpdatedAtUtc))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<InternalAdminInvoiceResponse>>(response, HttpContext.TraceIdentifier));
    }

    [HttpPut("invoices/{invoiceId:guid}/status")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminInvoiceResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminInvoiceResponse>>> UpdateInvoiceStatus(
        [FromRoute] Guid invoiceId,
        [FromBody] UpdateInternalAdminInvoiceStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedStatus = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedStatus is not ("draft" or "sent" or "paid" or "overdue" or "cancelled" or "failed"))
        {
            return BadRequest(new
            {
                code = "invalid_status",
                message = "Status must be one of: draft, sent, paid, overdue, cancelled, failed."
            });
        }

        var invoice = await dbContext.Invoices
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return NotFound();
        }

        invoice.SetStatus(normalizedStatus);
        await dbContext.SaveChangesAsync(cancellationToken);

        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == invoice.QuoteId, cancellationToken);

        dbContext.AuditTrails.Add(new Huminex.BuildingBlocks.Infrastructure.Persistence.Entities.AuditTrailEntity(
            invoice.TenantId,
            tenantProvider.UserId,
            tenantProvider.UserEmail,
            "internal_admin_invoice_status_updated",
            "invoice",
            invoice.Id.ToString(),
            "success",
            System.Text.Json.JsonSerializer.Serialize(new
            {
                invoice.InvoiceNumber,
                status = invoice.Status
            })));
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new InternalAdminInvoiceResponse(
            invoice.Id,
            invoice.TenantId,
            invoice.QuoteId,
            invoice.UserId,
            invoice.InvoiceNumber,
            quote?.QuoteNumber ?? string.Empty,
            quote?.ContactName ?? string.Empty,
            quote?.ContactEmail ?? string.Empty,
            quote?.ContactCompany ?? string.Empty,
            invoice.Amount,
            invoice.TaxPercent,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.DueDateUtc,
            invoice.Status,
            invoice.CreatedAtUtc,
            invoice.UpdatedAtUtc);

        return Ok(new ApiEnvelope<InternalAdminInvoiceResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("tenant-billing")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminTenantBillingResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminTenantBillingResponse>>> GetTenantBilling(
        [FromQuery] int limit = 200,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 1, 1000);
        var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var monthStartUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var employers = await BuildEmployerRows(cancellationToken);
        var invoiceRows = await dbContext.Invoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Select(x => new InternalBillingInvoiceSnapshot(
                x.TenantId,
                x.TotalAmount,
                x.Status,
                x.DueDateUtc,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var invoiceByTenant = invoiceRows
            .GroupBy(x => x.TenantId)
            .ToDictionary(group => group.Key, group => group.ToArray());

        var items = employers
            .Where(x =>
                string.IsNullOrWhiteSpace(normalizedSearch)
                || x.Name.ToLower().Contains(normalizedSearch)
                || x.Slug.ToLower().Contains(normalizedSearch)
                || x.ContactEmail.ToLower().Contains(normalizedSearch))
            .Select(x =>
            {
                var invoices = invoiceByTenant.TryGetValue(x.Id, out var rows) ? rows : Array.Empty<InternalBillingInvoiceSnapshot>();
                var totalInvoiced = invoices.Sum(i => i.TotalAmount);
                var totalPaid = invoices.Where(i => i.Status == "paid").Sum(i => i.TotalAmount);
                var overdueAmount = invoices
                    .Where(i => i.Status != "paid" && i.Status != "cancelled" && i.Status != "failed" && i.DueDateUtc < now)
                    .Sum(i => i.TotalAmount);
                var outstandingAmount = Math.Max(0m, totalInvoiced - totalPaid);
                var mrr = invoices
                    .Where(i => i.Status == "paid" && i.CreatedAtUtc >= monthStartUtc)
                    .Sum(i => i.TotalAmount);
                var nextDue = invoices
                    .Where(i => i.Status != "paid" && i.Status != "cancelled" && i.Status != "failed")
                    .OrderBy(i => i.DueDateUtc)
                    .Select(i => (DateTime?)i.DueDateUtc)
                    .FirstOrDefault();
                var billingStatus = overdueAmount > 0m
                    ? "past_due"
                    : invoices.Length == 0
                        ? "trial"
                        : "active";

                return new InternalAdminTenantBillingItemResponse(
                    x.Id,
                    x.Name,
                    DerivePlanName(x.EmployeeCount),
                    billingStatus,
                    mrr,
                    nextDue ?? now.Date.AddDays(30),
                    "invoice",
                    invoices.Length,
                    totalInvoiced,
                    totalPaid,
                    outstandingAmount,
                    overdueAmount);
            })
            .OrderByDescending(x => x.Mrr)
            .Take(normalizedLimit)
            .ToArray();

        var response = new InternalAdminTenantBillingResponse(
            items.Sum(x => x.Mrr),
            items.Sum(x => x.Mrr) * 12m,
            items.Count(x => x.Status == "active"),
            items.Count(x => x.Status == "trial"),
            items.Count(x => x.Status == "past_due"),
            items);

        return Ok(new ApiEnvelope<InternalAdminTenantBillingResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("revenue-analytics")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminRevenueAnalyticsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminRevenueAnalyticsResponse>>> GetRevenueAnalytics(
        [FromQuery] int months = 12,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedMonths = Math.Clamp(months, 3, 36);
        var now = DateTime.UtcNow;
        var firstMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(normalizedMonths - 1));

        var invoices = await dbContext.Invoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= firstMonth)
            .Select(x => new
            {
                x.TenantId,
                x.TotalAmount,
                x.Status,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var points = new List<InternalAdminRevenuePointResponse>(normalizedMonths);
        var runningMrr = 0m;

        for (var index = 0; index < normalizedMonths; index++)
        {
            var monthStart = firstMonth.AddMonths(index);
            var monthEnd = monthStart.AddMonths(1);
            var monthRows = invoices.Where(x => x.CreatedAtUtc >= monthStart && x.CreatedAtUtc < monthEnd).ToArray();
            var newRevenue = monthRows.Where(x => x.Status == "paid" || x.Status == "sent").Sum(x => x.TotalAmount);
            var churned = monthRows.Where(x => x.Status == "cancelled" || x.Status == "failed").Sum(x => x.TotalAmount);

            runningMrr = Math.Max(0m, runningMrr + newRevenue - churned);
            var arr = runningMrr * 12m;

            points.Add(new InternalAdminRevenuePointResponse(
                monthStart.ToString("yyyy-MM"),
                runningMrr,
                arr,
                newRevenue,
                churned));
        }

        var current = points.LastOrDefault();
        var previous = points.Count > 1 ? points[^2] : null;
        var mrrGrowth = previous is null || previous.Mrr <= 0m
            ? 0m
            : Math.Round(((current?.Mrr ?? 0m) - previous.Mrr) * 100m / previous.Mrr, 2, MidpointRounding.AwayFromZero);

        var totalPaidRevenue = invoices.Where(x => x.Status == "paid").Sum(x => x.TotalAmount);
        var distinctPaidTenants = invoices.Where(x => x.Status == "paid").Select(x => x.TenantId).Distinct().Count();
        var arpu = distinctPaidTenants > 0
            ? Math.Round(totalPaidRevenue / distinctPaidTenants, 2, MidpointRounding.AwayFromZero)
            : 0m;
        var currentChurn = current?.Churned ?? 0m;
        var churnRate = (current?.Mrr ?? 0m) <= 0m
            ? 0m
            : Math.Round(currentChurn * 100m / (current?.Mrr ?? 1m), 2, MidpointRounding.AwayFromZero);
        var netMrrChange = (current?.NewMrr ?? 0m) - (current?.Churned ?? 0m);
        var nrr = (current?.Mrr ?? 0m) <= 0m
            ? 100m
            : Math.Round(Math.Max(0m, ((current?.Mrr ?? 0m) + netMrrChange) * 100m / (current?.Mrr ?? 1m)), 2, MidpointRounding.AwayFromZero);

        var employers = await BuildEmployerRows(cancellationToken);
        var planDist = employers
            .GroupBy(x => DerivePlanName(x.EmployeeCount))
            .Select(group => new InternalAdminPlanDistributionResponse(
                group.Key,
                group.Count(),
                group.Count() * 100m / Math.Max(1, employers.Length)))
            .OrderByDescending(x => x.Count)
            .ToArray();

        var response = new InternalAdminRevenueAnalyticsResponse(
            current?.Mrr ?? 0m,
            mrrGrowth,
            (current?.Mrr ?? 0m) * 12m,
            arpu,
            churnRate,
            nrr,
            points,
            planDist);

        return Ok(new ApiEnvelope<InternalAdminRevenueAnalyticsResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("ai-dashboard")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminAiDashboardResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminAiDashboardResponse>>> GetAiDashboard(
        [FromQuery] int limit = 300,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 50, 2000);
        var sinceUtc = DateTime.UtcNow.AddDays(-30);

        var raw = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.OccurredAtUtc >= sinceUtc)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(normalizedLimit)
            .Select(x => new
            {
                x.Id,
                x.Action,
                x.ResourceType,
                x.ResourceId,
                x.ActorEmail,
                x.Outcome,
                x.MetadataJson,
                x.OccurredAtUtc
            })
            .ToListAsync(cancellationToken);

        var aiRows = raw
            .Where(x =>
                x.Action.Contains("ai", StringComparison.OrdinalIgnoreCase)
                || x.Action.Contains("openhuman", StringComparison.OrdinalIgnoreCase)
                || x.Action.Contains("interview", StringComparison.OrdinalIgnoreCase)
                || x.ResourceType.Contains("ai", StringComparison.OrdinalIgnoreCase)
                || x.ResourceType.Contains("openhuman", StringComparison.OrdinalIgnoreCase)
                || x.ResourceType.Contains("interview", StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var totalQueries = aiRows.Length;
        var successfulQueries = aiRows.Count(x => string.Equals(x.Outcome, "success", StringComparison.OrdinalIgnoreCase));
        var failedQueries = aiRows.Count(x =>
            string.Equals(x.Outcome, "failure", StringComparison.OrdinalIgnoreCase)
            || string.Equals(x.Outcome, "error", StringComparison.OrdinalIgnoreCase));
        var latenciesMs = aiRows
            .Select(x => TryGetLatencyMs(x.MetadataJson))
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .ToArray();
        var avgResponseMs = latenciesMs.Length == 0
            ? 0d
            : latenciesMs.Average();

        var workflowSummary = aiRows
            .GroupBy(x => x.Action)
            .Select(group =>
            {
                var runs = group.Count();
                var success = group.Count(item => string.Equals(item.Outcome, "success", StringComparison.OrdinalIgnoreCase));
                var successRate = runs == 0 ? 0m : Math.Round(success * 100m / runs, 2, MidpointRounding.AwayFromZero);
                var lastRun = group.Max(item => item.OccurredAtUtc);
                var status = lastRun >= DateTime.UtcNow.AddDays(-14) ? "active" : "paused";
                return new InternalAdminAiWorkflowResponse(
                    group.Key,
                    DeriveWorkflowName(group.Key),
                    runs,
                    successRate,
                    status,
                    lastRun);
            })
            .OrderByDescending(x => x.TotalRuns)
            .Take(8)
            .ToArray();

        var recentActivity = aiRows
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(25)
            .Select(x => new InternalAdminAiActivityResponse(
                x.Id,
                x.Action,
                x.ActorEmail,
                $"{x.Action} on {x.ResourceType}:{x.ResourceId}",
                NormalizeExecutionStatus(x.Outcome),
                TryGetLatencyMs(x.MetadataJson),
                x.OccurredAtUtc))
            .ToArray();

        var response = new InternalAdminAiDashboardResponse(
            totalQueries,
            successfulQueries,
            failedQueries,
            Math.Round(avgResponseMs / 1000d, 2, MidpointRounding.AwayFromZero),
            workflowSummary.Count(x => x.Status == "active"),
            Math.Round(successfulQueries * 1.75m, 2, MidpointRounding.AwayFromZero),
            workflowSummary,
            recentActivity);

        return Ok(new ApiEnvelope<InternalAdminAiDashboardResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("automation-logs")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminAutomationLogsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminAutomationLogsResponse>>> GetAutomationLogs(
        [FromQuery] int limit = 500,
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var normalizedLimit = Math.Clamp(limit, 100, 2000);
        var sinceUtc = DateTime.UtcNow.AddDays(-90);

        var raw = await dbContext.AuditTrails
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.OccurredAtUtc >= sinceUtc)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(normalizedLimit)
            .Select(x => new
            {
                x.Id,
                x.Action,
                x.ResourceType,
                x.ResourceId,
                x.ActorEmail,
                x.Outcome,
                x.MetadataJson,
                x.OccurredAtUtc
            })
            .ToListAsync(cancellationToken);

        var automationRows = raw
            .Where(x =>
                x.Action.Contains("automation", StringComparison.OrdinalIgnoreCase)
                || x.Action.Contains("workflow", StringComparison.OrdinalIgnoreCase)
                || x.Action.Contains("openhuman", StringComparison.OrdinalIgnoreCase)
                || x.ResourceType.Contains("automation", StringComparison.OrdinalIgnoreCase)
                || x.ResourceType.Contains("workflow", StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var workflows = automationRows
            .GroupBy(x => x.Action)
            .Select(group =>
            {
                var runs = group.Count();
                var success = group.Count(item => string.Equals(item.Outcome, "success", StringComparison.OrdinalIgnoreCase));
                var successRate = runs == 0 ? 0m : Math.Round(success * 100m / runs, 2, MidpointRounding.AwayFromZero);
                var lastRun = group.Max(item => item.OccurredAtUtc);
                var status = lastRun >= DateTime.UtcNow.AddDays(-14) ? "active" : "paused";
                var avgDurationMs = group
                    .Select(item => TryGetLatencyMs(item.MetadataJson))
                    .Where(item => item.HasValue)
                    .Select(item => item!.Value)
                    .DefaultIfEmpty(0d)
                    .Average();

                return new InternalAdminAutomationWorkflowResponse(
                    group.Key,
                    DeriveWorkflowName(group.Key),
                    group.Select(item => item.ResourceType).FirstOrDefault() ?? "event",
                    status,
                    runs,
                    successRate,
                    Math.Round(avgDurationMs, 1, MidpointRounding.AwayFromZero),
                    lastRun);
            })
            .OrderByDescending(x => x.TotalRuns)
            .Take(25)
            .ToArray();

        var executions = automationRows
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(150)
            .Select(x => new InternalAdminAutomationExecutionResponse(
                x.Id,
                x.Action,
                DeriveWorkflowName(x.Action),
                NormalizeExecutionStatus(x.Outcome),
                x.ActorEmail,
                x.ResourceType,
                x.ResourceId,
                TryGetLatencyMs(x.MetadataJson),
                x.OccurredAtUtc))
            .ToArray();

        var scheduledJobs = workflows
            .Take(10)
            .Select((workflow, index) => new InternalAdminScheduledJobResponse(
                workflow.Id,
                workflow.Name,
                "derived_activity_schedule",
                DateTime.UtcNow.AddMinutes((index + 1) * 20),
                workflow.Status == "active" ? "scheduled" : "paused"))
            .ToArray();

        var response = new InternalAdminAutomationLogsResponse(
            workflows.Count(x => x.Status == "active"),
            executions.Length,
            executions.Count(x => x.Status == "success"),
            executions.Count(x => x.Status is "failed" or "error"),
            workflows,
            executions,
            scheduledJobs);

        return Ok(new ApiEnvelope<InternalAdminAutomationLogsResponse>(response, HttpContext.TraceIdentifier));
    }

    [HttpGet("feature-flags")]
    [ProducesResponseType(typeof(ApiEnvelope<InternalAdminFeatureFlagsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiEnvelope<InternalAdminFeatureFlagsResponse>>> GetFeatureFlags(
        CancellationToken cancellationToken = default)
    {
        if (!IsInternalAdmin())
        {
            return Forbid();
        }

        var featureSection = configuration.GetSection("FeatureManagement");
        var featureFlags = featureSection
            .GetChildren()
            .Select(section =>
            {
                var enabled = TryReadBool(section.Value);
                var status = enabled ? "enabled" : "disabled";
                return new InternalAdminFeatureFlagResponse(
                    section.Path,
                    section.Key,
                    section.Key.Replace('_', ' '),
                    "configuration",
                    status,
                    enabled ? 100 : 0,
                    DateTime.UtcNow,
                    "all");
            })
            .ToArray();

        var quoteStatuses = await dbContext.Quotes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var invoiceStatuses = await dbContext.Invoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var quoteVisitors = quoteStatuses.Sum(x => x.Count);
        var quoteWinner = quoteStatuses.OrderByDescending(x => x.Count).Select(x => x.Status).FirstOrDefault() ?? "n/a";
        var invoiceVisitors = invoiceStatuses.Sum(x => x.Count);
        var invoiceWinner = invoiceStatuses.OrderByDescending(x => x.Count).Select(x => x.Status).FirstOrDefault() ?? "n/a";

        var abTests = new[]
        {
            new InternalAdminAbTestResponse(
                "quote_status_distribution",
                "Quote Status Distribution",
                quoteVisitors > 0 ? "running" : "completed",
                quoteStatuses.Select(x => new InternalAdminAbTestVariantResponse(x.Status, x.Count)).ToArray(),
                quoteVisitors,
                quoteWinner),
            new InternalAdminAbTestResponse(
                "invoice_status_distribution",
                "Invoice Status Distribution",
                invoiceVisitors > 0 ? "running" : "completed",
                invoiceStatuses.Select(x => new InternalAdminAbTestVariantResponse(x.Status, x.Count)).ToArray(),
                invoiceVisitors,
                invoiceWinner),
        };

        var response = new InternalAdminFeatureFlagsResponse(
            featureFlags.Length,
            featureFlags.Count(x => x.Status == "enabled"),
            featureFlags.Count(x => x.Status == "partial"),
            featureFlags,
            abTests);

        return Ok(new ApiEnvelope<InternalAdminFeatureFlagsResponse>(response, HttpContext.TraceIdentifier));
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
        var azureOptions = internalAdminOptions.Value.Azure ?? new AzureResourceInventoryOptions();
        var inventory = BuildInventory(azureOptions);
        var healthByName = report.Entries
            .ToDictionary(
                entry => entry.Key.Trim().ToLowerInvariant(),
                entry => entry.Value,
                StringComparer.OrdinalIgnoreCase);

        var checks = new List<InternalSystemHealthCheckResponse>(inventory.Count + 2);
        foreach (var item in inventory)
        {
            var key = item.HealthCheckName.Trim().ToLowerInvariant();
            if (healthByName.TryGetValue(key, out var entry))
            {
                checks.Add(new InternalSystemHealthCheckResponse(
                    item.DisplayName,
                    entry.Status.ToString().ToLowerInvariant(),
                    $"{entry.Duration.TotalMilliseconds:0}ms",
                    entry.Description ?? item.Description,
                    item.Category,
                    item.PortalUrl,
                    item.ResourceType,
                    item.ResourceName));
                continue;
            }

            checks.Add(new InternalSystemHealthCheckResponse(
                item.DisplayName,
                "unknown",
                "n/a",
                item.Description,
                item.Category,
                item.PortalUrl,
                item.ResourceType,
                item.ResourceName));
        }

        // Expose current AKS runtime process context so internal admins can quickly identify the active pod.
        var podName = Environment.GetEnvironmentVariable("POD_NAME")
            ?? Environment.GetEnvironmentVariable("HOSTNAME")
            ?? "unknown";
        var nodeName = Environment.GetEnvironmentVariable("AKS_NODE_NAME")
            ?? Environment.GetEnvironmentVariable("NODE_NAME")
            ?? "unknown";
        checks.Add(new InternalSystemHealthCheckResponse(
            "AKS Runtime Pod",
            string.Equals(podName, "unknown", StringComparison.OrdinalIgnoreCase) ? "unknown" : "healthy",
            "n/a",
            $"Current API pod: {podName}; node: {nodeName}",
            "aks",
            BuildAksPodsPortalUrl(azureOptions),
            "pod",
            podName));
        checks.Add(new InternalSystemHealthCheckResponse(
            "AKS Runtime Namespace",
            "healthy",
            "n/a",
            $"Namespace: {azureOptions.AksNamespace}",
            "aks",
            BuildAksNamespacePortalUrl(azureOptions),
            "namespace",
            azureOptions.AksNamespace));

        var sortedChecks = checks
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToArray();

        var response = new InternalSystemHealthResponse(
            report.Status.ToString().ToLowerInvariant(),
            DateTime.UtcNow,
            sortedChecks);

        return Ok(new ApiEnvelope<InternalSystemHealthResponse>(response, HttpContext.TraceIdentifier));
    }

    private List<AzureResourceInventoryItem> BuildInventory(AzureResourceInventoryOptions azure)
    {
        return
        [
            new AzureResourceInventoryItem("self", "API Service", "core", "app", "huminex-api", configuration["InternalAdmin:Azure:ApiPublicUrl"] ?? "https://api.gethuminex.com", "API process readiness check"),
            new AzureResourceInventoryItem("postgres", "Azure PostgreSQL", "data", "postgresqlFlexibleServer", azure.PostgresServerName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.DBforPostgreSQL/flexibleServers", azure.PostgresServerName), "Primary transactional database"),
            new AzureResourceInventoryItem("redis", "Azure Cache for Redis", "cache", "redis", azure.RedisName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.Cache/redis", azure.RedisName), "Distributed cache and token/session acceleration"),
            new AzureResourceInventoryItem("servicebus", "Azure Service Bus", "messaging", "serviceBusNamespace", azure.ServiceBusNamespace, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.ServiceBus/namespaces", azure.ServiceBusNamespace), "Event bus and async workflows"),
            new AzureResourceInventoryItem("blobstorage", "Azure Blob Storage", "storage", "storageAccount", azure.StorageAccountName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.Storage/storageAccounts", azure.StorageAccountName), "Documents and artifacts storage"),
            new AzureResourceInventoryItem("aks-cluster", "AKS Cluster", "aks", "managedCluster", azure.AksClusterName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.ContainerService/managedClusters", azure.AksClusterName), "Kubernetes control plane"),
            new AzureResourceInventoryItem("acr", "Azure Container Registry", "containers", "containerRegistry", azure.AcrName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.ContainerRegistry/registries", azure.AcrName), "Container images"),
            new AzureResourceInventoryItem("keyvault", "Azure Key Vault", "security", "vault", azure.KeyVaultName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.KeyVault/vaults", azure.KeyVaultName), "Secrets and certificates"),
            new AzureResourceInventoryItem("appinsights", "Application Insights", "observability", "applicationInsights", azure.ApplicationInsightsName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.Insights/components", azure.ApplicationInsightsName), "APM, traces, and failures"),
            new AzureResourceInventoryItem("loganalytics", "Log Analytics Workspace", "observability", "logAnalyticsWorkspace", azure.LogAnalyticsWorkspaceName, BuildPortalResourceUrl(azure.SubscriptionId, azure.ResourceGroup, "Microsoft.OperationalInsights/workspaces", azure.LogAnalyticsWorkspaceName), "Central log query workspace")
        ];
    }

    private static string BuildPortalResourceUrl(string subscriptionId, string resourceGroup, string resourceType, string resourceName)
    {
        if (string.IsNullOrWhiteSpace(subscriptionId) || string.IsNullOrWhiteSpace(resourceGroup) || string.IsNullOrWhiteSpace(resourceName))
        {
            return "https://portal.azure.com";
        }

        var encodedType = string.Join("/", resourceType.Trim('/').Split('/').Select(Uri.EscapeDataString));
        var encodedName = Uri.EscapeDataString(resourceName);
        return $"https://portal.azure.com/#@/resource/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/{encodedType}/{encodedName}/overview";
    }

    private static string BuildAksPodsPortalUrl(AzureResourceInventoryOptions azure)
    {
        if (string.IsNullOrWhiteSpace(azure.SubscriptionId))
        {
            return "https://portal.azure.com";
        }

        var clusterResourcePath = $"subscriptions/{azure.SubscriptionId}/resourceGroups/{azure.ResourceGroup}/providers/Microsoft.ContainerService/managedClusters/{azure.AksClusterName}";
        return $"https://portal.azure.com/#blade/Microsoft_Azure_ContainerService/ManagedClusterPodsBlade/selectedResourceId/{Uri.EscapeDataString(clusterResourcePath)}/namespace/{Uri.EscapeDataString(azure.AksNamespace)}";
    }

    private static string BuildAksNamespacePortalUrl(AzureResourceInventoryOptions azure)
    {
        return BuildAksPodsPortalUrl(azure);
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

    private static double? TryGetLatencyMs(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return null;
        }

        try
        {
            using var document = System.Text.Json.JsonDocument.Parse(metadataJson);
            var root = document.RootElement;
            if (TryReadDouble(root, "latencyMs", out var latency))
            {
                return latency;
            }

            if (TryReadDouble(root, "responseTimeMs", out var responseTime))
            {
                return responseTime;
            }

            if (TryReadDouble(root, "durationMs", out var duration))
            {
                return duration;
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static bool TryReadDouble(System.Text.Json.JsonElement element, string property, out double value)
    {
        value = 0d;
        if (!element.TryGetProperty(property, out var propertyValue))
        {
            return false;
        }

        if (propertyValue.ValueKind == System.Text.Json.JsonValueKind.Number && propertyValue.TryGetDouble(out var number))
        {
            value = number;
            return true;
        }

        if (propertyValue.ValueKind == System.Text.Json.JsonValueKind.String
            && double.TryParse(propertyValue.GetString(), out var parsed))
        {
            value = parsed;
            return true;
        }

        return false;
    }

    private static string DeriveWorkflowName(string action)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            return "Unnamed Workflow";
        }

        var cleaned = action.Trim().Replace('_', ' ').Replace('-', ' ');
        return string.Join(' ',
            cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(token => token.Length == 0
                    ? token
                    : $"{char.ToUpperInvariant(token[0])}{token[1..].ToLowerInvariant()}"));
    }

    private static string NormalizeExecutionStatus(string outcome)
    {
        var normalized = (outcome ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "success" => "success",
            "failure" => "failed",
            "error" => "error",
            "blocked" => "failed",
            _ => string.IsNullOrWhiteSpace(normalized) ? "unknown" : normalized,
        };
    }

    private static bool TryReadBool(string? raw)
    {
        if (bool.TryParse(raw, out var parsed))
        {
            return parsed;
        }

        return string.Equals(raw, "1", StringComparison.OrdinalIgnoreCase)
            || string.Equals(raw, "on", StringComparison.OrdinalIgnoreCase)
            || string.Equals(raw, "yes", StringComparison.OrdinalIgnoreCase);
    }

    private static string ResolveInvoiceStatus(string status, DateTime dueDateUtc, DateTime nowUtc)
    {
        if (string.Equals(status, "paid", StringComparison.OrdinalIgnoreCase))
        {
            return "paid";
        }

        if (string.Equals(status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return "cancelled";
        }

        if (string.Equals(status, "failed", StringComparison.OrdinalIgnoreCase))
        {
            return "failed";
        }

        if (dueDateUtc < nowUtc)
        {
            return "overdue";
        }

        return string.IsNullOrWhiteSpace(status) ? "draft" : status.Trim().ToLowerInvariant();
    }

    private static string DerivePlanName(int employeeCount)
    {
        if (employeeCount >= 300)
        {
            return "enterprise";
        }

        if (employeeCount >= 50)
        {
            return "growth";
        }

        return "startup";
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
    int TotalQuotes,
    int PendingQuotes,
    int TotalInvoices,
    decimal TotalRevenue,
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
    string Description,
    string Category,
    string PortalUrl,
    string ResourceType,
    string ResourceName);

public sealed record AzureResourceInventoryItem(
    string HealthCheckName,
    string DisplayName,
    string Category,
    string ResourceType,
    string ResourceName,
    string PortalUrl,
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

public sealed record InternalAdminInvoiceResponse(
    Guid Id,
    Guid TenantId,
    Guid QuoteId,
    Guid UserId,
    string InvoiceNumber,
    string QuoteNumber,
    string ContactName,
    string ContactEmail,
    string ContactCompany,
    decimal Amount,
    decimal TaxPercent,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime DueDateUtc,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpdateInternalAdminInvoiceStatusRequest(string Status);

public sealed record InternalAdminTenantBillingResponse(
    decimal TotalMrr,
    decimal TotalArr,
    int ActiveSubscriptions,
    int TrialAccounts,
    int PastDueAccounts,
    IReadOnlyCollection<InternalAdminTenantBillingItemResponse> Items);

public sealed record InternalAdminTenantBillingItemResponse(
    Guid TenantId,
    string TenantName,
    string Plan,
    string Status,
    decimal Mrr,
    DateTime NextBillingAtUtc,
    string PaymentMethod,
    int InvoiceCount,
    decimal TotalInvoiced,
    decimal TotalPaid,
    decimal OutstandingAmount,
    decimal OverdueAmount);

public sealed record InternalAdminRevenueAnalyticsResponse(
    decimal CurrentMrr,
    decimal MrrGrowthPercent,
    decimal CurrentArr,
    decimal Arpu,
    decimal ChurnRatePercent,
    decimal NetRevenueRetentionPercent,
    IReadOnlyCollection<InternalAdminRevenuePointResponse> Timeline,
    IReadOnlyCollection<InternalAdminPlanDistributionResponse> PlanDistribution);

public sealed record InternalAdminRevenuePointResponse(
    string Month,
    decimal Mrr,
    decimal Arr,
    decimal NewMrr,
    decimal Churned);

public sealed record InternalAdminPlanDistributionResponse(
    string Plan,
    int Count,
    decimal Percent);

public sealed record InternalBillingInvoiceSnapshot(
    Guid TenantId,
    decimal TotalAmount,
    string Status,
    DateTime DueDateUtc,
    DateTime CreatedAtUtc);

public sealed record InternalAdminAiDashboardResponse(
    int TotalQueries,
    int SuccessfulQueries,
    int FailedQueries,
    double AvgResponseTimeSeconds,
    int ActiveWorkflows,
    decimal EstimatedCostSavings,
    IReadOnlyCollection<InternalAdminAiWorkflowResponse> Workflows,
    IReadOnlyCollection<InternalAdminAiActivityResponse> RecentActivity);

public sealed record InternalAdminAiWorkflowResponse(
    string Id,
    string Name,
    int TotalRuns,
    decimal SuccessRatePercent,
    string Status,
    DateTime LastRunAtUtc);

public sealed record InternalAdminAiActivityResponse(
    Guid Id,
    string Kind,
    string ActorEmail,
    string Message,
    string Status,
    double? LatencyMs,
    DateTime OccurredAtUtc);

public sealed record InternalAdminAutomationLogsResponse(
    int ActiveWorkflows,
    int TotalExecutions,
    int SuccessfulExecutions,
    int FailedExecutions,
    IReadOnlyCollection<InternalAdminAutomationWorkflowResponse> Workflows,
    IReadOnlyCollection<InternalAdminAutomationExecutionResponse> Executions,
    IReadOnlyCollection<InternalAdminScheduledJobResponse> ScheduledJobs);

public sealed record InternalAdminAutomationWorkflowResponse(
    string Id,
    string Name,
    string Trigger,
    string Status,
    int TotalRuns,
    decimal SuccessRatePercent,
    double AvgDurationMs,
    DateTime LastRunAtUtc);

public sealed record InternalAdminAutomationExecutionResponse(
    Guid Id,
    string WorkflowId,
    string WorkflowName,
    string Status,
    string TriggeredBy,
    string ResourceType,
    string ResourceId,
    double? DurationMs,
    DateTime StartedAtUtc);

public sealed record InternalAdminScheduledJobResponse(
    string Id,
    string Name,
    string Schedule,
    DateTime NextRunAtUtc,
    string Status);

public sealed record InternalAdminFeatureFlagsResponse(
    int TotalFlags,
    int EnabledFlags,
    int PartialFlags,
    IReadOnlyCollection<InternalAdminFeatureFlagResponse> Flags,
    IReadOnlyCollection<InternalAdminAbTestResponse> AbTests);

public sealed record InternalAdminFeatureFlagResponse(
    string Id,
    string Key,
    string Name,
    string Type,
    string Status,
    int RolloutPercent,
    DateTime UpdatedAtUtc,
    string TargetingType);

public sealed record InternalAdminAbTestResponse(
    string Id,
    string Name,
    string Status,
    IReadOnlyCollection<InternalAdminAbTestVariantResponse> Variants,
    int Visitors,
    string Winner);

public sealed record InternalAdminAbTestVariantResponse(
    string Name,
    int Conversions);
