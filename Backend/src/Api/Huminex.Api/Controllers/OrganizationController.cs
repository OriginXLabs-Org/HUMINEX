using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.ModuleContracts.Organization;
using Huminex.SharedKernel.Pagination;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// Organization hierarchy and employee directory APIs.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/org")]
public sealed class OrganizationController(IOrganizationRepository organizationRepository) : ControllerBase
{
    /// <summary>
    /// Returns hierarchy nodes for organization tree rendering.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Organization node collection with manager links.</returns>
    [HttpGet("structure")]
    [Authorize(Policy = PermissionPolicies.OrgRead)]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<OrgNodeDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyCollection<OrgNodeDto>>>> GetStructure(CancellationToken cancellationToken)
    {
        var employees = await organizationRepository.GetAllEmployeesAsync(cancellationToken);
        var data = employees
            .Select(employee => new OrgNodeDto(employee.Id, employee.Name, employee.Role, employee.ManagerEmployeeId))
            .ToArray();

        return Ok(new ApiEnvelope<IReadOnlyCollection<OrgNodeDto>>(data, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns paginated employees for the current tenant.
    /// </summary>
    /// <param name="page">Page number starting from 1.</param>
    /// <param name="pageSize">Items per page.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Paginated employee list.</returns>
    [HttpGet("employees")]
    [Authorize(Policy = PermissionPolicies.OrgRead)]
    [ProducesResponseType(typeof(ApiEnvelope<EmployeesPagedResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<EmployeesPagedResponse>>> GetEmployees([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var (employees, totalCount) = await organizationRepository.GetEmployeesPagedAsync(page, pageSize, cancellationToken);
        var items = employees.Select(ToDto).ToArray();

        var result = new EmployeesPagedResponse(new PagedResponse<EmployeeDto>(items, page, pageSize, totalCount));
        return Ok(new ApiEnvelope<EmployeesPagedResponse>(result, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns a single employee by identifier inside tenant scope.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Employee details when found.</returns>
    [HttpGet("employees/{employeeId:guid}")]
    [Authorize(Policy = PermissionPolicies.OrgRead)]
    [ProducesResponseType(typeof(ApiEnvelope<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiEnvelope<EmployeeDto>>> GetEmployeeById(Guid employeeId, CancellationToken cancellationToken)
    {
        var employee = await organizationRepository.GetEmployeeByIdAsync(employeeId, cancellationToken);
        if (employee is null)
        {
            return NotFound();
        }

        return Ok(new ApiEnvelope<EmployeeDto>(ToDto(employee), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns manager chain from direct manager to top-level manager.
    /// </summary>
    /// <param name="employeeId">Employee identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Ordered manager chain.</returns>
    [HttpGet("employees/{employeeId:guid}/manager-chain")]
    [Authorize(Policy = PermissionPolicies.OrgRead)]
    [ProducesResponseType(typeof(ApiEnvelope<ManagerChainDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<ManagerChainDto>>> GetManagerChain(Guid employeeId, CancellationToken cancellationToken)
    {
        var chain = await organizationRepository.GetManagerChainAsync(employeeId, cancellationToken);
        return Ok(new ApiEnvelope<ManagerChainDto>(new ManagerChainDto(employeeId, chain.Select(ToDto).ToArray()), HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns direct reports for a manager.
    /// </summary>
    /// <param name="managerId">Manager employee identifier.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    /// <returns>Employees reporting to the manager.</returns>
    [HttpGet("managers/{managerId:guid}/direct-reports")]
    [Authorize(Policy = PermissionPolicies.OrgRead)]
    [ProducesResponseType(typeof(ApiEnvelope<DirectReportsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<DirectReportsDto>>> GetDirectReports(Guid managerId, CancellationToken cancellationToken)
    {
        var reports = await organizationRepository.GetDirectReportsAsync(managerId, cancellationToken);
        return Ok(new ApiEnvelope<DirectReportsDto>(new DirectReportsDto(managerId, reports.Select(ToDto).ToArray()), HttpContext.TraceIdentifier));
    }

    private static EmployeeDto ToDto(EmployeeEntity employee) =>
        new(employee.Id, employee.EmployeeCode, employee.Name, employee.Email, employee.Role, employee.Department);
}
