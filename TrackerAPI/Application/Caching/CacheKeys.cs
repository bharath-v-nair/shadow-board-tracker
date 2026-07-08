using System;

namespace TrackerAPI.Application.Caching
{
    /// <summary>
    /// The single source of truth for cache-key strings and the default TTL.
    /// Query handlers (read path) and command handlers (invalidation path) both
    /// reference these constants, so a key can never drift between where it is
    /// written and where it is evicted — the classic cache-aside bug.
    /// </summary>
    public static class CacheKeys
    {
        /// <summary>All boards (GetBoardsQuery).</summary>
        public const string BoardsAll = "boards:all";

        /// <summary>A single board by id (GetBoardByIdQuery).</summary>
        public static string Board(Guid id) => $"boards:{id}";

        /// <summary>Distinct tool names (GetToolNamesQuery).</summary>
        public const string ToolNames = "tools:names";

        /// <summary>Distinct tool types (GetToolTypesQuery).</summary>
        public const string ToolTypes = "tools:types";

        /// <summary>
        /// Bounded-staleness safety net. Explicit invalidation on write keeps the cache
        /// correct in the normal case; this TTL caps how long a MISSED invalidation
        /// (a bug, a lost Redis command, a write that bypassed a command handler) can
        /// serve stale data before the key self-heals.
        /// </summary>
        public static readonly TimeSpan DefaultTtl = TimeSpan.FromSeconds(60);
    }
}
