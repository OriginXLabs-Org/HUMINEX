using System.Text.Json;

namespace Huminex.Tests.Integration;

public class UnitTest1
{
    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null && !File.Exists(Path.Combine(current.FullName, "Backend", "Huminex.slnx")))
        {
            current = current.Parent;
        }

        if (current is null)
        {
            throw new DirectoryNotFoundException("Could not locate repository root.");
        }

        return current.FullName;
    }

    [Fact]
    public void AppSettings_ShouldContainCoreInfrastructureSections()
    {
        var repoRoot = FindRepoRoot();
        var path = Path.Combine(repoRoot, "Backend", "src", "Api", "Huminex.Api", "appsettings.json");
        var json = File.ReadAllText(path);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("Postgres", out _));
        Assert.True(root.TryGetProperty("Redis", out _));
        Assert.True(root.TryGetProperty("ServiceBus", out _));
        Assert.True(root.TryGetProperty("AzureStorage", out _));
        Assert.True(root.TryGetProperty("AcsEmail", out _));
    }
}
