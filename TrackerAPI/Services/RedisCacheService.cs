using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Services
{
    /// <summary>
    /// Default ICacheService over IDistributedCache. The registered IDistributedCache is
    /// either Redis (StackExchange.Redis, when Redis:ConnectionString is configured) or an
    /// in-process memory cache (the graceful fallback for tests and non-Docker dev) — this
    /// class is identical either way, which is the whole point of coding to IDistributedCache.
    ///
    /// Resilience is the senior detail: every cache operation is wrapped so that if the
    /// cache is unreachable, we log and fall through to the source of truth (the database)
    /// instead of throwing. A cache is a performance optimization; it must never be able to
    /// take the application down.
    /// </summary>
    public class RedisCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;
        private readonly ILogger<RedisCacheService> _logger;

        // Match the API's camelCase JSON so a value cached here round-trips cleanly.
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<T> GetOrCreateAsync<T>(
            string key,
            TimeSpan ttl,
            Func<Task<T>> factory,
            CancellationToken cancellationToken = default)
        {
            // 1. Try the cache. A read failure (Redis down, timeout) is swallowed so we
            //    degrade to a plain DB read rather than 500ing the request.
            try
            {
                var cached = await _cache.GetStringAsync(key, cancellationToken);
                if (cached is not null)
                {
                    var value = JsonSerializer.Deserialize<T>(cached, JsonOptions);
                    if (value is not null)
                    {
                        _logger.LogDebug("Cache HIT {Key}", key);
                        return value;
                    }
                }

                _logger.LogDebug("Cache MISS {Key}", key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cache read failed for {Key}; falling through to source", key);
            }

            // 2. Cache miss (or unreachable cache): hit the real source of truth.
            var result = await factory();

            // 3. Populate the cache for next time. A write failure is also non-fatal — the
            //    request already has its answer; we just miss again next time.
            try
            {
                var serialized = JsonSerializer.Serialize(result, JsonOptions);
                await _cache.SetStringAsync(
                    key,
                    serialized,
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cache write failed for {Key}", key);
            }

            return result;
        }

        public async Task RemoveAsync(params string[] keys)
        {
            foreach (var key in keys)
            {
                try
                {
                    await _cache.RemoveAsync(key);
                    _logger.LogDebug("Cache EVICT {Key}", key);
                }
                catch (Exception ex)
                {
                    // Best-effort: a failed eviction leaves stale data that the TTL will
                    // eventually expire. Never let invalidation break the write path.
                    _logger.LogWarning(ex, "Cache eviction failed for {Key}", key);
                }
            }
        }
    }
}
