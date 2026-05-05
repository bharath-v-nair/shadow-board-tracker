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
    public class BoardsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BoardsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BoardDto>>> GetBoards()
        {
            var boards = await _context.Boards.ToListAsync();
            return boards.Select(b => new BoardDto
            {
                Id = b.Id,
                Name = b.Name,
                Location = b.Location,
                QrCodeUrl = b.QrCodeUrl
            }).ToList();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BoardDto>> GetBoard(Guid id)
        {
            var board = await _context.Boards.FindAsync(id);

            if (board == null)
            {
                return NotFound();
            }

            return new BoardDto
            {
                Id = board.Id,
                Name = board.Name,
                Location = board.Location,
                QrCodeUrl = board.QrCodeUrl
            };
        }

        [HttpPost]
        public async Task<ActionResult<BoardDto>> PostBoard(CreateBoardDto createBoardDto)
        {
            var board = new Board
            {
                Id = Guid.NewGuid(),
                Name = createBoardDto.Name,
                Location = createBoardDto.Location,
                QrCodeUrl = createBoardDto.QrCodeUrl
            };

            _context.Boards.Add(board);
            await _context.SaveChangesAsync();

            var boardDto = new BoardDto
            {
                Id = board.Id,
                Name = board.Name,
                Location = board.Location,
                QrCodeUrl = board.QrCodeUrl
            };

            return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, boardDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutBoard(Guid id, UpdateBoardDto updateBoardDto)
        {
            if (id != updateBoardDto.Id)
            {
                return BadRequest();
            }

            var board = await _context.Boards.FindAsync(id);
            if (board == null)
            {
                return NotFound();
            }

            board.Name = updateBoardDto.Name;
            board.Location = updateBoardDto.Location;
            board.QrCodeUrl = updateBoardDto.QrCodeUrl;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBoard(Guid id)
        {
            var board = await _context.Boards.FindAsync(id);
            if (board == null)
            {
                return NotFound();
            }

            _context.Boards.Remove(board);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
