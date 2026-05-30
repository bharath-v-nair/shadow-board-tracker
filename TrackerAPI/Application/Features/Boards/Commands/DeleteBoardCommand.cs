using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    public class DeleteBoardCommand : IRequest<bool>
    {
        public Guid Id { get; set; }

        public DeleteBoardCommand(Guid id)
        {
            Id = id;
        }
    }

    public class DeleteBoardCommandHandler : IRequestHandler<DeleteBoardCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public DeleteBoardCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteBoardCommand request, CancellationToken cancellationToken)
        {
            var board = await _context.Boards.FindAsync(new object[] { request.Id }, cancellationToken);
            
            if (board == null) return false;

            _context.Boards.Remove(board);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}