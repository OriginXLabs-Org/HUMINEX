using System.Reflection;

namespace Huminex.Tests.Architecture;

public class UnitTest1
{
    [Fact]
    public void ApiProject_ShouldContainCoreControllers()
    {
        var apiAssembly = Assembly.Load("Huminex.Api");
        var controllerNames = apiAssembly
            .GetTypes()
            .Where(t => t.Name.EndsWith("Controller", StringComparison.Ordinal))
            .Select(t => t.Name)
            .ToHashSet(StringComparer.Ordinal);

        var expected = new[]
        {
            "AuthController",
            "UsersController",
            "RbacController",
            "OrganizationController",
            "WorkforceController",
            "PayrollController",
            "OpenHumanController",
            "SystemController"
        };

        foreach (var controller in expected)
        {
            Assert.Contains(controller, controllerNames);
        }
    }
}
