using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class ResolveIncidentResult
    {
        public bool IsSuccess { get; set; }
        public bool NotFound { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class ResolveIncidentCommand : IRequest<ResolveIncidentResult>
    {
        public Guid Id { get; set; }

        public ResolveIncidentCommand(Guid id)
        {
            Id = id;
        }
    }

    public class ResolveIncidentCommandHandler : IRequestHandler<ResolveIncidentCommand, ResolveIncidentResult>
    {
        private readonly ApplicationDbContext _context;

        public ResolveIncidentCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ResolveIncidentResult> Handle(ResolveIncidentCommand request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents.FindAsync(new object[] { request.Id }, cancellationToken);
            if (incident == null)
            {
                return new ResolveIncidentResult { NotFound = true };
            }

            if (incident.Status != IncidentStatus.Open)
            {
                return new ResolveIncidentResult { ErrorMessage = "Incident is not open." };
            }

            incident.Status = IncidentStatus.PendingReview;
            incident.ResolvedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return new ResolveIncidentResult { IsSuccess = true };
        }
    }
}
