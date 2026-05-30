using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Boards.Queries
{
    // 1. The Message (Now it carries data!)
    public class GetBoardByIdQuery : IRequest<BoardDto?>
    {
        public Guid Id { get; set; }

        public GetBoardByIdQuery(Guid id)
        {
            Id = id;
        }
    }

    // 2. The Handler
    public class GetBoardByIdQueryHandler : IRequestHandler<GetBoardByIdQuery, BoardDto?>
    {
        private readonly ApplicationDbContext _context;

        public GetBoardByIdQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<BoardDto?> Handle(GetBoardByIdQuery request, CancellationToken cancellationToken)
        {
            // We use request.Id to pull the ID out of the incoming message
            var board = await _context.Boards.FindAsync(new object[] { request.Id }, cancellationToken);

            if (board == null)
            {
                return null; // We return null, and let the Controller handle returning the 404 NotFound
            }

            return new BoardDto
            {
                Id = board.Id,
                Name = board.Name,
                Location = board.Location,
                QrConfig = board.QrConfig
            };
        }
    }
}