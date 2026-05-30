using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;

namespace TrackerAPI.Application.Features.Tools.Commands
{
    public class DeleteToolCommand : IRequest<bool>
    {
        public Guid Id { get; set; }

        public DeleteToolCommand(Guid id)
        {
            Id = id;
        }
    }

    public class DeleteToolCommandHandler : IRequestHandler<DeleteToolCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public DeleteToolCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteToolCommand request, CancellationToken cancellationToken)
        {
            var tool = await _context.Tools.FindAsync(new object[] { request.Id }, cancellationToken);
            if (tool == null)
            {
                return false;
            }

            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
