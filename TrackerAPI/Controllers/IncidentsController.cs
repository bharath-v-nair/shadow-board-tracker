using Microsoft.AspNetCore.Mvc;
using TrackerAPI.DTOs;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using TrackerAPI.Application.Features.Incidents.Queries;
using TrackerAPI.Application.Features.Incidents.Commands;

namespace TrackerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IncidentsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public IncidentsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<IncidentDto>>> GetIncidents()
        {
            var incidents = await _mediator.Send(new GetIncidentsQuery());
            return Ok(incidents);
        }

        [Authorize(Roles = "QA,DemoViewer")]
        [HttpGet("all")]
        public async Task<ActionResult<IEnumerable<IncidentDto>>> GetAllIncidents()
        {
            var incidents = await _mediator.Send(new GetAllIncidentsQuery());
            return Ok(incidents);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<IncidentDto>> GetIncident(Guid id)
        {
            var incident = await _mediator.Send(new GetIncidentByIdQuery(id));

            if (incident == null)
            {
                return NotFound();
            }

            return Ok(incident);
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<IncidentDto>> PostIncident(CreateIncidentDto createIncidentDto)
        {
            var reporterIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            
            var result = await _mediator.Send(new CreateIncidentCommand(createIncidentDto, reporterIdClaim, baseUrl));

            if (result.IsUnauthorized)
            {
                return Unauthorized(result.ErrorMessage);
            }
            if (!result.IsSuccess)
            {
                return BadRequest(result.ErrorMessage);
            }

            return CreatedAtAction(nameof(GetIncident), new { id = result.Incident.Id }, result.Incident);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutIncident(Guid id, UpdateIncidentDto updateIncidentDto)
        {
            if (id != updateIncidentDto.Id)
            {
                return BadRequest();
            }

            var success = await _mediator.Send(new UpdateIncidentCommand(id, updateIncidentDto));
            
            if (!success) return NotFound();

            return NoContent();
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIncident(Guid id)
        {
            if (User.IsInRole("DemoViewer")) return Forbid();

            var success = await _mediator.Send(new DeleteIncidentCommand(id));
            
            if (!success) return NotFound();

            return NoContent();
        }

        [AllowAnonymous]
        [HttpPatch("{id}/resolve")]
        public async Task<IActionResult> ResolveIncident(Guid id)
        {
            var result = await _mediator.Send(new ResolveIncidentCommand(id));
            
            if (result.NotFound) return NotFound();
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            return NoContent();
        }

        [Authorize(Roles = "QA,DemoViewer")]
        [HttpPatch("{id}/verify")]
        public async Task<IActionResult> VerifyIncident(Guid id)
        {
            var result = await _mediator.Send(new VerifyIncidentCommand(id));
            
            if (result.NotFound) return NotFound();
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            return NoContent();
        }

        // Attach an evidence photo (multipart form field "file"). Any authenticated role may
        // upload — it is non-destructive evidence, so even DemoViewer is allowed (mirrors the
        // spec). Validation (size/type/magic-bytes) lives in the command handler.
        [Authorize]
        [HttpPost("{id}/photo")]
        [RequestSizeLimit(6 * 1024 * 1024)] // a touch above the 5MB content cap to allow multipart overhead
        public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var result = await _mediator.Send(new UploadIncidentPhotoCommand(id, ms.ToArray(), file.ContentType));

            if (result.NotFound) return NotFound();
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            return Ok(new { photoUrl = result.PhotoUrl });
        }

        [Authorize(Roles = "QA,DemoViewer")]
        [HttpPatch("{id}/reopen")]
        public async Task<IActionResult> ReopenIncident(Guid id)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _mediator.Send(new ReopenIncidentCommand(id, baseUrl));
            
            if (result.NotFound) return NotFound();
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            return NoContent();
        }
    }
}
