using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

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
                ["DevSecurity:EnableHeaderIdentityFallback"] = "true",
                ["ServiceBus:EventsTopicName"] = ""
            };

            configBuilder.AddInMemoryCollection(testOverrides);
        });

        builder.ConfigureServices(services =>
        {
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    _ => { });

            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        return base.CreateHost(builder);
    }
}
