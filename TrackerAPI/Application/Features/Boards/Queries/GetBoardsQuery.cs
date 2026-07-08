using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

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
        private readonly ICacheService _cache;

        // Dependency Injection: Give me the database and the cache!
        public GetBoardsQueryHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        // Cache-aside: serve boards:all from cache; on a miss, read the DB, project the
        // DTOs and populate the cache. The board list changes rarely and is read on every
        // dashboard load — a textbook thing to cache.
        public async Task<IEnumerable<BoardDto>> Handle(GetBoardsQuery request, CancellationToken cancellationToken)
        {
            return await _cache.GetOrCreateAsync(
                CacheKeys.BoardsAll,
                CacheKeys.DefaultTtl,
                async () =>
                {
                    var boards = await _context.Boards.ToListAsync(cancellationToken);

                    return boards.Select(b => new BoardDto
                    {
                        Id = b.Id,
                        Name = b.Name,
                        Location = b.Location,
                        QrConfig = b.QrConfig
                    }).ToList();
                },
                cancellationToken);
        }
    }
}