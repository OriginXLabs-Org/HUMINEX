namespace Huminex.SharedKernel.Tenancy;

public sealed record TenantContext(
    Guid TenantId,
    Guid UserId,
    string UserEmail,
    string Role,
    IReadOnlyCollection<string> Permissions
);
