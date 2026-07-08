using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Application.Caching;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Application.Features.Tools.Queries
{
    public class GetToolNamesQuery : IRequest<IEnumerable<string>>
    {
    }

    public class GetToolNamesQueryHandler : IRequestHandler<GetToolNamesQuery, IEnumerable<string>>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public GetToolNamesQueryHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        // Cache-aside: this DISTINCT/ORDER BY scan powers the report-missing autocomplete and
        // changes only when tools are added/removed — cheap to cache, invalidated on tool writes.
        public async Task<IEnumerable<string>> Handle(GetToolNamesQuery request, CancellationToken cancellationToken)
        {
            return await _cache.GetOrCreateAsync(
                CacheKeys.ToolNames,
                CacheKeys.DefaultTtl,
                async () => await _context.Tools
                    .Select(t => t.Name)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToListAsync(cancellationToken),
                cancellationToken);
        }
    }
}
