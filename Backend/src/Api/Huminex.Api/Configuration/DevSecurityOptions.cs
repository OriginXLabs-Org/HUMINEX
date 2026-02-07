namespace Huminex.Api.Configuration;

public sealed class DevSecurityOptions
{
    public const string SectionName = "DevSecurity";
    public bool EnableHeaderIdentityFallback { get; set; } = true;
    public string FallbackTenantId { get; set; } = "11111111-1111-1111-1111-111111111111";
    public string FallbackUserId { get; set; } = "22222222-2222-2222-2222-222222222222";
    public string FallbackUserEmail { get; set; } = "admin@gethuminex.com";
    public string FallbackRole { get; set; } = "admin";
    public string[] FallbackPermissions { get; set; } =
    [
        "org.read",
        "org.write",
        "workforce.portal-access.write",
        "payroll.read",
        "payroll.write",
        "rbac.read",
        "rbac.write",
        "user.read.self",
        "user.roles.write"
    ];
}
