using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Models;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Covers photo upload (Phase 25) end to end: HTTP multipart -> [Authorize] -> controller
/// (reads IFormFile) -> MediatR command -> ImageValidation -> fake blob storage -> PhotoPath
/// persisted -> GET returns a SAS read URL. Validation (size/type/magic-bytes) and RBAC are
/// exercised against the real pipeline; the only swap is the in-memory FakePhotoStorageService.
/// </summary>
public class PhotoUploadApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    // Seeded QA worker (HasData in ApplicationDbContext) — used as reporter/assignee so the
    // incident's FKs resolve without inventing new workers.
    private static readonly Guid SeededQaId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public PhotoUploadApiTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientFor(string role, Guid? userId = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestAuthHelper.CreateToken(role, userId: userId));
        return client;
    }

    /// <summary>Seeds a board + tool + open incident directly and returns the incident id.</summary>
    private Guid SeedIncident()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var board = new Board { Id = Guid.NewGuid(), Name = "Weld Bay", Location = "Line 3" };
        var tool = new Tool { Id = Guid.NewGuid(), Name = "Torque Wrench", Type = "Hand", Condition = "Good", BoardId = board.Id };
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            ToolId = tool.Id,
            WorkerId = SeededQaId,
            ReporterId = SeededQaId,
            Status = IncidentStatus.Open,
            ReportedAt = DateTime.UtcNow
        };
        db.Boards.Add(board);
        db.Tools.Add(tool);
        db.Incidents.Add(incident);
        db.SaveChanges();
        return incident.Id;
    }

    private static byte[] ValidPng(int totalBytes = 128)
    {
        var b = new byte[Math.Max(totalBytes, 8)];
        // PNG signature: the validator only inspects these first 8 bytes.
        byte[] sig = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        Array.Copy(sig, b, sig.Length);
        return b;
    }

    private static MultipartFormDataContent Multipart(byte[] bytes, string contentType, string fileName)
    {
        var content = new MultipartFormDataContent();
        var part = new ByteArrayContent(bytes);
        part.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(part, "file", fileName);
        return content;
    }

    [Fact]
    public async Task UploadIncidentPhoto_ValidPng_PersistsPathAndReturnsUrl()
    {
        var incidentId = SeedIncident();
        var client = ClientFor("QA");

        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(ValidPng(), "image/png", "evidence.png"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<PhotoUrlResponse>();
        body!.PhotoUrl.Should().NotBeNullOrEmpty();

        // The GET must now surface a (fake) SAS URL, proving PhotoPath was persisted.
        var incident = await client.GetFromJsonAsync<IncidentDto>($"/api/incidents/{incidentId}");
        incident!.PhotoUrl.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UploadIncidentPhoto_MagicBytesMismatch_Returns400()
    {
        var incidentId = SeedIncident();
        var client = ClientFor("QA");

        // Declares image/png but the bytes are plain text — the magic-byte check must reject it.
        var evilBytes = System.Text.Encoding.ASCII.GetBytes("this is not a png");
        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(evilBytes, "image/png", "evil.png"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadIncidentPhoto_UnsupportedType_Returns400()
    {
        var incidentId = SeedIncident();
        var client = ClientFor("QA");

        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(System.Text.Encoding.ASCII.GetBytes("hello"), "text/plain", "notes.txt"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadIncidentPhoto_Oversize_Returns400()
    {
        var incidentId = SeedIncident();
        var client = ClientFor("QA");

        // 5.5MB: over the app's 5MB cap but under the endpoint's 6MB RequestSizeLimit, so it
        // reaches the handler and fails the size check with a 400 (not a transport 413).
        var big = ValidPng(5_500_000);
        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(big, "image/png", "huge.png"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadIncidentPhoto_DemoViewer_IsAllowed()
    {
        // Uploading a photo is non-destructive evidence, so the demo sandbox permits it
        // (unlike DELETE, which is blocked for DemoViewer).
        var incidentId = SeedIncident();
        var client = ClientFor("DemoViewer");

        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(ValidPng(), "image/png", "evidence.png"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UploadIncidentPhoto_NoAuth_Returns401()
    {
        var incidentId = SeedIncident();
        var client = _factory.CreateClient();

        var response = await client.PostAsync($"/api/incidents/{incidentId}/photo",
            Multipart(ValidPng(), "image/png", "evidence.png"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UploadMyPhoto_ValidJpeg_PersistsOnProfile()
    {
        // Token identifies the seeded QA worker; /me/photo resolves the id from the JWT.
        var client = ClientFor("QA", SeededQaId);

        byte[] jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46 };
        var response = await client.PostAsync("/api/workers/me/photo",
            Multipart(jpeg, "image/jpeg", "me.jpg"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var me = await client.GetFromJsonAsync<WorkerDto>("/api/workers/me");
        me!.PhotoUrl.Should().NotBeNullOrEmpty();
    }

    private sealed class PhotoUrlResponse
    {
        public string? PhotoUrl { get; set; }
    }
}
