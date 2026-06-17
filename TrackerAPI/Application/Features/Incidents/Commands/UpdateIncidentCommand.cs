using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class UpdateIncidentCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
        public UpdateIncidentDto Dto { get; set; }

        public UpdateIncidentCommand(Guid id, UpdateIncidentDto dto)
        {
            Id = id;
            Dto = dto;
        }
    }

    public class UpdateIncidentCommandHandler : IRequestHandler<UpdateIncidentCommand, bool>
    {
        private readonly ApplicationDbContext _context;
        private readonly IIncidentNotifier _notifier;

        public UpdateIncidentCommandHandler(ApplicationDbContext context, IIncidentNotifier notifier)
        {
            _context = context;
            _notifier = notifier;
        }

        public async Task<bool> Handle(UpdateIncidentCommand request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents.FindAsync(new object[] { request.Id }, cancellationToken);
            if (incident == null)
            {
                return false;
            }

            incident.ResolvedAt = request.Dto.ResolvedAt;
            incident.Status = request.Dto.Status;

            await _context.SaveChangesAsync(cancellationToken);

            // Push the edited incident so dashboards re-slice into the correct tab live.
            await _notifier.IncidentChangedAsync(incident.Id, cancellationToken);

            return true;
        }
    }
}
