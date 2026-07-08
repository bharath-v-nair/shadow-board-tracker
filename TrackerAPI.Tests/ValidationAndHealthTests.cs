using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TrackerAPI.DTOs;
using TrackerAPI.Tests.Infrastructure;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Phase 24: proves the validation pipeline and health endpoint end to end through the real
/// HTTP -> middleware -> MediatR pipeline behavior -> handler chain.
/// </summary>
public class ValidationAndHealthTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ValidationAndHealthTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateBoard_EmptyName_Returns400WithNameError()
    {
        // Empty name is caught by the [Required] data-annotation layer at model binding.
        var response = await _client.PostAsJsonAsync("/api/boards",
            new CreateBoardDto { Name = "", Location = "Bay 1" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await ErrorFieldsAsync(response)).Should().Contain(f => f.Equals("Name", System.StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateBoard_NameTooLong_Returns400FromValidationPipeline()
    {
        // A 101-char name PASSES [Required] (it's non-empty) but FAILS the FluentValidation
        // MaximumLength(100) rule — so this can only be rejected by the MediatR ValidationBehavior.
        // Getting a 400 with errors.Name here proves the full chain:
        // pipeline -> ValidationException -> ExceptionMiddleware -> ProblemDetails.
        var response = await _client.PostAsJsonAsync("/api/boards",
            new CreateBoardDto { Name = new string('x', 101), Location = "Bay 1" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        root.GetProperty("errors").TryGetProperty("Name", out var nameErrors).Should().BeTrue();
        nameErrors.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateBoard_Valid_Returns201()
    {
        var response = await _client.PostAsJsonAsync("/api/boards",
            new CreateBoardDto { Name = "Valid Board", Location = "Bay 2" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Health_Returns200_WithDatabaseEntry()
    {
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        root.GetProperty("status").GetString().Should().Be("Healthy");

        var names = root.GetProperty("checks").EnumerateArray()
            .Select(c => c.GetProperty("name").GetString());
        names.Should().Contain("database");
    }

    // Collects the field keys from either error-contract shape (ASP.NET's automatic
    // ValidationProblemDetails or our ExceptionMiddleware ProblemDetails — both use "errors").
    private static async Task<List<string>> ErrorFieldsAsync(HttpResponseMessage response)
    {
        var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        return root.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Object
            ? errors.EnumerateObject().Select(p => p.Name).ToList()
            : new List<string>();
    }
}
