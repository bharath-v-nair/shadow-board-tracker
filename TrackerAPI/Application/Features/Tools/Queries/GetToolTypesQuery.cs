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
    public class GetToolTypesQuery : IRequest<IEnumerable<string>>
    {
    }

    public class GetToolTypesQueryHandler : IRequestHandler<GetToolTypesQuery, IEnumerable<string>>
    {
        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public GetToolTypesQueryHandler(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IEnumerable<string>> Handle(GetToolTypesQuery request, CancellationToken cancellationToken)
        {
            return await _cache.GetOrCreateAsync(
                CacheKeys.ToolTypes,
                CacheKeys.DefaultTtl,
                async () => await _context.Tools
                    .Select(t => t.Type)
                    .Distinct()
                    .OrderBy(t => t)
                    .ToListAsync(cancellationToken),
                cancellationToken);
        }
    }
}
