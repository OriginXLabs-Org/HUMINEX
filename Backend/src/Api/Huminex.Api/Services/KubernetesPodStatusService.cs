using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Huminex.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Services;

public sealed class KubernetesPodStatusService(IOptions<InternalAdminOptions> options, ILogger<KubernetesPodStatusService> logger)
{
    private const string ServiceAccountTokenPath = "/var/run/secrets/kubernetes.io/serviceaccount/token";
    private const string ServiceAccountCaPath = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";

    public async Task<KubernetesPodInventoryResult> GetPodsAsync(CancellationToken cancellationToken)
    {
        var host = Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_HOST");
        var port = Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_PORT") ?? "443";
        var ns = options.Value.Azure?.AksNamespace ?? "default";
        if (string.IsNullOrWhiteSpace(host))
        {
            return KubernetesPodInventoryResult.Unavailable("Not running inside Kubernetes cluster context.");
        }

        if (!File.Exists(ServiceAccountTokenPath))
        {
            return KubernetesPodInventoryResult.Unavailable("Kubernetes service account token not found.");
        }

        var token = await File.ReadAllTextAsync(ServiceAccountTokenPath, cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            return KubernetesPodInventoryResult.Unavailable("Kubernetes service account token is empty.");
        }

        try
        {
            var handler = new HttpClientHandler();
            if (File.Exists(ServiceAccountCaPath))
            {
                var caCertificate = new X509Certificate2(await File.ReadAllBytesAsync(ServiceAccountCaPath, cancellationToken));
                handler.ServerCertificateCustomValidationCallback = (_, cert, _, _) =>
                {
                    if (cert is null)
                    {
                        return false;
                    }

                    using var chain = new X509Chain();
                    chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
                    chain.ChainPolicy.CustomTrustStore.Add(caCertificate);
                    chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
                    chain.ChainPolicy.VerificationFlags = X509VerificationFlags.AllowUnknownCertificateAuthority;
                    return chain.Build(new X509Certificate2(cert));
                };
            }

            using var httpClient = new HttpClient(handler)
            {
                BaseAddress = new Uri($"https://{host}:{port}"),
                Timeout = TimeSpan.FromSeconds(8)
            };
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Trim());

            var response = await httpClient.GetAsync($"/api/v1/namespaces/{Uri.EscapeDataString(ns)}/pods", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                var msg = $"Kubernetes API call failed ({(int)response.StatusCode}): {body}";
                return KubernetesPodInventoryResult.Unavailable(msg);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
            {
                return KubernetesPodInventoryResult.Success([]);
            }

            var pods = new List<KubernetesPodStatus>();
            foreach (var item in items.EnumerateArray())
            {
                var metadata = item.TryGetProperty("metadata", out var meta) ? meta : default;
                var status = item.TryGetProperty("status", out var stat) ? stat : default;
                var spec = item.TryGetProperty("spec", out var sp) ? sp : default;

                var podName = metadata.TryGetProperty("name", out var nameElement) ? nameElement.GetString() ?? "unknown" : "unknown";
                var phase = status.TryGetProperty("phase", out var phaseElement) ? phaseElement.GetString() ?? "unknown" : "unknown";
                var nodeName = spec.TryGetProperty("nodeName", out var nodeElement) ? nodeElement.GetString() ?? "unknown" : "unknown";
                var reason = status.TryGetProperty("reason", out var reasonElement) ? reasonElement.GetString() ?? string.Empty : string.Empty;

                var restartCount = 0;
                var allReady = true;
                if (status.TryGetProperty("containerStatuses", out var containerStatuses) && containerStatuses.ValueKind == JsonValueKind.Array)
                {
                    foreach (var container in containerStatuses.EnumerateArray())
                    {
                        if (container.TryGetProperty("restartCount", out var restartsElement) && restartsElement.TryGetInt32(out var restarts))
                        {
                            restartCount += restarts;
                        }

                        if (!container.TryGetProperty("ready", out var readyElement) || readyElement.ValueKind != JsonValueKind.True)
                        {
                            allReady = false;
                        }

                        if (container.TryGetProperty("state", out var stateElement)
                            && stateElement.TryGetProperty("waiting", out var waitingElement)
                            && waitingElement.TryGetProperty("reason", out var waitingReasonElement))
                        {
                            reason = waitingReasonElement.GetString() ?? reason;
                        }
                    }
                }

                var normalizedStatus = NormalizePodStatus(phase, reason, allReady);
                pods.Add(new KubernetesPodStatus(
                    podName,
                    ns,
                    normalizedStatus,
                    phase,
                    reason,
                    restartCount,
                    allReady,
                    nodeName));
            }

            return KubernetesPodInventoryResult.Success(pods.OrderBy(x => x.Name).ToArray());
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to read Kubernetes pod inventory for internal admin.");
            return KubernetesPodInventoryResult.Unavailable(ex.Message);
        }
    }

    private static string NormalizePodStatus(string phase, string reason, bool allReady)
    {
        var normalizedPhase = phase.Trim().ToLowerInvariant();
        var normalizedReason = reason.Trim().ToLowerInvariant();

        if (normalizedReason.Contains("crashloop"))
        {
            return "crashloop";
        }

        if (normalizedPhase == "running")
        {
            return allReady ? "running" : "degraded";
        }

        if (normalizedPhase == "pending")
        {
            return "pending";
        }

        if (normalizedPhase == "failed")
        {
            return "failed";
        }

        if (normalizedPhase == "succeeded")
        {
            return "succeeded";
        }

        return string.IsNullOrWhiteSpace(normalizedPhase) ? "unknown" : normalizedPhase;
    }
}

public sealed record KubernetesPodStatus(
    string Name,
    string Namespace,
    string Status,
    string Phase,
    string Reason,
    int RestartCount,
    bool Ready,
    string NodeName);

public sealed record KubernetesPodInventoryResult(bool IsAvailable, string Message, IReadOnlyCollection<KubernetesPodStatus> Pods)
{
    public static KubernetesPodInventoryResult Success(IReadOnlyCollection<KubernetesPodStatus> pods) =>
        new(true, string.Empty, pods);

    public static KubernetesPodInventoryResult Unavailable(string message) =>
        new(false, message, []);
}
