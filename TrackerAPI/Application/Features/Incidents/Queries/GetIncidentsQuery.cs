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
    public class GetIncidentsQuery : IRequest<IEnumerable<IncidentDto>> { }

    public class GetIncidentsQueryHandler : IRequestHandler<GetIncidentsQuery, IEnumerable<IncidentDto>>
    {
        private readonly ApplicationDbContext _context;

        public GetIncidentsQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<IncidentDto>> Handle(GetIncidentsQuery request, CancellationToken cancellationToken)
        {
            var incidents = await _context.Incidents
                .Include(i => i.Reporter)
                .Include(i => i.Worker)
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
                ReporterName = i.Reporter?.Name,
                WorkerName = i.Worker?.Name
            }).ToList();
        }
    }
}
