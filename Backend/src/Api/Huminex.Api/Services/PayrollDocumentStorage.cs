using System.Text;
using Azure;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Huminex.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Huminex.Api.Services;

public interface IPayrollDocumentStorage
{
    Task<string> EnsurePayslipDocumentAsync(Guid tenantId, Guid employeeId, string period, CancellationToken cancellationToken = default);
}

public sealed class PayrollDocumentStorage(IOptions<AzureStorageOptions> storageOptions) : IPayrollDocumentStorage
{
    private readonly AzureStorageOptions _storageOptions = storageOptions.Value;

    public async Task<string> EnsurePayslipDocumentAsync(Guid tenantId, Guid employeeId, string period, CancellationToken cancellationToken = default)
    {
        var blobServiceClient = BuildBlobServiceClient();
        var container = blobServiceClient.GetBlobContainerClient(_storageOptions.PayrollDocumentsContainer);
        await container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: cancellationToken);

        var blobName = $"{tenantId}/{employeeId}/{period}/payslip.txt";
        var blobClient = container.GetBlobClient(blobName);

        if (await blobClient.ExistsAsync(cancellationToken))
        {
            return blobName;
        }

        var payload = Encoding.UTF8.GetBytes($"HUMINEX payslip placeholder for employee {employeeId} period {period} generated at {DateTime.UtcNow:O}.");
        await using var stream = new MemoryStream(payload);
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = "text/plain" }, cancellationToken: cancellationToken);

        return blobName;
    }

    private BlobServiceClient BuildBlobServiceClient()
    {
        if (!string.IsNullOrWhiteSpace(_storageOptions.BlobConnectionString))
        {
            return new BlobServiceClient(_storageOptions.BlobConnectionString);
        }

        if (!string.IsNullOrWhiteSpace(_storageOptions.BlobServiceUri))
        {
            return new BlobServiceClient(new Uri(_storageOptions.BlobServiceUri), new DefaultAzureCredential());
        }

        throw new InvalidOperationException("AzureStorage.BlobConnectionString or AzureStorage.BlobServiceUri must be configured.");
    }
}
