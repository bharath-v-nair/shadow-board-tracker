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
    public class ToolsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ToolsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ToolDto>>> GetTools([FromQuery] Guid? boardId)
        {
            var query = _context.Tools.AsQueryable();
            if (boardId.HasValue)
                query = query.Where(t => t.BoardId == boardId.Value);

            var tools = await query.ToListAsync();
            return tools.Select(t => new ToolDto
            {
                Id = t.Id,
                Name = t.Name,
                Type = t.Type,
                IconName = t.IconName,
                Condition = t.Condition,
                BoardId = t.BoardId
            }).ToList();
        }

        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<string>>> GetToolTypes()
        {
            var types = await _context.Tools
                .Select(t => t.Type)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();
            return Ok(types);
        }

        [HttpGet("names")]
        public async Task<ActionResult<IEnumerable<string>>> GetToolNames()
        {
            var names = await _context.Tools
                .Select(t => t.Name)
                .Distinct()
                .OrderBy(n => n)
                .ToListAsync();
            return Ok(names);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ToolDto>> GetTool(Guid id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound();
            }

            return new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Type = tool.Type,
                IconName = tool.IconName,
                Condition = tool.Condition,
                BoardId = tool.BoardId
            };
        }

        [HttpPost]
        public async Task<ActionResult<ToolDto>> PostTool(CreateToolDto createToolDto)
        {
            var tool = new Tool
            {
                Id = Guid.NewGuid(),
                Name = createToolDto.Name,
                Type = createToolDto.Type,
                IconName = createToolDto.IconName,
                Condition = createToolDto.Condition,
                BoardId = createToolDto.BoardId
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync();

            var toolDto = new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Type = tool.Type,
                IconName = tool.IconName,
                Condition = tool.Condition,
                BoardId = tool.BoardId
            };

            return CreatedAtAction(nameof(GetTool), new { id = tool.Id }, toolDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTool(Guid id, UpdateToolDto updateToolDto)
        {
            if (id != updateToolDto.Id)
            {
                return BadRequest();
            }

            var tool = await _context.Tools.FindAsync(id);
            if (tool == null)
            {
                return NotFound();
            }

            tool.Name = updateToolDto.Name;
            tool.Type = updateToolDto.Type;
            tool.IconName = updateToolDto.IconName;
            tool.Condition = updateToolDto.Condition;
            tool.BoardId = updateToolDto.BoardId;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTool(Guid id)
        {
            var tool = await _context.Tools.FindAsync(id);
            if (tool == null)
            {
                return NotFound();
            }

            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
