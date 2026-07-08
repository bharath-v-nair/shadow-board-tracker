using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

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
        private readonly ICacheService _cache;

        public DeleteToolCommandHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> Handle(DeleteToolCommand request, CancellationToken cancellationToken)
        {
            var tool = await _context.Tools.FindAsync(new object[] { request.Id }, cancellationToken);
            if (tool == null)
            {
                return false;
            }

            var boardId = tool.BoardId;

            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync(cancellationToken);

            await _cache.RemoveAsync(
                CacheKeys.BoardsAll,
                CacheKeys.Board(boardId),
                CacheKeys.ToolNames,
                CacheKeys.ToolTypes);
            return true;
        }
    }
}
