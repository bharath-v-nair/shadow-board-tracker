using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    public class PatchBoardQrConfigCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
        public UpdateQrConfigDto Dto { get; set; }

        public PatchBoardQrConfigCommand(Guid id, UpdateQrConfigDto dto)
        {
            Id = id;
            Dto = dto;
        }
    }

    public class PatchBoardQrConfigCommandHandler : IRequestHandler<PatchBoardQrConfigCommand, bool>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public PatchBoardQrConfigCommandHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> Handle(PatchBoardQrConfigCommand request, CancellationToken cancellationToken)
        {
            var board = await _context.Boards.FindAsync(new object[] { request.Id }, cancellationToken);

            if (board == null) return false;

            board.QrConfig = request.Dto.QrConfig;

            await _context.SaveChangesAsync(cancellationToken);

            await _cache.RemoveAsync(CacheKeys.BoardsAll, CacheKeys.Board(board.Id));
            return true;
        }
    }
}