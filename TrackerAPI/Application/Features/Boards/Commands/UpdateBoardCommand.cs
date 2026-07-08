using MediatR;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    // The Message (Returns true if successful, false if not found)
    public class UpdateBoardCommand : IRequest<bool>
    {
        public UpdateBoardDto Dto { get; set; }

        public UpdateBoardCommand(UpdateBoardDto dto)
        {
            Dto = dto;
        }
    }

    // The Handler
    public class UpdateBoardCommandHandler : IRequestHandler<UpdateBoardCommand, bool>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public UpdateBoardCommandHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> Handle(UpdateBoardCommand request, CancellationToken cancellationToken)
        {
            var board = await _context.Boards.FindAsync(new object[] { request.Dto.Id }, cancellationToken);

            if (board == null) return false;

            board.Name = request.Dto.Name;
            board.Location = request.Dto.Location;
            board.QrConfig = request.Dto.QrConfig;

            await _context.SaveChangesAsync(cancellationToken);

            // Evict both the list and this board's own entry so the next read is fresh.
            await _cache.RemoveAsync(CacheKeys.BoardsAll, CacheKeys.Board(board.Id));
            return true;
        }
    }
}