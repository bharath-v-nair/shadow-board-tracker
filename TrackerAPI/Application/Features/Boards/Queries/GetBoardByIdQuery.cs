using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

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
        private readonly ICacheService _cache;

        public GetBoardByIdQueryHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<BoardDto?> Handle(GetBoardByIdQuery request, CancellationToken cancellationToken)
        {
            // Cache-aside per board id. A "not found" (null) is intentionally NOT cached as a
            // hit — GetOrCreateAsync treats a null value as a miss — so we avoid negative
            // caching (a board created moments later would otherwise appear missing for a TTL).
            return await _cache.GetOrCreateAsync(
                CacheKeys.Board(request.Id),
                CacheKeys.DefaultTtl,
                async () =>
                {
                    var board = await _context.Boards.FindAsync(new object[] { request.Id }, cancellationToken);

                    if (board == null)
                    {
                        return null; // Controller maps this to 404 NotFound.
                    }

                    return new BoardDto
                    {
                        Id = board.Id,
                        Name = board.Name,
                        Location = board.Location,
                        QrConfig = board.QrConfig
                    };
                },
                cancellationToken);
        }
    }
}