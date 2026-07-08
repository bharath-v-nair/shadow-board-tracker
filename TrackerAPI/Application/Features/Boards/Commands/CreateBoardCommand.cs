using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    // 1. The Message (Carries the payload from the Frontend)
    public class CreateBoardCommand : IRequest<BoardDto>
    {
        public CreateBoardDto Dto { get; set; }

        public CreateBoardCommand(CreateBoardDto dto)
        {
            Dto = dto;
        }
    }

    // 2. The Handler (Modifies the database)
    public class CreateBoardCommandHandler : IRequestHandler<CreateBoardCommand, BoardDto>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public CreateBoardCommandHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<BoardDto> Handle(CreateBoardCommand request, CancellationToken cancellationToken)
        {
            // 1. Map the DTO to the real Entity
            var board = new Board
            {
                Id = Guid.NewGuid(),
                Name = request.Dto.Name,
                Location = request.Dto.Location,
                QrConfig = request.Dto.QrConfig
            };

            // 2. Save it to the database
            _context.Boards.Add(board);
            await _context.SaveChangesAsync(cancellationToken);

            // 2b. Invalidate the board caches AFTER the write commits. The write path owns
            // invalidation because it is the only place that knows what changed — this is the
            // clean-architecture reason cache-aside lives in the CQRS command handlers.
            await _cache.RemoveAsync(CacheKeys.BoardsAll, CacheKeys.Board(board.Id));

            // 3. Map the Entity back to a DTO to return to the frontend
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