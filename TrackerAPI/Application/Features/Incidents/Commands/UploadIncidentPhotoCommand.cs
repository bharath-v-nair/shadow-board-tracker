using MediatR;
using TrackerAPI.Application.Photos;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class PhotoUploadResult
    {
        public bool NotFound { get; set; }
        public string? ErrorMessage { get; set; }
        public string? PhotoUrl { get; set; }
        public bool IsSuccess => !NotFound && string.IsNullOrEmpty(ErrorMessage);
    }

    /// <summary>
    /// Attaches an evidence photo to an incident. Validates size/type/magic-bytes, stores the
    /// blob under the incident-photos container, and persists the container-qualified path on
    /// the incident. Replacing an existing photo deletes the old blob (no orphans).
    /// </summary>
    public class UploadIncidentPhotoCommand : IRequest<PhotoUploadResult>
    {
        public Guid IncidentId { get; }
        public byte[] Content { get; }
        public string? ContentType { get; }

        public UploadIncidentPhotoCommand(Guid incidentId, byte[] content, string? contentType)
        {
            IncidentId = incidentId;
            Content = content;
            ContentType = contentType;
        }
    }

    public class UploadIncidentPhotoCommandHandler : IRequestHandler<UploadIncidentPhotoCommand, PhotoUploadResult>
    {
        private readonly ApplicationDbContext _context;
        private readonly IPhotoStorageService _storage;

        public UploadIncidentPhotoCommandHandler(ApplicationDbContext context, IPhotoStorageService storage)
        {
            _context = context;
            _storage = storage;
        }

        public async Task<PhotoUploadResult> Handle(UploadIncidentPhotoCommand request, CancellationToken cancellationToken)
        {
            if (!_storage.IsEnabled)
                return new PhotoUploadResult { ErrorMessage = "Photo storage is not configured." };

            var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
            if (incident == null)
                return new PhotoUploadResult { NotFound = true };

            var validation = ImageValidation.Validate(request.Content, request.ContentType);
            if (!validation.IsValid)
                return new PhotoUploadResult { ErrorMessage = validation.Error };

            var oldPath = incident.PhotoPath;

            var blobName = $"{incident.Id}/{Guid.NewGuid()}.{validation.Extension}";
            using var stream = new MemoryStream(request.Content);
            var path = await _storage.UploadAsync(stream, request.ContentType!, PhotoContainers.IncidentPhotos, blobName, cancellationToken);

            incident.PhotoPath = path;
            await _context.SaveChangesAsync(cancellationToken);

            // Best-effort cleanup of the replaced blob; a leftover blob is harmless, so don't fail on it.
            if (!string.IsNullOrEmpty(oldPath) && oldPath != path)
                await _storage.DeleteAsync(oldPath, cancellationToken);

            return new PhotoUploadResult { PhotoUrl = _storage.GetReadUrl(path) };
        }
    }
}
