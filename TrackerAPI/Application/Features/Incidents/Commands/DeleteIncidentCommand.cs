using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class DeleteIncidentCommand : IRequest<bool>
    {
        public Guid Id { get; set; }

        public DeleteIncidentCommand(Guid id)
        {
            Id = id;
        }
    }

    public class DeleteIncidentCommandHandler : IRequestHandler<DeleteIncidentCommand, bool>
    {
        private readonly ApplicationDbContext _context;
        private readonly IIncidentNotifier _notifier;

        public DeleteIncidentCommandHandler(ApplicationDbContext context, IIncidentNotifier notifier)
        {
            _context = context;
            _notifier = notifier;
        }

        public async Task<bool> Handle(DeleteIncidentCommand request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents.FindAsync(new object[] { request.Id }, cancellationToken);
            if (incident == null)
            {
                return false;
            }

            _context.Incidents.Remove(incident);
            await _context.SaveChangesAsync(cancellationToken);

            // Tell every dashboard to drop the card for the now-deleted incident.
            await _notifier.IncidentDeletedAsync(incident.Id, cancellationToken);

            return true;
        }
    }
}
