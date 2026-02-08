using Huminex.Api.Configuration;
using Huminex.Api.Extensions;
using Azure.Identity;
using Microsoft.Azure.AppConfiguration.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var cwd = Directory.GetCurrentDirectory();
EnvFileLoader.Load(
    Path.Combine(cwd, ".env.local"),
    Path.Combine(cwd, "..", ".env.local"),
    Path.Combine(cwd, "..", "..", ".env.local"),
    Path.Combine(cwd, "..", "..", "..", ".env.local"),
    Path.Combine(cwd, "..", "..", "..", "..", ".env.local"));

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables(prefix: "HUMINEX_");

var appConfigEndpoint = builder.Configuration["AzureAppConfiguration:Endpoint"];
if (!string.IsNullOrWhiteSpace(appConfigEndpoint))
{
    builder.Configuration.AddAzureAppConfiguration(options =>
    {
        options.Connect(new Uri(appConfigEndpoint), new DefaultAzureCredential())
            .Select(KeyFilter.Any, LabelFilter.Null);
        options.UseFeatureFlags(featureFlags =>
        {
            featureFlags.SetRefreshInterval(TimeSpan.FromMinutes(5));
            featureFlags.Select(KeyFilter.Any, LabelFilter.Null);
        });
    });
    builder.Services.AddAzureAppConfiguration();
}

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithEnvironmentName()
        .Enrich.WithProcessId()
        .Enrich.WithThreadId()
        .WriteTo.Console();
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(
        jwtOptions =>
        {
            builder.Configuration.Bind("AzureAd", jwtOptions);
            jwtOptions.TokenValidationParameters ??= new TokenValidationParameters();
            jwtOptions.TokenValidationParameters.RoleClaimType = "roles";
            jwtOptions.TokenValidationParameters.NameClaimType = "preferred_username";

            var configuredAudiences = builder.Configuration.GetSection("AzureAd:ValidAudiences").Get<string[]>();
            if (configuredAudiences is { Length: > 0 })
            {
                jwtOptions.TokenValidationParameters.ValidAudiences = configuredAudiences;
            }
            else
            {
                var fallbackAudiences = new[]
                {
                    builder.Configuration["AzureAd:Audience"],
                    builder.Configuration["AzureAd:ClientId"],
                }
                .Where(audience => !string.IsNullOrWhiteSpace(audience))
                .Cast<string>()
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

                if (fallbackAudiences.Length > 0)
                {
                    jwtOptions.TokenValidationParameters.ValidAudiences = fallbackAudiences;
                }
            }
        },
        msIdentityOptions => builder.Configuration.Bind("AzureAd", msIdentityOptions));

builder.Services.AddAuthorization();
builder.Services.AddHuminexApi(builder.Configuration);
builder.Services.AddScoped<DemoDataSeeder>();

var app = builder.Build();

if (!string.IsNullOrWhiteSpace(appConfigEndpoint))
{
    app.UseAzureAppConfiguration();
}

var shouldApplyMigrationsOnStartup = builder.Configuration.GetValue<bool>("Postgres:ApplyMigrationsOnStartup");
if (shouldApplyMigrationsOnStartup)
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DemoDataSeeder>();
    await seeder.SeedAsync();
}

app.UseHuminexApi();
app.Run();

public partial class Program;
