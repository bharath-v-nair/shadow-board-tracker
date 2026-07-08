using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Logging;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Services
{
    /// <summary>
    /// Production-real photo storage over the Azure Blob Storage SDK. Locally the connection
    /// string is "UseDevelopmentStorage=true", which points the SAME SDK at the Azurite
    /// emulator container — identical wire protocol, so swapping to real Azure is a connection-
    /// string change, not a code change (that keeps the "Azure Blob Storage" resume line honest).
    ///
    /// PhotoPath is stored container-qualified as "{container}/{blobName}" (e.g.
    /// "incident-photos/{incidentId}/{guid}.jpg") so a bare path is enough to mint a read URL
    /// later without the caller having to remember which container it lives in.
    /// </summary>
    public class BlobPhotoStorageService : IPhotoStorageService
    {
        private readonly BlobServiceClient _client;
        private readonly ILogger<BlobPhotoStorageService> _logger;

        // Optional origin (scheme://host:port) to rewrite into minted read URLs. Needed only for
        // the local Docker demo: inside compose the API reaches Azurite at "azurite:10000", but a
        // browser on the host cannot resolve that DNS name — it needs the port-mapped
        // "localhost:10000". Real Azure has a single public DNS reachable by both, so this stays
        // unset in the cloud. The SAS signature covers the resource PATH, not the host, so
        // swapping scheme/host/port does not invalidate it.
        private readonly Uri? _publicEndpoint;

        // How long a minted read SAS URL stays valid. Short by design: the browser only needs
        // it long enough to render the <img>; a leaked URL stops working in minutes.
        private static readonly TimeSpan ReadUrlLifetime = TimeSpan.FromMinutes(15);

        public bool IsEnabled => true;

        public BlobPhotoStorageService(string connectionString, ILogger<BlobPhotoStorageService> logger, string? publicEndpoint = null)
        {
            _client = new BlobServiceClient(connectionString);
            _logger = logger;
            _publicEndpoint = Uri.TryCreate(publicEndpoint, UriKind.Absolute, out var uri) ? uri : null;
        }

        /// <summary>
        /// Creates the known containers if they don't exist. Called once at startup so the first
        /// upload of the app's life doesn't race container creation. Idempotent.
        /// </summary>
        public async Task InitializeAsync(CancellationToken cancellationToken = default)
        {
            foreach (var container in new[] { PhotoContainers.IncidentPhotos, PhotoContainers.ProfilePhotos })
            {
                await _client.GetBlobContainerClient(container)
                    .CreateIfNotExistsAsync(cancellationToken: cancellationToken);
            }
        }

        public async Task<string> UploadAsync(Stream content, string contentType, string container, string blobName, CancellationToken cancellationToken = default)
        {
            var containerClient = _client.GetBlobContainerClient(container);
            // Safety net in case InitializeAsync hasn't run (e.g. container recreated out of band).
            await containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

            var blobClient = containerClient.GetBlobClient(blobName);
            await blobClient.UploadAsync(
                content,
                new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
                cancellationToken);

            return $"{container}/{blobName}";
        }

        public string? GetReadUrl(string? path)
        {
            if (string.IsNullOrWhiteSpace(path)) return null;

            var slash = path.IndexOf('/');
            if (slash <= 0 || slash == path.Length - 1)
            {
                _logger.LogWarning("PhotoPath '{Path}' is not container-qualified; cannot mint read URL.", path);
                return null;
            }

            var container = path[..slash];
            var blobName = path[(slash + 1)..];
            var blobClient = _client.GetBlobContainerClient(container).GetBlobClient(blobName);

            // With a connection-string (shared-key) credential the client can sign its own SAS.
            // In real Azure with Managed Identity this would be false and we'd use a User Delegation
            // SAS instead (GetUserDelegationKey) — noted in the postmortem as the prod-grade path.
            if (!blobClient.CanGenerateSasUri)
            {
                _logger.LogWarning("Blob client cannot generate SAS (no shared key); returning null for '{Path}'.", path);
                return null;
            }

            var sas = new BlobSasBuilder
            {
                BlobContainerName = container,
                BlobName = blobName,
                Resource = "b", // 'b' = a single blob (vs 'c' = whole container)
                ExpiresOn = DateTimeOffset.UtcNow.Add(ReadUrlLifetime)
            };
            sas.SetPermissions(BlobSasPermissions.Read); // read-only: the URL can't overwrite or delete

            var uri = blobClient.GenerateSasUri(sas);

            // Rewrite the host to the browser-reachable origin when configured (local Docker only).
            if (_publicEndpoint != null)
            {
                uri = new UriBuilder(uri)
                {
                    Scheme = _publicEndpoint.Scheme,
                    Host = _publicEndpoint.Host,
                    Port = _publicEndpoint.Port
                }.Uri;
            }

            return uri.ToString();
        }

        public async Task DeleteAsync(string? path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path)) return;

            var slash = path.IndexOf('/');
            if (slash <= 0 || slash == path.Length - 1) return;

            var container = path[..slash];
            var blobName = path[(slash + 1)..];
            await _client.GetBlobContainerClient(container)
                .GetBlobClient(blobName)
                .DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
    }

    /// <summary>
    /// Registered when Storage:ConnectionString is absent (e.g. a secret-free container, or
    /// non-Docker `dotnet run` with no Azurite). The app still boots and every non-photo feature
    /// works; the UI hides upload because IsEnabled is false. Mirrors the graceful-degradation
    /// stance of the email and Redis layers.
    /// </summary>
    public class DisabledPhotoStorageService : IPhotoStorageService
    {
        public bool IsEnabled => false;
        public Task<string> UploadAsync(Stream content, string contentType, string container, string blobName, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Photo storage is not configured (Storage:ConnectionString is missing).");
        public string? GetReadUrl(string? path) => null;
        public Task DeleteAsync(string? path, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
