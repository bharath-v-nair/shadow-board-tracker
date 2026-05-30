using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Incidents.Queries
{
    public class GetIncidentByIdQuery : IRequest<IncidentDto>
    {
        public Guid Id { get; set; }

        public GetIncidentByIdQuery(Guid id)
        {
            Id = id;
        }
    }

    public class GetIncidentByIdQueryHandler : IRequestHandler<GetIncidentByIdQuery, IncidentDto>
    {
        private readonly ApplicationDbContext _context;

        public GetIncidentByIdQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IncidentDto> Handle(GetIncidentByIdQuery request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents
                .Include(i => i.Reporter)
                .Include(i => i.Worker)
                .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);

            if (incident == null)
            {
                return null;
            }

            var tool = await _context.Tools.FindAsync(new object[] { incident.ToolId }, cancellationToken);
            var board = tool != null ? await _context.Boards.FindAsync(new object[] { tool.BoardId }, cancellationToken) : null;

            return new IncidentDto
            {
                Id = incident.Id,
                ToolId = incident.ToolId,
                WorkerId = incident.WorkerId,
                ReporterId = incident.ReporterId,
                ReportedAt = incident.ReportedAt,
                ResolvedAt = incident.ResolvedAt,
                Status = incident.Status,
                ToolName = tool?.Name,
                BoardName = board?.Name,
                ReporterName = incident.Reporter?.Name,
                WorkerName = incident.Worker?.Name
            };
        }
    }
}
