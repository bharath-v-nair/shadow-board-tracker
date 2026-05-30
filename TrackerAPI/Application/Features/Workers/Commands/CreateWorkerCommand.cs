using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Workers.Commands
{
    public class CreateWorkerCommand : IRequest<WorkerDto>
    {
        public CreateWorkerDto CreateWorkerDto { get; set; }

        public CreateWorkerCommand(CreateWorkerDto createWorkerDto)
        {
            CreateWorkerDto = createWorkerDto;
        }
    }

    public class CreateWorkerCommandHandler : IRequestHandler<CreateWorkerCommand, WorkerDto>
    {
        private readonly ApplicationDbContext _context;

        public CreateWorkerCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<WorkerDto> Handle(CreateWorkerCommand request, CancellationToken cancellationToken)
        {
            var worker = new Worker
            {
                Id = Guid.NewGuid(),
                Name = request.CreateWorkerDto.Name,
                Email = request.CreateWorkerDto.Email,
                IsAvailable = request.CreateWorkerDto.IsAvailable
            };

            _context.Workers.Add(worker);
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
