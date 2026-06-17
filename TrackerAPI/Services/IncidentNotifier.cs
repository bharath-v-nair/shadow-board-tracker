using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Hubs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Services
{
    /// <summary>
    /// Default IIncidentNotifier: re-projects the changed incident into the SAME enriched
    /// IncidentDto shape GetAllIncidentsQuery returns, then fans it out to all clients.
    ///
    /// ApplicationDbContext is scoped, so within a request this is the SAME instance the
    /// handler just saved with — the re-load sees the committed change. IHubContext is a
    /// singleton and is the correct way to broadcast from outside the hub itself.
    /// </summary>
    public class IncidentNotifier : IIncidentNotifier
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<IncidentHub> _hub;

        public IncidentNotifier(ApplicationDbContext context, IHubContext<IncidentHub> hub)
        {
            _context = context;
            _hub = hub;
        }

        public async Task IncidentChangedAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking: this is a read purely to build the broadcast payload; it must not
            // interfere with the change tracker of the handler that just saved.
            var dto = await _context.Incidents
                .AsNoTracking()
                .Include(i => i.Tool).ThenInclude(t => t.Board)
                .Include(i => i.Reporter)
                .Include(i => i.Worker)
                .Where(i => i.Id == id)
                .Select(i => new IncidentDto
                {
                    Id = i.Id,
                    ToolId = i.ToolId,
                    WorkerId = i.WorkerId,
                    ReporterId = i.ReporterId,
                    ReportedAt = i.ReportedAt,
                    ResolvedAt = i.ResolvedAt,
                    Status = i.Status,
                    ToolName = i.Tool != null ? i.Tool.Name : null,
                    BoardName = i.Tool != null && i.Tool.Board != null ? i.Tool.Board.Name : null,
                    ReporterName = i.Reporter != null ? i.Reporter.Name : null,
                    WorkerName = i.Worker != null ? i.Worker.Name : null,
                    BoardId = i.Tool != null ? i.Tool.BoardId : (Guid?)null
                })
                .FirstOrDefaultAsync(cancellationToken);

            // Defensive: if the row vanished between save and broadcast, there is nothing to push.
            if (dto is null)
            {
                return;
            }

            await _hub.Clients.All.SendAsync(IncidentHub.IncidentChangedEvent, dto, cancellationToken);
        }

        public Task IncidentDeletedAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return _hub.Clients.All.SendAsync(IncidentHub.IncidentDeletedEvent, id, cancellationToken);
        }
    }
}
