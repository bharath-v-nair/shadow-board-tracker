using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Workers.Queries
{
    public class GetWorkersQuery : IRequest<IEnumerable<WorkerDto>>
    {
        public string? Role { get; set; }
        public bool? IsOnShift { get; set; }

        public GetWorkersQuery(string? role, bool? isOnShift)
        {
            Role = role;
            IsOnShift = isOnShift;
        }
    }

    public class GetWorkersQueryHandler : IRequestHandler<GetWorkersQuery, IEnumerable<WorkerDto>>
    {
        private readonly ApplicationDbContext _context;

        public GetWorkersQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<WorkerDto>> Handle(GetWorkersQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Workers.AsQueryable();

            if (!string.IsNullOrEmpty(request.Role))
            {
                query = query.Where(w => w.Role == request.Role);
            }

            if (request.IsOnShift.HasValue)
            {
                query = query.Where(w => w.IsOnShift == request.IsOnShift.Value);
            }

            var workers = await query.ToListAsync(cancellationToken);
            return workers.Select(w => new WorkerDto
            {
                Id = w.Id,
                Name = w.Name,
                Email = w.Email,
                IsAvailable = w.IsAvailable,
                IsOnShift = w.IsOnShift
            }).ToList();
        }
    }
}
