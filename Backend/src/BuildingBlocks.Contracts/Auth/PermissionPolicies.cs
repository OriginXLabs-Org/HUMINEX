namespace Huminex.BuildingBlocks.Contracts.Auth;

public static class PermissionPolicies
{
    public const string OrgRead = "perm:org.read";
    public const string OrgWrite = "perm:org.write";
    public const string WorkforcePortalAccessWrite = "perm:workforce.portal-access.write";
    public const string PayrollRead = "perm:payroll.read";
    public const string PayrollWrite = "perm:payroll.write";
    public const string RbacRead = "perm:rbac.read";
    public const string RbacWrite = "perm:rbac.write";
    public const string UserReadSelf = "perm:user.read.self";
    public const string UserRoleWrite = "perm:user.roles.write";
}
