using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;

namespace TrackerAPI.Application.Features.Tools.Queries
{
    public class GetToolTypesQuery : IRequest<IEnumerable<string>>
    {
    }

    public class GetToolTypesQueryHandler : IRequestHandler<GetToolTypesQuery, IEnumerable<string>>
    {
        private readonly ApplicationDbContext _context;

        public GetToolTypesQueryHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<string>> Handle(GetToolTypesQuery request, CancellationToken cancellationToken)
        {
            return await _context.Tools
                .Select(t => t.Type)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync(cancellationToken);
        }
    }
}
