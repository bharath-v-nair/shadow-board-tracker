using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Workers.Queries
{
    /// <summary>
    /// Resolves the currently authenticated user's own profile. The user id is lifted
    /// from the JWT's NameIdentifier claim by the controller and passed in here, so the
    /// handler stays free of HTTP/ClaimsPrincipal concerns (testable in isolation).
    /// </summary>
    public class GetCurrentWorkerQuery : IRequest<WorkerDto?>
    {
        public Guid UserId { get; set; }

        public GetCurrentWorkerQuery(Guid userId)
        {
            UserId = userId;
        }
    }

    public class GetCurrentWorkerQueryHandler : IRequestHandler<GetCurrentWorkerQuery, WorkerDto?>
    {
        private readonly ApplicationDbContext _context;
        private readonly IPhotoStorageService _photos;

        public GetCurrentWorkerQueryHandler(ApplicationDbContext context, IPhotoStorageService photos)
        {
            _context = context;
            _photos = photos;
        }

        public async Task<WorkerDto?> Handle(GetCurrentWorkerQuery request, CancellationToken cancellationToken)
        {
            var worker = await _context.Workers.FindAsync(new object[] { request.UserId }, cancellationToken);

            if (worker == null)
            {
                return null;
            }

            return new WorkerDto
            {
                Id = worker.Id,
                Name = worker.Name,
                Email = worker.Email,
                Role = worker.Role,
                IsAvailable = worker.IsAvailable,
                IsOnShift = worker.IsOnShift,
                PhotoUrl = _photos.GetReadUrl(worker.PhotoPath)
            };
        }
    }
}
