using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Workers.Queries
{
    public class GetWorkerByIdQuery : IRequest<WorkerDto?>
    {
        public Guid Id { get; set; }

        public GetWorkerByIdQuery(Guid id)
        {
            Id = id;
        }
    }

    public class GetWorkerByIdQueryHandler : IRequestHandler<GetWorkerByIdQuery, WorkerDto?>
    {
        private readonly ApplicationDbContext _context;

        public GetWorkerByIdQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<WorkerDto?> Handle(GetWorkerByIdQuery request, CancellationToken cancellationToken)
        {
            var worker = await _context.Workers.FindAsync(new object[] { request.Id }, cancellationToken);

            if (worker == null)
            {
                return null;
            }

            return new WorkerDto
            {
                Id = worker.Id,
                Name = worker.Name,
                Email = worker.Email,
                IsAvailable = worker.IsAvailable,
                IsOnShift = worker.IsOnShift
            };
        }
    }
}
