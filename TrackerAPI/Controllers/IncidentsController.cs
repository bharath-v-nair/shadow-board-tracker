using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerAPI.Data;
using TrackerAPI.Models;
using TrackerAPI.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IncidentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<IncidentsController> _logger;

        public IncidentsController(ApplicationDbContext context, IEmailService emailService, ILogger<IncidentsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<IncidentDto>>> GetIncidents()
        {
            var incidents = await _context.Incidents.ToListAsync();
            return incidents.Select(i => new IncidentDto
            {
                Id = i.Id,
                ToolId = i.ToolId,
                WorkerId = i.WorkerId,
                ReportedAt = i.ReportedAt,
                ResolvedAt = i.ResolvedAt,
                Status = i.Status
            }).ToList();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<IncidentDto>> GetIncident(Guid id)
        {
            var incident = await _context.Incidents.FindAsync(id);

            if (incident == null)
            {
                return NotFound();
            }

            var tool = await _context.Tools.FindAsync(incident.ToolId);
            var board = tool != null ? await _context.Boards.FindAsync(tool.BoardId) : null;

            return new IncidentDto
            {
                Id = incident.Id,
                ToolId = incident.ToolId,
                WorkerId = incident.WorkerId,
                ReportedAt = incident.ReportedAt,
                ResolvedAt = incident.ResolvedAt,
                Status = incident.Status,
                ToolName = tool?.Name,
                BoardName = board?.Name
            };
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<IncidentDto>> PostIncident(CreateIncidentDto createIncidentDto)
        {
            var incident = new Incident
            {
                Id = Guid.NewGuid(),
                ToolId = createIncidentDto.ToolId,
                WorkerId = createIncidentDto.WorkerId,
                Status = createIncidentDto.Status,
                ReportedAt = DateTime.UtcNow
            };

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync();

            try
            {
                var worker = await _context.Workers.FindAsync(incident.WorkerId);
                var tool = await _context.Tools.FindAsync(incident.ToolId);
                var board = tool != null ? await _context.Boards.FindAsync(tool.BoardId) : null;

                if (worker != null && tool != null && board != null)
                {
                    var subject = "New Task Assigned: Missing Tool";
                    var link = $"http://localhost:4200/incident/{incident.Id}";
                    var body = $"<p>A new missing tool incident has been assigned to you.</p>" +
                               $"<p><strong>Tool:</strong> {tool.Name}</p>" +
                               $"<p><strong>Board:</strong> {board.Name}</p>" +
                               $"<p><a href='{link}'>Click here to view and resolve the incident</a></p>";

                    await _emailService.SendEmailAsync(worker.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send assignment email for incident {IncidentId}", incident.Id);
            }

            var incidentDto = new IncidentDto
            {
                Id = incident.Id,
                ToolId = incident.ToolId,
                WorkerId = incident.WorkerId,
                ReportedAt = incident.ReportedAt,
                ResolvedAt = incident.ResolvedAt,
                Status = incident.Status
            };

            return CreatedAtAction(nameof(GetIncident), new { id = incident.Id }, incidentDto);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutIncident(Guid id, UpdateIncidentDto updateIncidentDto)
        {
            if (id != updateIncidentDto.Id)
            {
                return BadRequest();
            }

            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound();
            }

            incident.ResolvedAt = updateIncidentDto.ResolvedAt;
            incident.Status = updateIncidentDto.Status;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIncident(Guid id)
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound();
            }

            _context.Incidents.Remove(incident);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [AllowAnonymous]
        [HttpPatch("{id}/resolve")]
        public async Task<IActionResult> ResolveIncident(Guid id)
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound();
            }

            if (incident.Status != IncidentStatus.Open)
            {
                return BadRequest("Incident is not open.");
            }

            incident.Status = IncidentStatus.PendingReview;
            incident.ResolvedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
