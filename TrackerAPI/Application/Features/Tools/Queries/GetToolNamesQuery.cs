using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;

namespace TrackerAPI.Application.Features.Tools.Queries
{
    public class GetToolNamesQuery : IRequest<IEnumerable<string>>
    {
    }

    public class GetToolNamesQueryHandler : IRequestHandler<GetToolNamesQuery, IEnumerable<string>>
    {
        private readonly ApplicationDbContext _context;

        public GetToolNamesQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<string>> Handle(GetToolNamesQuery request, CancellationToken cancellationToken)
        {
            return await _context.Tools
                .Select(t => t.Name)
                .Distinct()
                .OrderBy(n => n)
                .ToListAsync(cancellationToken);
        }
    }
}
