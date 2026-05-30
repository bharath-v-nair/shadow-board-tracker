using MediatR;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TrackerAPI.Application.Features.Tools.Commands;
using TrackerAPI.Application.Features.Tools.Queries;
using TrackerAPI.DTOs;

namespace TrackerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ToolsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ToolsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ToolDto>>> GetTools([FromQuery] Guid? boardId)
        {
            var tools = await _mediator.Send(new GetToolsQuery(boardId));
            return Ok(tools);
        }

        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<string>>> GetToolTypes()
        {
            var types = await _mediator.Send(new GetToolTypesQuery());
            return Ok(types);
        }

        [HttpGet("names")]
        public async Task<ActionResult<IEnumerable<string>>> GetToolNames()
        {
            var names = await _mediator.Send(new GetToolNamesQuery());
            return Ok(names);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ToolDto>> GetTool(Guid id)
        {
            var tool = await _mediator.Send(new GetToolByIdQuery(id));

            if (tool == null) return NotFound();

            return Ok(tool);
        }

        [HttpPost]
        public async Task<ActionResult<ToolDto>> PostTool(CreateToolDto createToolDto)
        {
            var toolDto = await _mediator.Send(new CreateToolCommand(createToolDto));
            return CreatedAtAction(nameof(GetTool), new { id = toolDto.Id }, toolDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTool(Guid id, UpdateToolDto updateToolDto)
        {
            if (id != updateToolDto.Id) return BadRequest();

            var success = await _mediator.Send(new UpdateToolCommand(updateToolDto));
            if (!success) return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTool(Guid id)
        {
            if (User.IsInRole("DemoViewer")) return Forbid();

            var success = await _mediator.Send(new DeleteToolCommand(id));
            if (!success) return NotFound();

            return NoContent();
        }
    }
}
