using System.Threading;
using System.Threading.Tasks;

namespace TrackerAPI.Interfaces
{
    /// <summary>
    /// Abstraction over blob/object storage for user-uploaded photos. Kept behind an interface
    /// for the same reasons IEmailService is: the transport (Azurite locally, real Azure Blob in
    /// the cloud, a no-op when unconfigured) is a deployment concern, and tests swap in a fake.
    /// </summary>
    public interface IPhotoStorageService
    {
        /// <summary>True when a real storage backend is configured. The UI/endpoints use this to
        /// hide upload affordances and short-circuit when storage is disabled (feature flag).</summary>
        bool IsEnabled { get; }

        /// <summary>Uploads a blob and returns the stored path (e.g. "{ownerId}/{guid}.jpg").
        /// The path — not a URL — is what callers persist on the entity.</summary>
        Task<string> UploadAsync(Stream content, string contentType, string container, string blobName, CancellationToken cancellationToken = default);

        /// <summary>Mints a short-lived, read-only SAS URL for an existing blob path, or null if the
        /// path is empty/storage disabled. The URL expires (15 min) so it is safe to hand to a browser.</summary>
        string? GetReadUrl(string? path);

        /// <summary>Deletes a blob by path. No-op if the path is empty or storage is disabled.</summary>
        Task DeleteAsync(string? path, CancellationToken cancellationToken = default);
    }

    /// <summary>Container names, centralised so command handlers and startup agree.</summary>
    public static class PhotoContainers
    {
        public const string IncidentPhotos = "incident-photos";
        public const string ProfilePhotos = "profile-photos";
    }
}
