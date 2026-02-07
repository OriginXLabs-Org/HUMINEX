using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        return base.CreateHost(builder);
    }
}
