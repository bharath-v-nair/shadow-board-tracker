using System;
using System.Threading;
using System.Threading.Tasks;

namespace TrackerAPI.Interfaces
{
    /// <summary>
    /// A thin cache-aside abstraction over IDistributedCache. Query handlers depend on
    /// this (not on IDistributedCache directly) so the serialization, the TTL policy and
    /// — crucially — the "cache down? fall through to the source" resilience live in one
    /// place. Mirrors the IIncidentNotifier pattern: an interface in Interfaces/, a single
    /// default implementation in Services/, injected into the CQRS handlers.
    /// </summary>
    public interface ICacheService
    {
        /// <summary>
        /// Cache-aside read: return the cached value for <paramref name="key"/> if present
        /// (HIT); otherwise run <paramref name="factory"/> (the real DB read), store its
        /// result with the given <paramref name="ttl"/>, and return it (MISS).
        /// A cache failure MUST NOT fail the request — on any cache error this falls
        /// through to <paramref name="factory"/> so the app keeps serving from the database.
        /// </summary>
        Task<T> GetOrCreateAsync<T>(
            string key,
            TimeSpan ttl,
            Func<Task<T>> factory,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Evict one or more keys. Called from command handlers AFTER SaveChangesAsync so
        /// the next read repopulates from the now-current database. Best-effort: a failed
        /// eviction is logged, not thrown — the TTL is the backstop.
        /// </summary>
        Task RemoveAsync(params string[] keys);
    }
}
