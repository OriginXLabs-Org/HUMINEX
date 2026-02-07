namespace Huminex.ModuleContracts.Payroll;

public sealed record PayrollRunDto(Guid RunId, string Period, string Status, int Employees, decimal Gross, decimal Net);
public sealed record CreatePayrollRunRequest(string Period);
public sealed record PayrollActionResponse(Guid RunId, string Action, string Status);
public sealed record PayslipDto(Guid EmployeeId, string Period, decimal Gross, decimal Deductions, decimal Net, string Status);
public sealed record EmailPayslipResponse(Guid EmployeeId, string Period, string Email, string DispatchStatus);
