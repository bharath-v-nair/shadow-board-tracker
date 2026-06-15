using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Proves the JWT + role-based authorization actually blocks/permits requests.
/// Target endpoints:
///   GET    /api/incidents/all    -> [Authorize(Roles = "QA,DemoViewer")]
///   DELETE /api/incidents/{id}   -> blocks DemoViewer (sandbox protection)
/// </summary>
public class RbacSecurityTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RbacSecurityTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientFor(string? role)
    {
        var client = _factory.CreateClient();
        if (role is not null)
        {
            var token = TestAuthHelper.CreateToken(role);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        return client;
    }

    [Fact]
    public async Task GetAllIncidents_NoToken_Returns401()
    {
        var response = await ClientFor(null).GetAsync("/api/incidents/all");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAllIncidents_WorkerRole_Returns403()
    {
        // "Worker" is authenticated but NOT in the allowed roles -> Forbidden, not Unauthorized.
        var response = await ClientFor("Worker").GetAsync("/api/incidents/all");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAllIncidents_QaRole_Returns200()
    {
        var response = await ClientFor("QA").GetAsync("/api/incidents/all");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteIncident_DemoViewer_IsBlockedWith403()
    {
        // The demo sandbox guard (User.IsInRole("DemoViewer") => Forbid()) runs BEFORE
        // the handler, so even a random id is rejected with 403 rather than 404.
        var response = await ClientFor("DemoViewer").DeleteAsync($"/api/incidents/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
