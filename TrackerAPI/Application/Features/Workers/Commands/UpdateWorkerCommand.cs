using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Workers.Commands
{
    public class UpdateWorkerCommand : IRequest<bool>
    {
        public UpdateWorkerDto UpdateWorkerDto { get; set; }

        public UpdateWorkerCommand(UpdateWorkerDto updateWorkerDto)
        {
            UpdateWorkerDto = updateWorkerDto;
        }
    }

    public class UpdateWorkerCommandHandler : IRequestHandler<UpdateWorkerCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public UpdateWorkerCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateWorkerCommand request, CancellationToken cancellationToken)
        {
            var worker = await _context.Workers.FindAsync(new object[] { request.UpdateWorkerDto.Id }, cancellationToken);
            if (worker == null)
            {
                return false;
            }

            worker.Name = request.UpdateWorkerDto.Name;
            worker.Email = request.UpdateWorkerDto.Email;
            worker.IsAvailable = request.UpdateWorkerDto.IsAvailable;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
