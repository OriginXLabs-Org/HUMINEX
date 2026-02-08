using Huminex.SharedKernel.Pagination;

namespace Huminex.ModuleContracts.Organization;

public sealed record OrgNodeDto(Guid EmployeeId, string Name, string Role, Guid? ManagerId);
public sealed record EmployeeDto(
    Guid EmployeeId,
    string EmployeeCode,
    string Name,
    string Email,
    string Role,
    string Department,
    Guid? ManagerEmployeeId,
    bool IsPortalAccessEnabled,
    IReadOnlyCollection<string> AllowedWidgets);
public sealed record UpdateEmployeeRoleRequest(string Role);
public sealed record ManagerChainDto(Guid EmployeeId, IReadOnlyCollection<EmployeeDto> Chain);
public sealed record DirectReportsDto(Guid ManagerId, IReadOnlyCollection<EmployeeDto> Reports);
public sealed record EmployeesPagedResponse(PagedResponse<EmployeeDto> Page);
