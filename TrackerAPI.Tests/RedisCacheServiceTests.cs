using System.Collections.Concurrent;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging.Abstractions;
using TrackerAPI.Services;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Unit-style tests for the cache-aside logic in RedisCacheService, exercised against a
/// hand-rolled in-memory IDistributedCache (no Redis, no DI). Proves the four behaviours an
/// interviewer cares about: MISS runs the factory and populates, HIT skips the factory,
/// RemoveAsync evicts, and — the important one — a broken cache degrades to the factory
/// instead of throwing.
/// </summary>
public class RedisCacheServiceTests
{
    private static RedisCacheService Service(IDistributedCache cache) =>
        new(cache, NullLogger<RedisCacheService>.Instance);

    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);

    [Fact]
    public async Task Miss_RunsFactory_AndCachesResult()
    {
        var sut = Service(new FakeDistributedCache());
        var factoryCalls = 0;

        var value = await sut.GetOrCreateAsync("k", Ttl, () =>
        {
            factoryCalls++;
            return Task.FromResult("from-db");
        });

        value.Should().Be("from-db");
        factoryCalls.Should().Be(1, "a cold cache must fall through to the factory once");
    }

    [Fact]
    public async Task SecondCall_IsServedFromCache_FactoryNotRunAgain()
    {
        var sut = Service(new FakeDistributedCache());
        var factoryCalls = 0;

        Task<string> Factory()
        {
            factoryCalls++;
            return Task.FromResult("value");
        }

        await sut.GetOrCreateAsync("k", Ttl, Factory); // miss -> populate
        var second = await sut.GetOrCreateAsync("k", Ttl, Factory); // hit

        second.Should().Be("value");
        factoryCalls.Should().Be(1, "the second read is a cache HIT and must not touch the factory");
    }

    [Fact]
    public async Task RemoveAsync_Evicts_SoNextReadMissesAgain()
    {
        var sut = Service(new FakeDistributedCache());
        var factoryCalls = 0;

        Task<string> Factory()
        {
            factoryCalls++;
            return Task.FromResult("value");
        }

        await sut.GetOrCreateAsync("k", Ttl, Factory); // miss (calls=1)
        await sut.GetOrCreateAsync("k", Ttl, Factory); // hit  (calls=1)
        await sut.RemoveAsync("k");
        await sut.GetOrCreateAsync("k", Ttl, Factory); // miss again (calls=2)

        factoryCalls.Should().Be(2, "eviction forces the next read to rebuild from the factory");
    }

    [Fact]
    public async Task CacheThrows_FallsThroughToFactory_WithoutThrowing()
    {
        // The senior detail: if Redis is down, the request must still succeed off the DB.
        var sut = Service(new ThrowingDistributedCache());
        var factoryCalls = 0;

        var value = await sut.GetOrCreateAsync("k", Ttl, () =>
        {
            factoryCalls++;
            return Task.FromResult("from-db");
        });

        value.Should().Be("from-db");
        factoryCalls.Should().Be(1, "a cache failure must degrade to the source of truth, not error out");
    }

    // A minimal working IDistributedCache backed by a dictionary (enough for GetString/SetString/Remove).
    private sealed class FakeDistributedCache : IDistributedCache
    {
        private readonly ConcurrentDictionary<string, byte[]> _store = new();

        public byte[]? Get(string key) => _store.TryGetValue(key, out var v) ? v : null;
        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult(Get(key));
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _store[key] = value;
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }
        public void Refresh(string key) { }
        public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;
        public void Remove(string key) => _store.TryRemove(key, out _);
        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            Remove(key);
            return Task.CompletedTask;
        }
    }

    // Simulates an unreachable cache: every operation throws, like a dead Redis connection.
    private sealed class ThrowingDistributedCache : IDistributedCache
    {
        private static Exception Boom() => new InvalidOperationException("cache is down");
        public byte[]? Get(string key) => throw Boom();
        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => throw Boom();
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => throw Boom();
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) => throw Boom();
        public void Refresh(string key) => throw Boom();
        public Task RefreshAsync(string key, CancellationToken token = default) => throw Boom();
        public void Remove(string key) => throw Boom();
        public Task RemoveAsync(string key, CancellationToken token = default) => throw Boom();
    }
}
