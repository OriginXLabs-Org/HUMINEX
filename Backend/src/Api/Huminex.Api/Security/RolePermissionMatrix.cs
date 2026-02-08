using Huminex.BuildingBlocks.Contracts.Auth;

namespace Huminex.Api.Security;

/// <summary>
/// Maps tenant roles (from Entra app roles or headers) to HUMINEX permission strings.
/// This is the backend source of truth for policy enforcement when tokens do not carry explicit permission claims.
/// </summary>
public static class RolePermissionMatrix
{
    // These match PermissionRequirement values (without the "perm:" prefix).
    private static readonly string[] AdminPermissions =
    [
        "org.read",
        "org.write",
        "workforce.portal-access.write",
        "payroll.read",
        "payroll.write",
        "rbac.read",
        "rbac.write",
        "user.read.self",
        "user.roles.write",
        "internal.admin"
    ];

    private static readonly IReadOnlyDictionary<string, string[]> Map = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
    {
        ["admin"] = AdminPermissions,
        ["super_admin"] = AdminPermissions,
        ["internal_admin"] = ["internal.admin"],

        ["hr_manager"] = ["org.read", "org.write", "workforce.portal-access.write", "user.read.self"],
        ["finance_manager"] = ["org.read", "payroll.read", "user.read.self"],
        ["payroll_manager"] = ["org.read", "payroll.read", "payroll.write", "user.read.self"],
        ["manager"] = ["org.read", "user.read.self"],
        ["viewer"] = ["org.read", "user.read.self"],
        ["employee"] = ["user.read.self", "org.read", "payroll.read"],
    };

    public static string[] ResolvePermissions(IReadOnlyCollection<string> roles)
    {
        if (roles.Count == 0)
        {
            return [];
        }

        var resolved = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var role in roles)
        {
            if (string.IsNullOrWhiteSpace(role))
            {
                continue;
            }

            if (Map.TryGetValue(role.Trim(), out var permissions))
            {
                foreach (var permission in permissions)
                {
                    resolved.Add(permission);
                }
            }
        }

        return resolved.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public static bool IsAdmin(IReadOnlyCollection<string> roles)
    {
        return roles.Any(role =>
            string.Equals(role?.Trim(), "admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role?.Trim(), "super_admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role?.Trim(), "Admin", StringComparison.OrdinalIgnoreCase));
    }
}

