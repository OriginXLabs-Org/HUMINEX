using Asp.Versioning;
using Asp.Versioning.ApiExplorer;
using Huminex.Api.HealthChecks;
using Huminex.Api.Services;
using FluentValidation;
using Huminex.Api.Configuration;
using Huminex.Api.Security;
using Huminex.Api.Swagger;
using Huminex.BuildingBlocks.Contracts.Auth;
using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Repositories;
using Huminex.BuildingBlocks.Observability.Telemetry;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.FeatureManagement;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Huminex.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddHuminexApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PostgresOptions>(configuration.GetSection(PostgresOptions.SectionName));
        services.Configure<RedisOptions>(configuration.GetSection(RedisOptions.SectionName));
        services.Configure<ServiceBusOptions>(configuration.GetSection(ServiceBusOptions.SectionName));
        services.Configure<AzureStorageOptions>(configuration.GetSection(AzureStorageOptions.SectionName));
        services.Configure<AcsEmailOptions>(configuration.GetSection(AcsEmailOptions.SectionName));
        services.Configure<AzureAppConfigurationOptions>(configuration.GetSection(AzureAppConfigurationOptions.SectionName));
        services.Configure<InternalAdminOptions>(configuration.GetSection(InternalAdminOptions.SectionName));
        services.Configure<DevSecurityOptions>(configuration.GetSection(DevSecurityOptions.SectionName));
        var redisOptions = configuration.GetSection(RedisOptions.SectionName).Get<RedisOptions>() ?? new RedisOptions();

        services.AddHttpContextAccessor();
        services.AddScoped<ITenantProvider, HttpTenantProvider>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRbacRepository, RbacRepository>();
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IPayrollRepository, PayrollRepository>();
        services.AddScoped<IAuditTrailRepository, AuditTrailRepository>();
        services.AddScoped<IPayrollDocumentStorage, PayrollDocumentStorage>();
        services.AddScoped<IBusinessEventPublisher, BusinessEventPublisher>();

        var postgresOptions = configuration.GetSection(PostgresOptions.SectionName).Get<PostgresOptions>() ?? new PostgresOptions();
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(postgresOptions.ConnectionString, npgsql =>
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddValidatorsFromAssemblyContaining<Program>();
        services.AddFeatureManagement();

        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
            options.ApiVersionReader = new UrlSegmentApiVersionReader();
        }).AddApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

        services.AddSingleton<IAuthorizationPolicyProvider, PermissionAuthorizationPolicyProvider>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "HUMINEX API",
                Version = "v1",
                Description = "Enterprise platform APIs for Identity, Organization, Workforce, Payroll, and OpenHuman modules."
            });

            options.TagActionsBy(apiDescription =>
            {
                var relativePath = apiDescription.RelativePath?.ToLowerInvariant() ?? string.Empty;
                if (relativePath.Contains("/users") || relativePath.Contains("/rbac"))
                {
                    return ["Identity & Access"];
                }

                if (relativePath.Contains("/org") || relativePath.Contains("/workforce"))
                {
                    return ["Organization & Workforce"];
                }

                if (relativePath.Contains("/payroll"))
                {
                    return ["Payroll"];
                }

                if (relativePath.Contains("/openhuman"))
                {
                    return ["OpenHuman"];
                }

                return ["Platform"];
            });

            var xmlFile = $"{typeof(Program).Assembly.GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
            }

            options.OperationFilter<SwaggerExamplesOperationFilter>();

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter a valid Bearer JWT issued for HUMINEX API."
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }
            });
        });

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(TelemetryConstants.ServiceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddOtlpExporter());

        services.AddHealthChecks()
            .AddNpgSql(postgresOptions.ConnectionString, name: "postgres", tags: ["ready"])
            .AddRedis(redisOptions.ConnectionString, name: "redis", tags: ["ready"])
            .AddCheck<ServiceBusHealthCheck>("servicebus", tags: ["ready"])
            .AddCheck<BlobStorageHealthCheck>("blobstorage", tags: ["ready"])
            .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(), tags: ["live"]);

        return services;
    }

    public static WebApplication UseHuminexApi(this WebApplication app)
    {
        app.UseMiddleware<Huminex.Api.Middleware.ExceptionHandlingMiddleware>();

        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "HUMINEX API v1");
            options.DisplayRequestDuration();
        });

        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseMiddleware<Huminex.Api.Middleware.TenantContextGuardMiddleware>();
        app.UseAuthorization();
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("live")
        });
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready")
        });
        app.MapControllers();

        return app;
    }
}
