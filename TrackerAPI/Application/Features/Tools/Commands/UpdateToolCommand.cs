using MediatR;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Tools.Commands
{
    public class UpdateToolCommand : IRequest<bool>
    {
        public UpdateToolDto Dto { get; set; }

        public UpdateToolCommand(UpdateToolDto dto)
        {
            Dto = dto;
        }
    }

    public class UpdateToolCommandHandler : IRequestHandler<UpdateToolCommand, bool>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public UpdateToolCommandHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> Handle(UpdateToolCommand request, CancellationToken cancellationToken)
        {
            var tool = await _context.Tools.FindAsync(new object[] { request.Dto.Id }, cancellationToken);
            if (tool == null)
            {
                return false;
            }

            // Capture the board the tool is leaving: a move must invalidate BOTH boards.
            var originalBoardId = tool.BoardId;

            tool.Name = request.Dto.Name;
            tool.Type = request.Dto.Type;
            tool.IconName = request.Dto.IconName;
            tool.Condition = request.Dto.Condition;
            tool.BoardId = request.Dto.BoardId;

            await _context.SaveChangesAsync(cancellationToken);

            await _cache.RemoveAsync(
                CacheKeys.BoardsAll,
                CacheKeys.Board(originalBoardId),
                CacheKeys.Board(tool.BoardId),
                CacheKeys.ToolNames,
                CacheKeys.ToolTypes);
            return true;
        }
    }
}
