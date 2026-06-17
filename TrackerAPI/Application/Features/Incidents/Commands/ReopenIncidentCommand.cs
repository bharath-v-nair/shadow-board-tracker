using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class ReopenIncidentResult
    {
        public bool IsSuccess { get; set; }
        public bool NotFound { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class ReopenIncidentCommand : IRequest<ReopenIncidentResult>
    {
        public Guid Id { get; set; }
        public string BaseUrl { get; set; }

        public ReopenIncidentCommand(Guid id, string baseUrl)
        {
            Id = id;
            BaseUrl = baseUrl;
        }
    }

    public class ReopenIncidentCommandHandler : IRequestHandler<ReopenIncidentCommand, ReopenIncidentResult>
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<ReopenIncidentCommandHandler> _logger;
        private readonly IIncidentNotifier _notifier;

        public ReopenIncidentCommandHandler(ApplicationDbContext context, IEmailService emailService, ILogger<ReopenIncidentCommandHandler> logger, IIncidentNotifier notifier)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
            _notifier = notifier;
        }

        public async Task<ReopenIncidentResult> Handle(ReopenIncidentCommand request, CancellationToken cancellationToken)
        {
            var incident = await _context.Incidents
                .Include(i => i.Worker)
                .Include(i => i.Reporter)
                .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);
                
            if (incident == null)
            {
                return new ReopenIncidentResult { NotFound = true };
            }

            if (incident.Status != IncidentStatus.PendingReview)
            {
                return new ReopenIncidentResult { ErrorMessage = "Incident is not pending review." };
            }

            incident.Status = IncidentStatus.Open;
            incident.ResolvedAt = null;

            await _context.SaveChangesAsync(cancellationToken);

            // Live-move the card back into "Alerts" on every dashboard.
            await _notifier.IncidentChangedAsync(incident.Id, cancellationToken);

            try
            {
                var tool = await _context.Tools.FindAsync(new object[] { incident.ToolId }, cancellationToken);
                var board = tool != null ? await _context.Boards.FindAsync(new object[] { tool.BoardId }, cancellationToken) : null;
                var worker = incident.Worker;
                var reporter = incident.Reporter;

                if (worker != null && tool != null && board != null)
                {
                    var subject = $"Action Required: QA Rejected Resolution for {tool.Name}";
                    var link = $"{request.BaseUrl}/incident/{incident.Id}";
                    var body = $"<p>A QA inspector has reviewed your resolution and rejected it. The tool is still missing.</p>" +
                               $"<p><strong>Tool:</strong> {tool.Name}</p>" +
                               $"<p><strong>Board:</strong> {board.Name}</p>" +
                               $"<p><strong>Rejected By:</strong> {reporter?.Name ?? "Unknown"}</p>" +
                               $"<p><a href='{link}'>Click here to view and resolve the incident again</a></p>";

                    await _emailService.SendEmailAsync(worker.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send rejection email for incident {IncidentId}", incident.Id);
            }

            return new ReopenIncidentResult { IsSuccess = true };
        }
    }
}
