using Asp.Versioning;
using Huminex.Api.Configuration;
using Huminex.Api.Idempotency;
using Huminex.Api.Services;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.Payroll;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Payroll processing and payslip APIs.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/payroll")]
public sealed class PayrollController(
    IPayrollRepository payrollRepository,
    IAuditTrailRepository auditTrailRepository,
    ITenantProvider tenantProvider,
    IPayrollDocumentStorage payrollDocumentStorage,
    IBusinessEventPublisher eventPublisher) : ControllerBase
{
    /// <summary>
    /// Lists payroll runs for the current tenant ordered by period descending.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Payroll run collection.</returns>
    [HttpGet("runs")]
    [Authorize(Policy = PermissionPolicies.PayrollRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<PayrollRunDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<PayrollRunDto>>>> GetRuns(CancellationToken cancellationToken)
    {
        var runs = await payrollRepository.GetRunsAsync(cancellationToken);
        await auditTrailRepository.AddAsync("read_runs", "payroll_run", "bulk", "success", new { count = runs.Count }, cancellationToken);
        return Ok(new ApiEnvelope<IReadOnlyCollection<PayrollRunDto>>(runs.Select(ToDto).ToArray(), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Creates a new payroll run for a specific yyyy-MM period.
    /// </summary>
    /// <param name="request">Run creation payload.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Created payroll run.</returns>
    [HttpPost("runs")]
    [RequireIdempotency]
    [Authorize(Policy = PermissionPolicies.PayrollWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<PayrollRunDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiEnvelope<PayrollRunDto>>> CreateRun([FromBody] CreatePayrollRunRequest request, CancellationToken cancellationToken)
    {
        if (!PayrollPeriodParser.TryParse(request.Period, out var year, out var month))
        {
            return BadRequest(new { code = "invalid_period", message = "Period must be yyyy-MM" });
        }

        var run = await payrollRepository.CreateRunAsync(year, month, cancellationToken);
        await auditTrailRepository.AddAsync("create_run", "payroll_run", run.Id.ToString(), "success", new { period = request.Period }, cancellationToken);
        await eventPublisher.PublishAsync("PayrollRunCreated", new
        {
            tenantId = tenantProvider.TenantId,
            runId = run.Id,
            period = run.Period,
            requestedBy = tenantProvider.UserEmail
        }, cancellationToken);
        return CreatedAtAction(nameof(GetRuns), new ApiEnvelope<PayrollRunDto>(ToDto(run), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Approves a payroll run.
    /// </summary>
    /// <param name="runId">Payroll run identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Run action status payload.</returns>
    [HttpPost("runs/{runId:guid}/approve")]
    [RequireIdempotency]
    [Authorize(Policy = PermissionPolicies.PayrollWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<PayrollActionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<PayrollActionResponse>>> ApproveRun(Guid runId, CancellationToken cancellationToken)
    {
        var run = await payrollRepository.ApproveRunAsync(runId, cancellationToken);
        if (run is null)
        {
            await auditTrailRepository.AddAsync("approve_run", "payroll_run", runId.ToString(), "not_found", new { }, cancellationToken);
            return NotFound();
        }

        await auditTrailRepository.AddAsync("approve_run", "payroll_run", runId.ToString(), "success", new { status = run.Status }, cancellationToken);
        await eventPublisher.PublishAsync("PayrollRunApproved", new
        {
            tenantId = tenantProvider.TenantId,
            runId,
            status = run.Status,
            approvedBy = tenantProvider.UserEmail
        }, cancellationToken);
        return Ok(new ApiEnvelope<PayrollActionResponse>(new PayrollActionResponse(runId, "approve", run.Status), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Marks a payroll run as disbursed.
    /// </summary>
    /// <param name="runId">Payroll run identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Run action status payload.</returns>
    [HttpPost("runs/{runId:guid}/disburse")]
    [RequireIdempotency]
    [Authorize(Policy = PermissionPolicies.PayrollWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<PayrollActionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<PayrollActionResponse>>> DisburseRun(Guid runId, CancellationToken cancellationToken)
    {
        var run = await payrollRepository.DisburseRunAsync(runId, cancellationToken);
        if (run is null)
        {
            await auditTrailRepository.AddAsync("disburse_run", "payroll_run", runId.ToString(), "not_found", new { }, cancellationToken);
            return NotFound();
        }

        await auditTrailRepository.AddAsync("disburse_run", "payroll_run", runId.ToString(), "success", new { status = run.Status }, cancellationToken);
        await eventPublisher.PublishAsync("PayrollRunDisbursed", new
        {
            tenantId = tenantProvider.TenantId,
            runId,
            status = run.Status,
            disbursedBy = tenantProvider.UserEmail
        }, cancellationToken);
        return Ok(new ApiEnvelope<PayrollActionResponse>(new PayrollActionResponse(runId, "disburse", run.Status), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Lists all payslips for an employee.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Payslip list ordered by period descending.</returns>
    [HttpGet("employees/{employeeId:guid}/payslips")]
    [Authorize(Policy = PermissionPolicies.PayrollRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<PayslipDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<PayslipDto>>>> GetPayslips(Guid employeeId, CancellationToken cancellationToken)
    {
        var data = await payrollRepository.GetPayslipsByEmployeeAsync(employeeId, cancellationToken);
        await auditTrailRepository.AddAsync("read_payslips", "payslip", employeeId.ToString(), "success", new { count = data.Count }, cancellationToken);
        return Ok(new ApiEnvelope<IReadOnlyCollection<PayslipDto>>(data.Select(ToDto).ToArray(), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns a single payslip for an employee and yyyy-MM period.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="period">Period in yyyy-MM format.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Payslip for the requested period.</returns>
    [HttpGet("employees/{employeeId:guid}/payslips/{period}")]
    [Authorize(Policy = PermissionPolicies.PayrollRead)]
    [ProducesResponseType(typeof(ApiEnvelope<PayslipDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<PayslipDto>>> GetPayslipByPeriod(Guid employeeId, string period, CancellationToken cancellationToken)
    {
        if (!PayrollPeriodParser.TryParse(period, out var year, out var month))
        {
            return NotFound();
        }

        var payslip = await payrollRepository.GetPayslipByEmployeePeriodAsync(employeeId, year, month, cancellationToken);
        if (payslip is null)
        {
            await auditTrailRepository.AddAsync("read_payslip_period", "payslip", $"{employeeId}:{period}", "not_found", new { }, cancellationToken);
            return NotFound();
        }

        await auditTrailRepository.AddAsync("read_payslip_period", "payslip", $"{employeeId}:{period}", "success", new { }, cancellationToken);
        return Ok(new ApiEnvelope<PayslipDto>(ToDto(payslip), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Queues email delivery for an employee payslip for a specific period.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="period">Period in yyyy-MM format.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Email dispatch state payload.</returns>
    [HttpPost("employees/{employeeId:guid}/payslips/{period}/email")]
    [RequireIdempotency]
    [Authorize(Policy = PermissionPolicies.PayrollWrite)]
    [ProducesResponseType(typeof(ApiEnvelope<EmailPayslipResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<EmailPayslipResponse>>> EmailPayslip(Guid employeeId, string period, CancellationToken cancellationToken)
    {
        if (!PayrollPeriodParser.TryParse(period, out var year, out var month))
        {
            return NotFound();
        }

        var payslip = await payrollRepository.GetPayslipByEmployeePeriodAsync(employeeId, year, month, cancellationToken);
        if (payslip is null)
        {
            await auditTrailRepository.AddAsync("email_payslip", "payslip", $"{employeeId}:{period}", "not_found", new { }, cancellationToken);
            return NotFound(new
            {
                code = "payslip_not_found",
                message = $"No payslip found for employee '{employeeId}' and period '{period}' in current tenant scope."
            });
        }

        var blobName = await payrollDocumentStorage.EnsurePayslipDocumentAsync(tenantProvider.TenantId, employeeId, PayrollPeriodParser.ToPeriod(year, month), cancellationToken);
        await payrollRepository.AttachPayslipDocumentAsync(employeeId, year, month, blobName, cancellationToken);
        await payrollRepository.MarkPayslipEmailedAsync(employeeId, year, month, cancellationToken);
        await auditTrailRepository.AddAsync("email_payslip", "payslip", $"{employeeId}:{period}", "success", new { blobName }, cancellationToken);
        await eventPublisher.PublishAsync("PayslipEmailQueued", new
        {
            tenantId = tenantProvider.TenantId,
            employeeId,
            period = PayrollPeriodParser.ToPeriod(year, month),
            blobName,
            queuedBy = tenantProvider.UserEmail
        }, cancellationToken);
        var response = new EmailPayslipResponse(employeeId, PayrollPeriodParser.ToPeriod(year, month), "employee@gethuminex.com", "queued");
        return Ok(new ApiEnvelope<EmailPayslipResponse>(response, HttpContext.TraceIdentifier));
    }

    private static PayrollRunDto ToDto(PayrollRunEntity run) =>
        new(run.Id, run.Period, run.Status, run.EmployeesCount, run.GrossAmount, run.NetAmount);

    private static PayslipDto ToDto(PayslipEntity payslip) =>
        new(payslip.EmployeeId, payslip.Period, payslip.GrossAmount, payslip.DeductionsAmount, payslip.NetAmount, payslip.Status);
}
