using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Incidents.Commands
{
    public class CreateIncidentResult
    {
        public IncidentDto Incident { get; set; }
        public string ErrorMessage { get; set; }
        public bool IsUnauthorized { get; set; }
        public bool IsSuccess => string.IsNullOrEmpty(ErrorMessage) && !IsUnauthorized;
    }

    public class CreateIncidentCommand : IRequest<CreateIncidentResult>
    {
        public CreateIncidentDto Dto { get; set; }
        public string ReporterIdClaim { get; set; }
        public string BaseUrl { get; set; }

        public CreateIncidentCommand(CreateIncidentDto dto, string reporterIdClaim, string baseUrl)
        {
            Dto = dto;
            ReporterIdClaim = reporterIdClaim;
            BaseUrl = baseUrl;
        }
    }

    public class CreateIncidentCommandHandler : IRequestHandler<CreateIncidentCommand, CreateIncidentResult>
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<CreateIncidentCommandHandler> _logger;
        private readonly IIncidentNotifier _notifier;

        public CreateIncidentCommandHandler(ApplicationDbContext context, IEmailService emailService, ILogger<CreateIncidentCommandHandler> logger, IIncidentNotifier notifier)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
            _notifier = notifier;
        }

        public async Task<CreateIncidentResult> Handle(CreateIncidentCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(request.ReporterIdClaim) || !Guid.TryParse(request.ReporterIdClaim, out var reporterId))
            {
                return new CreateIncidentResult { IsUnauthorized = true, ErrorMessage = "Invalid token claims." };
            }

            var existingIncident = await _context.Incidents
                .AnyAsync(i => i.ToolId == request.Dto.ToolId && 
                              (i.Status == IncidentStatus.Open || i.Status == IncidentStatus.PendingReview), cancellationToken);

            if (existingIncident)
            {
                return new CreateIncidentResult { ErrorMessage = "An active incident already exists for this tool." };
            }

            var incident = new Incident
            {
                Id = Guid.NewGuid(),
                ToolId = request.Dto.ToolId,
                WorkerId = request.Dto.WorkerId,
                ReporterId = reporterId,
                Status = request.Dto.Status,
                ReportedAt = DateTime.UtcNow
            };

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync(cancellationToken);

            // Push the new incident to every connected dashboard so the card appears live.
            await _notifier.IncidentChangedAsync(incident.Id, cancellationToken);

            try
            {
                var worker = await _context.Workers.FindAsync(new object[] { incident.WorkerId }, cancellationToken);
                var reporter = await _context.Workers.FindAsync(new object[] { incident.ReporterId }, cancellationToken);
                var tool = await _context.Tools.FindAsync(new object[] { incident.ToolId }, cancellationToken);
                var board = tool != null ? await _context.Boards.FindAsync(new object[] { tool.BoardId }, cancellationToken) : null;

                if (worker != null && tool != null && board != null)
                {
                    var subject = "New Task Assigned: Missing Tool";
                    var link = $"{request.BaseUrl}/incident/{incident.Id}";
                    var body = $"<p>A new missing tool incident has been assigned to you.</p>" +
                               $"<p><strong>Tool:</strong> {tool.Name}</p>" +
                               $"<p><strong>Board:</strong> {board.Name}</p>" +
                               $"<p><strong>Reported By:</strong> {reporter?.Name ?? "Unknown"}</p>" +
                               $"<p><a href='{link}'>Click here to view and resolve the incident</a></p>";

                    await _emailService.SendEmailAsync(worker.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send assignment email for incident {IncidentId}", incident.Id);
            }

            return new CreateIncidentResult
            {
                Incident = new IncidentDto
                {
                    Id = incident.Id,
                    ToolId = incident.ToolId,
                    WorkerId = incident.WorkerId,
                    ReporterId = incident.ReporterId,
                    ReportedAt = incident.ReportedAt,
                    ResolvedAt = incident.ResolvedAt,
                    Status = incident.Status
                }
            };
        }
    }
}
