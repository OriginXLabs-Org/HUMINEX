namespace Huminex.ModuleContracts.Workforce;

public sealed record PortalAccessRequest(bool IsEnabled, IReadOnlyCollection<string> AllowedWidgets);
public sealed record PortalAccessResponse(Guid EmployeeId, bool IsEnabled, IReadOnlyCollection<string> AllowedWidgets);
