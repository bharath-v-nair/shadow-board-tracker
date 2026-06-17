using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class VerifyIncidentResult
    {
        public bool IsSuccess { get; set; }
        public bool NotFound { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class VerifyIncidentCommand : IRequest<VerifyIncidentResult>
    {
        public Guid Id { get; set; }

        public VerifyIncidentCommand(Guid id)
        {
            Id = id;
        }
    }

    public class VerifyIncidentCommandHandler : IRequestHandler<VerifyIncidentCommand, VerifyIncidentResult>
    {
        private readonly ApplicationDbContext _context;
        private readonly IIncidentNotifier _notifier;

        public VerifyIncidentCommandHandler(ApplicationDbContext context, IIncidentNotifier notifier)
        {
            _context = context;
            _notifier = notifier;
        }

        public async Task<VerifyIncidentResult> Handle(VerifyIncidentCommand request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents.FindAsync(new object[] { request.Id }, cancellationToken);
            if (incident == null)
            {
                return new VerifyIncidentResult { NotFound = true };
            }

            if (incident.Status != IncidentStatus.PendingReview)
            {
                return new VerifyIncidentResult { ErrorMessage = "Incident is not pending review." };
            }

            incident.Status = IncidentStatus.Resolved;

            await _context.SaveChangesAsync(cancellationToken);

            // Live-move the card into "History" on every dashboard.
            await _notifier.IncidentChangedAsync(incident.Id, cancellationToken);

            return new VerifyIncidentResult { IsSuccess = true };
        }
    }
}
