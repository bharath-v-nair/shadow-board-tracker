using System.Net;
using FluentAssertions;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Proves the SignalR hub is mapped AND secured. We hit the negotiate endpoint
/// (POST /hubs/incidents/negotiate) instead of opening a real socket because:
///   1. [Authorize] on IncidentHub applies to negotiate too, so no token => 401.
///   2. Passing the JWT via ?access_token= (with NO Authorization header) exercises the
///      OnMessageReceived query-string path — the WebSocket auth gotcha — and must => 200.
/// This stays green without any WebSocket plumbing, so it isn't brittle.
/// </summary>
public class IncidentHubTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public IncidentHubTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Negotiate_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/hubs/incidents/negotiate?negotiateVersion=1", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "the hub is [Authorize] and no credentials were supplied");
    }

    [Fact]
    public async Task Negotiate_WithQaTokenInQueryString_Returns200()
    {
        var client = _factory.CreateClient();
        var token = TestAuthHelper.CreateToken("QA");

        // No Authorization header on purpose — the token rides in the query string exactly
        // as the browser SignalR client sends it for a WebSocket connection.
        var response = await client.PostAsync(
            $"/hubs/incidents/negotiate?negotiateVersion=1&access_token={token}", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "OnMessageReceived should read the JWT from access_token for /hubs paths");
    }

    [Fact]
    public async Task Negotiate_WithWorkerToken_Returns403()
    {
        var client = _factory.CreateClient();
        var token = TestAuthHelper.CreateToken("Worker");

        // A Worker is authenticated but outside the hub's allowed roles, so the socket must
        // be refused — the hub exposes no more than GET /api/incidents/all (QA, DemoViewer).
        var response = await client.PostAsync(
            $"/hubs/incidents/negotiate?negotiateVersion=1&access_token={token}", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "the hub is restricted to QA and DemoViewer roles");
    }
}
