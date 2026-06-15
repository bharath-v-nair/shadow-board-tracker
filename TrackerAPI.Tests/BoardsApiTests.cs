using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using TrackerAPI.DTOs;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Exercises the full HTTP -> Controller -> MediatR -> Handler -> EF Core path.
/// If any link in the CQRS chain is wired up wrong, these fail.
/// </summary>
public class BoardsApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public BoardsApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetBoards_ReturnsSeededBoards()
    {
        // GetBoardsQuery -> GetBoardsQueryHandler -> AsNoTracking() read
        var response = await _client.GetAsync("/api/boards");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var boards = await response.Content.ReadFromJsonAsync<List<BoardDto>>();
        boards.Should().NotBeNull();
        boards!.Should().HaveCountGreaterThanOrEqualTo(5, "DbInitializer seeds 5 boards");
    }

    [Fact]
    public async Task CreateBoard_ThenGetById_RoundTripsThroughMediator()
    {
        var newBoard = new CreateBoardDto
        {
            Name = "Integration Test Board",
            Location = "CI Pipeline",
        };

        // CreateBoardCommand (write + SaveChanges)
        var createResponse = await _client.PostAsJsonAsync("/api/boards", newBoard);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<BoardDto>();
        created.Should().NotBeNull();
        created!.Id.Should().NotBeEmpty();
        created.Name.Should().Be("Integration Test Board");

        // GetBoardByIdQuery — confirms the write actually persisted to the store
        var getResponse = await _client.GetAsync($"/api/boards/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var fetched = await getResponse.Content.ReadFromJsonAsync<BoardDto>();
        fetched!.Name.Should().Be("Integration Test Board");
        fetched.Location.Should().Be("CI Pipeline");
    }

    [Fact]
    public async Task GetBoardById_UnknownId_Returns404()
    {
        var response = await _client.GetAsync($"/api/boards/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
