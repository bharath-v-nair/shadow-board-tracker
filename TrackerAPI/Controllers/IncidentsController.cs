using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerAPI.Data;
using TrackerAPI.Models;
using TrackerAPI.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace TrackerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IncidentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public IncidentsController(ApplicationDbContext context)
        {
            _context = context;
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

            return new IncidentDto
            {
                Id = incident.Id,
                ToolId = incident.ToolId,
                WorkerId = incident.WorkerId,
                ReportedAt = incident.ReportedAt,
                ResolvedAt = incident.ResolvedAt,
                Status = incident.Status
            };
        }

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
    }
}
