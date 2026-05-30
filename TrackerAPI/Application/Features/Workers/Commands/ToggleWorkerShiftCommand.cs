using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Workers.Commands
{
    public class ToggleWorkerShiftCommand : IRequest<WorkerDto?>
    {
        public Guid Id { get; set; }

        public ToggleWorkerShiftCommand(Guid id)
        {
            Id = id;
        }
    }

    public class ToggleWorkerShiftCommandHandler : IRequestHandler<ToggleWorkerShiftCommand, WorkerDto?>
    {
        private readonly ApplicationDbContext _context;

        public ToggleWorkerShiftCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<WorkerDto?> Handle(ToggleWorkerShiftCommand request, CancellationToken cancellationToken)
        {
            var worker = await _context.Workers.FindAsync(new object[] { request.Id }, cancellationToken);
            if (worker == null)
            {
                return null;
            }

            worker.IsOnShift = !worker.IsOnShift;
            await _context.SaveChangesAsync(cancellationToken);

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
