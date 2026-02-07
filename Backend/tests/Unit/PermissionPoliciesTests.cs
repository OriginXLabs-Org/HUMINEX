using Huminex.BuildingBlocks.Contracts.Auth;

namespace Huminex.Tests.Unit;

public sealed class PermissionPoliciesTests
{
    [Fact]
    public void AllPolicies_ShouldBeDistinctAndNonEmpty()
    {
        var values = new[]
        {
            PermissionPolicies.PayrollRead,
            PermissionPolicies.PayrollWrite,
            PermissionPolicies.OrgRead,
            PermissionPolicies.OrgWrite,
            PermissionPolicies.RbacRead,
            PermissionPolicies.RbacWrite,
            PermissionPolicies.UserReadSelf,
            PermissionPolicies.UserRoleWrite,
            PermissionPolicies.WorkforcePortalAccessWrite,
        };

        Assert.All(values, value => Assert.False(string.IsNullOrWhiteSpace(value)));
        Assert.Equal(values.Length, values.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }
}
