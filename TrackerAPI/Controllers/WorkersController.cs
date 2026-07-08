using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using TrackerAPI.Application.Features.Workers.Commands;
using TrackerAPI.Application.Features.Workers.Queries;
using TrackerAPI.DTOs;

namespace TrackerAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public WorkersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkerDto>>> GetWorkers([FromQuery] string? role, [FromQuery] bool? isOnShift)
        {
            var workers = await _mediator.Send(new GetWorkersQuery(role, isOnShift));
            return Ok(workers);
        }

        // Literal "me" segment takes routing precedence over "{id}", so this resolves the
        // authenticated caller's own profile without a client-supplied id.
        [HttpGet("me")]
        public async Task<ActionResult<WorkerDto>> GetCurrentWorker()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idClaim, out var userId))
            {
                return Unauthorized();
            }

            var worker = await _mediator.Send(new GetCurrentWorkerQuery(userId));

            if (worker == null)
            {
                return NotFound();
            }

            return Ok(worker);
        }

        // Upload the authenticated caller's own profile photo (multipart field "file"). Uses the
        // same /me identity pattern as GetCurrentWorker — the id comes from the JWT, never the URL.
        [HttpPost("me/photo")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadMyPhoto(IFormFile file)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idClaim, out var userId)) return Unauthorized();

            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var result = await _mediator.Send(new UploadWorkerPhotoCommand(userId, ms.ToArray(), file.ContentType));

            if (result.NotFound) return NotFound();
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            return Ok(new { photoUrl = result.PhotoUrl });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkerDto>> GetWorker(Guid id)
        {
            var worker = await _mediator.Send(new GetWorkerByIdQuery(id));

            if (worker == null)
            {
                return NotFound();
            }

            return Ok(worker);
        }

        [HttpPost]
        public async Task<ActionResult<WorkerDto>> PostWorker(CreateWorkerDto createWorkerDto)
        {
            var workerDto = await _mediator.Send(new CreateWorkerCommand(createWorkerDto));

            return CreatedAtAction(nameof(GetWorker), new { id = workerDto.Id }, workerDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutWorker(Guid id, UpdateWorkerDto updateWorkerDto)
        {
            if (id != updateWorkerDto.Id)
            {
                return BadRequest();
            }

            var success = await _mediator.Send(new UpdateWorkerCommand(updateWorkerDto));
            
            if (!success)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorker(Guid id)
        {
            if (User.IsInRole("DemoViewer")) return Forbid();

            var success = await _mediator.Send(new DeleteWorkerCommand(id));
            
            if (!success)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPatch("{id}/shift")]
        [Authorize(Roles = "QA,DemoViewer")]
        public async Task<ActionResult<WorkerDto>> ToggleShift(Guid id)
        {
            var worker = await _mediator.Send(new ToggleWorkerShiftCommand(id));
            if (worker == null)
            {
                return NotFound();
            }

            return Ok(worker);
        }
    }
}
