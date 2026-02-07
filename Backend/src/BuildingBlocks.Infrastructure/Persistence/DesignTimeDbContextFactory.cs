using Huminex.BuildingBlocks.Contracts.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System.IO;

namespace Huminex.BuildingBlocks.Infrastructure.Persistence;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        LoadEnvFiles();

        var connectionString = Environment.GetEnvironmentVariable("HUMINEX_POSTGRES_CONNECTION")
            ?? Environment.GetEnvironmentVariable("HUMINEX_Postgres__ConnectionString")
            ?? "Host=localhost;Port=5432;Database=huminex;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options, new DesignTimeTenantProvider());
    }

    private static void LoadEnvFiles()
    {
        var cwd = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(cwd, ".env.local"),
            Path.Combine(cwd, "..", ".env.local"),
            Path.Combine(cwd, "..", "..", ".env.local"),
            Path.Combine(cwd, "..", "..", "..", ".env.local"),
            Path.Combine(cwd, "..", "..", "..", "..", ".env.local"),
        };

        foreach (var path in candidates)
        {
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var raw in File.ReadAllLines(path))
            {
                var line = raw.Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal))
                {
                    continue;
                }

                var idx = line.IndexOf('=');
                if (idx <= 0)
                {
                    continue;
                }

                var key = line[..idx].Trim();
                var value = line[(idx + 1)..].Trim().Trim('"');

                if (!string.IsNullOrWhiteSpace(key) && Environment.GetEnvironmentVariable(key) is null)
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }
    }

    private sealed class DesignTimeTenantProvider : ITenantProvider
    {
        public Guid TenantId => Guid.Parse("11111111-1111-1111-1111-111111111111");
        public Guid UserId => Guid.Parse("22222222-2222-2222-2222-222222222222");
        public string UserEmail => "design@local";
        public string Role => "admin";
        public IReadOnlyCollection<string> Permissions => Array.Empty<string>();
        public bool IsAuthenticated => true;
    }
}
