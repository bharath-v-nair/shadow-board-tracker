using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Boards.Queries
{
    // 1. The "Message" (The Query)
    public class GetBoardsQuery : IRequest<IEnumerable<BoardDto>>
    {
    }

    // 2. The "Postman" (The Handler)
    public class GetBoardsQueryHandler : IRequestHandler<GetBoardsQuery, IEnumerable<BoardDto>>
    {
        private readonly ApplicationDbContext _context;

        // Dependency Injection: Give me the database!
        public GetBoardsQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        // The actual business logic
        public async Task<IEnumerable<BoardDto>> Handle(GetBoardsQuery request, CancellationToken cancellationToken)
        {
            var boards = await _context.Boards.ToListAsync(cancellationToken);
            
            return boards.Select(b => new BoardDto
            {
                Id = b.Id,
                Name = b.Name,
                Location = b.Location,
                QrConfig = b.QrConfig
            }).ToList();
        }
    }
}