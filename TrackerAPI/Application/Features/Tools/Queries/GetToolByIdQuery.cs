using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Tools.Queries
{
    public class GetToolByIdQuery : IRequest<ToolDto?>
    {
        public Guid Id { get; set; }

        public GetToolByIdQuery(Guid id)
        {
            Id = id;
        }
    }

    public class GetToolByIdQueryHandler : IRequestHandler<GetToolByIdQuery, ToolDto?>
    {
        private readonly ApplicationDbContext _context;

        public GetToolByIdQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ToolDto?> Handle(GetToolByIdQuery request, CancellationToken cancellationToken)
        {
            var tool = await _context.Tools.FindAsync(new object[] { request.Id }, cancellationToken);

            if (tool == null)
            {
                return null;
            }

            return new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Type = tool.Type,
                IconName = tool.IconName,
                Condition = tool.Condition,
                BoardId = tool.BoardId
            };
        }
    }
}
