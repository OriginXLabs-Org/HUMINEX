namespace Huminex.ModuleContracts.System;

public sealed record HealthResponse(string Service, string Status, DateTime UtcTime);
