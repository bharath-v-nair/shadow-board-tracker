using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using TrackerAPI.Application.Caching;
using TrackerAPI.DTOs;
using TrackerAPI.Interfaces;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// End-to-end proof of the cache-aside behaviour over the real HTTP -> MediatR -> handler
/// path. The factory blanks Redis, so IDistributedCache is the in-memory distributed cache —
/// a genuine cache, just process-local — which lets these tests prove reads hit the cache and
/// writes invalidate it, deterministically and with no Redis container.
/// </summary>
public class CachingIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CachingIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // Force a known value into boards:all (RemoveAsync first so the seed can't be a HIT no-op).
    private async Task SeedBoardsCacheAsync(params BoardDto[] boards)
    {
        using var scope = _factory.Services.CreateScope();
        var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
        await cache.RemoveAsync(CacheKeys.BoardsAll);
        await cache.GetOrCreateAsync(
            CacheKeys.BoardsAll,
            TimeSpan.FromMinutes(5),
            () => Task.FromResult<IEnumerable<BoardDto>>(boards.ToList()));
    }

    [Fact]
    public async Task GetBoards_IsServedFromCache_WhenCachePrimed()
    {
        // A sentinel that exists ONLY in the cache — the seeded DB has no such board.
        var sentinel = new BoardDto { Id = Guid.NewGuid(), Name = "CACHED_SENTINEL", Location = "cache" };
        await SeedBoardsCacheAsync(sentinel);

        var boards = await _client.GetFromJsonAsync<List<BoardDto>>("/api/boards");

        boards.Should().NotBeNull();
        boards!.Should().ContainSingle(b => b.Name == "CACHED_SENTINEL",
            "the read path must return the cached value without touching the database");
    }

    [Fact]
    public async Task CreateBoard_InvalidatesCache_SoNextReadReflectsTheWrite()
    {
        // Prime the cache with a stale value that does NOT include the board we are about to add.
        var stale = new BoardDto { Id = Guid.NewGuid(), Name = "STALE_SENTINEL", Location = "cache" };
        await SeedBoardsCacheAsync(stale);

        // Write through the command handler, which evicts boards:all after SaveChanges.
        var create = new CreateBoardDto { Name = "Invalidation Test Board", Location = "CI" };
        var createResponse = await _client.PostAsJsonAsync("/api/boards", create);
        createResponse.EnsureSuccessStatusCode();

        // Next read must rebuild from the DB: stale sentinel gone, the new board present.
        var boards = await _client.GetFromJsonAsync<List<BoardDto>>("/api/boards");

        boards.Should().NotBeNull();
        boards!.Should().NotContain(b => b.Name == "STALE_SENTINEL",
            "the create command must have invalidated the cached list");
        boards.Should().Contain(b => b.Name == "Invalidation Test Board",
            "the freshly written board must appear after invalidation");
    }
}
