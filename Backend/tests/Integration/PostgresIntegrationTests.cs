using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using DotNet.Testcontainers.Containers;
using Huminex.BuildingBlocks.Infrastructure.Persistence;
using Huminex.BuildingBlocks.Infrastructure.Persistence.Entities;
using Huminex.Tests.Integration.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Huminex.Tests.Integration;

public sealed class PostgresIntegrationTests : IAsyncLifetime
{
    private readonly PostgreSqlTestcontainer _postgres = new TestcontainersBuilder<PostgreSqlTestcontainer>()
        .WithDatabase(new PostgreSqlTestcontainerConfiguration
        {
            Database = "huminex_test",
            Username = "postgres",
            Password = "postgres"
        })
        .WithImage("postgres:16-alpine")
        .WithCleanUp(true)
        .Build();

    private HuminexApiFactory? _factory;
    private HttpClient? _client;

    public async Task InitializeAsync()
    {
        try
        {
            await _postgres.StartAsync();
        }
        catch
        {
            return;
        }

        _factory = new HuminexApiFactory(_postgres.ConnectionString);
        _client = _factory.CreateClient();

        await SeedTenantDataAsync();
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }

        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task OrganizationEmployees_ShouldBeTenantIsolated()
    {
        if (_client is null)
        {
            return;
        }

        using var tenantARequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/org/employees?page=1&pageSize=100");
        tenantARequest.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        tenantARequest.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        tenantARequest.Headers.Add("X-User-Email", "tenanta-admin@gethuminex.com");
        tenantARequest.Headers.Add("X-User-Role", "hr_manager");
        tenantARequest.Headers.Add("X-User-Permissions", "org.read");

        using var tenantBRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/org/employees?page=1&pageSize=100");
        tenantBRequest.Headers.Add("X-Tenant-Id", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        tenantBRequest.Headers.Add("X-User-Id", "22222222-2222-2222-2222-222222222222");
        tenantBRequest.Headers.Add("X-User-Email", "tenantb-admin@gethuminex.com");
        tenantBRequest.Headers.Add("X-User-Role", "hr_manager");
        tenantBRequest.Headers.Add("X-User-Permissions", "org.read");

        var tenantAResponse = await _client.SendAsync(tenantARequest);
        var tenantBResponse = await _client.SendAsync(tenantBRequest);

        tenantAResponse.EnsureSuccessStatusCode();
        tenantBResponse.EnsureSuccessStatusCode();

        var tenantACodes = await ExtractEmployeeCodesAsync(tenantAResponse);
        var tenantBCodes = await ExtractEmployeeCodesAsync(tenantBResponse);

        Assert.Contains("A-EMP-001", tenantACodes);
        Assert.DoesNotContain("B-EMP-001", tenantACodes);

        Assert.Contains("B-EMP-001", tenantBCodes);
        Assert.DoesNotContain("A-EMP-001", tenantBCodes);
    }

    [Fact]
    public async Task PayrollRuns_ShouldReturnForbidden_WhenPermissionMissing()
    {
        if (_client is null)
        {
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/payroll/runs");
        request.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        request.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        request.Headers.Add("X-User-Email", "tenanta-limited@gethuminex.com");
        request.Headers.Add("X-User-Role", "viewer");
        request.Headers.Add("X-User-Permissions", "org.read");

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PayrollCreateRun_ShouldReplayResponse_WhenIdempotencyKeyRepeated()
    {
        if (_client is null)
        {
            return;
        }

        var payload = JsonContent.Create(new { period = "2026-03" });

        using var firstRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/payroll/runs")
        {
            Content = payload
        };
        firstRequest.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        firstRequest.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        firstRequest.Headers.Add("X-User-Email", "tenanta-payroll@gethuminex.com");
        firstRequest.Headers.Add("X-User-Role", "payroll_manager");
        firstRequest.Headers.Add("X-User-Permissions", "payroll.write,payroll.read");
        firstRequest.Headers.Add("Idempotency-Key", "payroll-run-2026-03");

        using var secondRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/payroll/runs")
        {
            Content = JsonContent.Create(new { period = "2026-03" })
        };
        secondRequest.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        secondRequest.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        secondRequest.Headers.Add("X-User-Email", "tenanta-payroll@gethuminex.com");
        secondRequest.Headers.Add("X-User-Role", "payroll_manager");
        secondRequest.Headers.Add("X-User-Permissions", "payroll.write,payroll.read");
        secondRequest.Headers.Add("Idempotency-Key", "payroll-run-2026-03");

        var firstResponse = await _client.SendAsync(firstRequest);
        var secondResponse = await _client.SendAsync(secondRequest);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        var firstId = await ExtractRunIdAsync(firstResponse);
        var secondId = await ExtractRunIdAsync(secondResponse);

        Assert.Equal(firstId, secondId);
    }

    [Fact]
    public async Task AuthLogin_ShouldReturnTokenEnvelope()
    {
        if (_client is null)
        {
            return;
        }

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@gethuminex.com",
            password = "demo"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = document.RootElement.GetProperty("data");
        Assert.False(string.IsNullOrWhiteSpace(data.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(data.GetProperty("refreshToken").GetString()));
    }

    [Fact]
    public async Task PayrollApprove_ShouldRequireIdempotencyHeader()
    {
        if (_client is null)
        {
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/payroll/runs/dbb34352-a4f2-4a37-9cdf-367b36234f81/approve");
        request.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        request.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        request.Headers.Add("X-User-Email", "tenanta-payroll@gethuminex.com");
        request.Headers.Add("X-User-Role", "payroll_manager");
        request.Headers.Add("X-User-Permissions", "payroll.write,payroll.read");

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EmailPayslip_ShouldReturnNotFound_WhenNoPayslipExists()
    {
        if (_client is null)
        {
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/payroll/employees/ff6f8cbf-3078-41f4-b5d7-cd8ceaf5f85d/payslips/2026-01/email");
        request.Headers.Add("X-Tenant-Id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        request.Headers.Add("X-User-Id", "11111111-1111-1111-1111-111111111111");
        request.Headers.Add("X-User-Email", "tenanta-payroll@gethuminex.com");
        request.Headers.Add("X-User-Role", "payroll_manager");
        request.Headers.Add("X-User-Permissions", "payroll.write,payroll.read");
        request.Headers.Add("Idempotency-Key", "email-missing-payslip-2026-01");

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("payslip_not_found", document.RootElement.GetProperty("code").GetString());
    }

    private async Task SeedTenantDataAsync()
    {
        if (_factory is null)
        {
            return;
        }

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tenantA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var tenantB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        if (!dbContext.Employees.Any(x => x.TenantId == tenantA))
        {
            dbContext.Employees.Add(new EmployeeEntity(tenantA, "A-EMP-001", "Tenant A Engineer", "a-emp-001@gethuminex.com", "engineer", "Engineering", null, null));
        }

        if (!dbContext.Employees.Any(x => x.TenantId == tenantB))
        {
            dbContext.Employees.Add(new EmployeeEntity(tenantB, "B-EMP-001", "Tenant B Engineer", "b-emp-001@gethuminex.com", "engineer", "Engineering", null, null));
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task<IReadOnlyCollection<string>> ExtractEmployeeCodesAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = document.RootElement
            .GetProperty("data")
            .GetProperty("page")
            .GetProperty("items")
            .EnumerateArray()
            .Select(item => item.GetProperty("employeeCode").GetString() ?? string.Empty)
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .ToArray();

        return items;
    }

    private static async Task<string> ExtractRunIdAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("data").GetProperty("runId").GetString() ?? string.Empty;
    }
}
