using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;

namespace TrackerAPI.Application.Features.Workers.Commands
{
    public class DeleteWorkerCommand : IRequest<bool>
    {
        public Guid Id { get; set; }

        public DeleteWorkerCommand(Guid id)
        {
            Id = id;
        }
    }

    public class DeleteWorkerCommandHandler : IRequestHandler<DeleteWorkerCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public DeleteWorkerCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteWorkerCommand request, CancellationToken cancellationToken)
        {
            var worker = await _context.Workers.FindAsync(new object[] { request.Id }, cancellationToken);
            if (worker == null)
            {
                return false;
            }

            _context.Workers.Remove(worker);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
