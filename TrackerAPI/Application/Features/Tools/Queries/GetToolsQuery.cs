using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Tools.Queries
{
    public class GetToolsQuery : IRequest<IEnumerable<ToolDto>>
    {
        public Guid? BoardId { get; set; }

        public GetToolsQuery(Guid? boardId)
        {
            BoardId = boardId;
        }
    }

    public class GetToolsQueryHandler : IRequestHandler<GetToolsQuery, IEnumerable<ToolDto>>
    {
        private readonly ApplicationDbContext _context;

        public GetToolsQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ToolDto>> Handle(GetToolsQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tools.AsQueryable();
            if (request.BoardId.HasValue)
                query = query.Where(t => t.BoardId == request.BoardId.Value);

            var tools = await query.ToListAsync(cancellationToken);
            return tools.Select(t => new ToolDto
            {
                Id = t.Id,
                Name = t.Name,
                Type = t.Type,
                IconName = t.IconName,
                Condition = t.Condition,
                BoardId = t.BoardId
            }).ToList();
        }
    }
}
