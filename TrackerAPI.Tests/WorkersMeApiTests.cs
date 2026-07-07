using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using TrackerAPI.DTOs;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Covers GET /api/workers/me — the "current user" endpoint. Exercises the full
/// HTTP -> [Authorize] -> Controller (claim extraction) -> MediatR -> Handler -> EF path,
/// proving the JWT NameIdentifier claim is what resolves the returned profile.
/// </summary>
public class WorkersMeApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public WorkersMeApiTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientFor(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>Grabs a real seeded worker (ids are generated, not fixed) to drive the /me lookup.</summary>
    private async Task<WorkerDto> GetASeededWorker()
    {
        var client = ClientFor(TestAuthHelper.CreateToken("QA"));
        var workers = await client.GetFromJsonAsync<List<WorkerDto>>("/api/workers?role=Worker");
        workers.Should().NotBeNullOrEmpty("DbInitializer seeds floor workers");
        return workers![0];
    }

    [Fact]
    public async Task GetMe_WithTokenForSeededWorker_ReturnsThatWorkersProfile()
    {
        var seeded = await GetASeededWorker();

        // Mint a token whose NameIdentifier is the seeded worker's id — /me should find that row.
        var client = ClientFor(TestAuthHelper.CreateToken("Worker", seeded.Name, seeded.Id));

        var response = await client.GetAsync("/api/workers/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await response.Content.ReadFromJsonAsync<WorkerDto>();
        me.Should().NotBeNull();
        me!.Id.Should().Be(seeded.Id);
        me.Email.Should().Be(seeded.Email);
        me.Role.Should().Be("Worker");
    }

    [Fact]
    public async Task GetMe_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/workers/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_TokenForUnknownUser_Returns404()
    {
        // Valid signature, but the id matches no worker row.
        var client = ClientFor(TestAuthHelper.CreateToken("Worker", "Ghost", Guid.NewGuid()));

        var response = await client.GetAsync("/api/workers/me");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
