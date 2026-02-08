namespace Huminex.Api.Configuration;

public sealed class InternalAdminOptions
{
    public const string SectionName = "InternalAdmin";
    public string Email { get; set; } = "originxlabs@gmail.com";
    public string[] AllowedRoles { get; set; } = ["admin", "super_admin", "director"];
}
