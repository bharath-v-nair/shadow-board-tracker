using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

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

        public UpdateIncidentCommandHandler(ApplicationDbContext context)
        {
            _context = context;
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

            return true;
        }
    }
}
