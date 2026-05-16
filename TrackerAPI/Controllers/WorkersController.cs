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

namespace TrackerAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WorkersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkerDto>>> GetWorkers([FromQuery] string? role, [FromQuery] bool? isOnShift)
        {
            var query = _context.Workers.AsQueryable();

            if (!string.IsNullOrEmpty(role))
            {
                query = query.Where(w => w.Role == role);
            }

            if (isOnShift.HasValue)
            {
                query = query.Where(w => w.IsOnShift == isOnShift.Value);
            }

            var workers = await query.ToListAsync();
            return workers.Select(w => new WorkerDto
            {
                Id = w.Id,
                Name = w.Name,
                Email = w.Email,
                IsAvailable = w.IsAvailable,
                IsOnShift = w.IsOnShift
            }).ToList();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkerDto>> GetWorker(Guid id)
        {
            var worker = await _context.Workers.FindAsync(id);

            if (worker == null)
            {
                return NotFound();
            }

            return new WorkerDto
            {
                Id = worker.Id,
                Name = worker.Name,
                Email = worker.Email,
                IsAvailable = worker.IsAvailable,
                IsOnShift = worker.IsOnShift
            };
        }

        [HttpPost]
        public async Task<ActionResult<WorkerDto>> PostWorker(CreateWorkerDto createWorkerDto)
        {
            var worker = new Worker
            {
                Id = Guid.NewGuid(),
                Name = createWorkerDto.Name,
                Email = createWorkerDto.Email,
                IsAvailable = createWorkerDto.IsAvailable
            };

            _context.Workers.Add(worker);
            await _context.SaveChangesAsync();

            var workerDto = new WorkerDto
            {
                Id = worker.Id,
                Name = worker.Name,
                Email = worker.Email,
                IsAvailable = worker.IsAvailable,
                IsOnShift = worker.IsOnShift
            };

            return CreatedAtAction(nameof(GetWorker), new { id = worker.Id }, workerDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutWorker(Guid id, UpdateWorkerDto updateWorkerDto)
        {
            if (id != updateWorkerDto.Id)
            {
                return BadRequest();
            }

            var worker = await _context.Workers.FindAsync(id);
            if (worker == null)
            {
                return NotFound();
            }

            worker.Name = updateWorkerDto.Name;
            worker.Email = updateWorkerDto.Email;
            worker.IsAvailable = updateWorkerDto.IsAvailable;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorker(Guid id)
        {
            var worker = await _context.Workers.FindAsync(id);
            if (worker == null)
            {
                return NotFound();
            }

            _context.Workers.Remove(worker);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("{id}/shift")]
        [Authorize(Roles = "QA")]
        public async Task<ActionResult<WorkerDto>> ToggleShift(Guid id)
        {
            var worker = await _context.Workers.FindAsync(id);
            if (worker == null)
            {
                return NotFound();
            }

            worker.IsOnShift = !worker.IsOnShift;
            await _context.SaveChangesAsync();

            return Ok(new WorkerDto
            {
                Id = worker.Id,
                Name = worker.Name,
                Email = worker.Email,
                IsAvailable = worker.IsAvailable,
                IsOnShift = worker.IsOnShift
            });
        }
    }
}
