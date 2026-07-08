using MediatR;
using TrackerAPI.Application.Features.Incidents.Commands;
using TrackerAPI.Application.Photos;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Workers.Commands
{
    /// <summary>
    /// Uploads the authenticated worker's own profile photo. The worker id is lifted from the
    /// JWT by the controller and passed in, so the handler stays HTTP-agnostic (same pattern as
    /// GetCurrentWorkerQuery). Reuses PhotoUploadResult from the incident feature.
    /// </summary>
    public class UploadWorkerPhotoCommand : IRequest<PhotoUploadResult>
    {
        public Guid WorkerId { get; }
        public byte[] Content { get; }
        public string? ContentType { get; }

        public UploadWorkerPhotoCommand(Guid workerId, byte[] content, string? contentType)
        {
            WorkerId = workerId;
            Content = content;
            ContentType = contentType;
        }
    }

    public class UploadWorkerPhotoCommandHandler : IRequestHandler<UploadWorkerPhotoCommand, PhotoUploadResult>
    {
        private readonly ApplicationDbContext _context;
        private readonly IPhotoStorageService _storage;

        public UploadWorkerPhotoCommandHandler(ApplicationDbContext context, IPhotoStorageService storage)
        {
            _context = context;
            _storage = storage;
        }

        public async Task<PhotoUploadResult> Handle(UploadWorkerPhotoCommand request, CancellationToken cancellationToken)
        {
            if (!_storage.IsEnabled)
                return new PhotoUploadResult { ErrorMessage = "Photo storage is not configured." };

            var worker = await _context.Workers.FindAsync(new object[] { request.WorkerId }, cancellationToken);
            if (worker == null)
                return new PhotoUploadResult { NotFound = true };

            var validation = ImageValidation.Validate(request.Content, request.ContentType);
            if (!validation.IsValid)
                return new PhotoUploadResult { ErrorMessage = validation.Error };

            var oldPath = worker.PhotoPath;

            var blobName = $"{worker.Id}/{Guid.NewGuid()}.{validation.Extension}";
            using var stream = new MemoryStream(request.Content);
            var path = await _storage.UploadAsync(stream, request.ContentType!, PhotoContainers.ProfilePhotos, blobName, cancellationToken);

            worker.PhotoPath = path;
            await _context.SaveChangesAsync(cancellationToken);

            if (!string.IsNullOrEmpty(oldPath) && oldPath != path)
                await _storage.DeleteAsync(oldPath, cancellationToken);

            return new PhotoUploadResult { PhotoUrl = _storage.GetReadUrl(path) };
        }
    }
}
