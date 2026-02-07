using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Huminex.Tests.Integration.Infrastructure;

public sealed class HuminexApiFactory(string postgresConnectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var testOverrides = new Dictionary<string, string?>
            {
                ["Postgres:ConnectionString"] = postgresConnectionString,
                ["Postgres:ApplyMigrationsOnStartup"] = "true",
                ["DevSecurity:EnableHeaderIdentityFallback"] = "true"
            };

            configBuilder.AddInMemoryCollection(testOverrides);
        });

        builder.ConfigureServices(services =>
        {
            using var scope = services.BuildServiceProvider().CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Database.EnsureCreated();
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        return base.CreateHost(builder);
    }
}
