using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Incidents.Queries
{
    public class GetAllIncidentsQuery : IRequest<IEnumerable<IncidentDto>> { }

    public class GetAllIncidentsQueryHandler : IRequestHandler<GetAllIncidentsQuery, IEnumerable<IncidentDto>>
    {
        private readonly ApplicationDbContext _context;

        public GetAllIncidentsQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<IncidentDto>> Handle(GetAllIncidentsQuery request, CancellationToken cancellationToken)
        {
            var incidents = await _context.Incidents
                .Include(i => i.Tool).ThenInclude(t => t.Board)
                .Include(i => i.Reporter)
                .Include(i => i.Worker)
                .OrderByDescending(i => i.ReportedAt)
                .ToListAsync(cancellationToken);

            return incidents.Select(i => new IncidentDto
            {
                Id = i.Id,
                ToolId = i.ToolId,
                WorkerId = i.WorkerId,
                ReporterId = i.ReporterId,
                ReportedAt = i.ReportedAt,
                ResolvedAt = i.ResolvedAt,
                Status = i.Status,
                ToolName = i.Tool?.Name,
                BoardName = i.Tool?.Board?.Name,
                ReporterName = i.Reporter?.Name,
                WorkerName = i.Worker?.Name,
                BoardId = i.Tool?.BoardId
            }).ToList();
        }
    }
}
