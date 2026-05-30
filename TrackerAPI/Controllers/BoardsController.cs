using MediatR;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TrackerAPI.Application.Features.Boards.Commands;
using TrackerAPI.Application.Features.Boards.Queries;
using TrackerAPI.DTOs;

namespace TrackerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BoardsController : ControllerBase
    {
        // 1. Inject MediatR instead of the Database!
        private readonly IMediator _mediator;

        public BoardsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BoardDto>>> GetBoards()
        {
            // 2. Drop the "Message" in the mailbox
            var boards = await _mediator.Send(new GetBoardsQuery());
            return Ok(boards);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BoardDto>> GetBoard(Guid id)
        {
            var board = await _mediator.Send(new GetBoardByIdQuery(id));

            // 3. Handle HTTP concepts (like 404 NotFound) here
            if (board == null) return NotFound();
            
            return Ok(board);
        }

        [HttpPost]
        public async Task<ActionResult<BoardDto>> PostBoard(CreateBoardDto createBoardDto)
        {
            var boardDto = await _mediator.Send(new CreateBoardCommand(createBoardDto));
            
            return CreatedAtAction(nameof(GetBoard), new { id = boardDto.Id }, boardDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutBoard(Guid id, UpdateBoardDto updateBoardDto)
        {
            if (id != updateBoardDto.Id) return BadRequest();

            // The handler returns 'true' if it found and updated the board
            var success = await _mediator.Send(new UpdateBoardCommand(updateBoardDto));
            
            if (!success) return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBoard(Guid id)
        {
            // 4. Authorization stays in the Controller!
            if (User.IsInRole("DemoViewer")) return Forbid();

            var success = await _mediator.Send(new DeleteBoardCommand(id));
            
            if (!success) return NotFound();

            return NoContent();
        }

        [HttpPatch("{id}/qr-config")]
        public async Task<IActionResult> PatchQrConfig(Guid id, [FromBody] UpdateQrConfigDto dto)
        {
            var success = await _mediator.Send(new PatchBoardQrConfigCommand(id, dto));
            
            if (!success) return NotFound();

            return NoContent();
        }
    }
}