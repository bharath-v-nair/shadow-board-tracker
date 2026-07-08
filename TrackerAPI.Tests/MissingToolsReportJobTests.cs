using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;
using TrackerAPI.Jobs;
using TrackerAPI.Models;
using Xunit;

namespace TrackerAPI.Tests;

/// <summary>
/// Tests the nightly report job (Phase 26). The pure BuildReport aggregation is asserted directly
/// for exact aging-bucket / MTTR / top-tool math; RunAsync is exercised against an in-memory
/// DbContext with a fake IEmailService capturing the rendered HTML.
/// </summary>
public class MissingToolsReportJobTests
{
    private static Tool ToolNamed(string name) => new() { Id = Guid.NewGuid(), Name = name, Type = "Hand", Condition = "Good", BoardId = Guid.NewGuid() };

    private static Incident Inc(Tool tool, IncidentStatus status, DateTime reportedAt, DateTime? resolvedAt = null) => new()
    {
        Id = Guid.NewGuid(),
        ToolId = tool.Id,
        Tool = tool,
        WorkerId = Guid.NewGuid(),
        ReporterId = Guid.NewGuid(),
        Status = status,
        ReportedAt = reportedAt,
        ResolvedAt = resolvedAt
    };

    [Fact]
    public void BuildReport_ComputesAgingBucketsMttrAndTopTools()
    {
        var now = new DateTime(2026, 07, 08, 12, 0, 0, DateTimeKind.Utc);
        var wrench = ToolNamed("Torque Wrench");
        var caliper = ToolNamed("Caliper");
        var drill = ToolNamed("Drill");
        var gauge = ToolNamed("Old Gauge");

        var incidents = new List<Incident>
        {
            // Active — aging buckets
            Inc(wrench, IncidentStatus.Open,          now.AddHours(-2)),    // <24h
            Inc(caliper, IncidentStatus.PendingReview, now.AddHours(-10)),  // <24h
            Inc(wrench, IncidentStatus.Open,          now.AddHours(-30)),   // 1–3 days
            Inc(caliper, IncidentStatus.Open,         now.AddHours(-50)),   // 1–3 days
            Inc(wrench, IncidentStatus.Open,          now.AddHours(-100)),  // >3 days

            // Resolved in last 7 days — MTTR = avg(2h, 4h) = 3h
            Inc(drill, IncidentStatus.Resolved, now.AddHours(-6), now.AddHours(-4)),
            Inc(drill, IncidentStatus.Resolved, now.AddHours(-8), now.AddHours(-4)),

            // Resolved 10 days ago — excluded from the 7-day MTTR window
            Inc(gauge, IncidentStatus.Resolved, now.AddDays(-11), now.AddDays(-10)),
        };

        var r = MissingToolsReportJob.BuildReport(incidents, now);

        r.TotalActive.Should().Be(5);
        r.Under24h.Should().Be(2);
        r.OneToThreeDays.Should().Be(2);
        r.OverThreeDays.Should().Be(1);

        r.ResolvedLast7Days.Should().Be(2);
        r.Mttr.Should().NotBeNull();
        r.Mttr!.Value.TotalHours.Should().BeApproximately(3.0, 0.001);

        // Top tool by count is the wrench (3); ties (Caliper & Drill at 2) break alphabetically.
        r.TopTools[0].Should().Be(new TopTool("Torque Wrench", 3));
        r.TopTools[1].Name.Should().Be("Caliper");
        r.TopTools.Should().HaveCount(4);
    }

    [Fact]
    public void BuildReport_NoResolvedIncidents_MttrIsNull()
    {
        var now = DateTime.UtcNow;
        var incidents = new List<Incident> { Inc(ToolNamed("Hammer"), IncidentStatus.Open, now.AddHours(-1)) };

        var r = MissingToolsReportJob.BuildReport(incidents, now);

        r.Mttr.Should().BeNull();
        r.ResolvedLast7Days.Should().Be(0);
    }

    [Fact]
    public async Task RunAsync_WithManagerEmail_SendsHtmlDigest()
    {
        using var db = NewDb();
        var wrench = new Tool { Id = Guid.NewGuid(), Name = "Torque Wrench", Type = "Hand", Condition = "Good", BoardId = Guid.NewGuid() };
        db.Tools.Add(wrench);
        db.Incidents.AddRange(
            Inc(wrench, IncidentStatus.Open, DateTime.UtcNow.AddHours(-2)),
            Inc(wrench, IncidentStatus.Resolved, DateTime.UtcNow.AddHours(-5), DateTime.UtcNow.AddHours(-2)));
        await db.SaveChangesAsync();

        var email = new CapturingEmailService();
        var job = new MissingToolsReportJob(db, email, ConfigWith("manager@factory.local"), NullLogger<MissingToolsReportJob>.Instance);

        await job.RunAsync();

        email.Sent.Should().HaveCount(1);
        var sent = email.Sent[0];
        sent.To.Should().Be("manager@factory.local");
        sent.Subject.Should().Contain("Missing Tools");
        sent.Content.Should().Contain("Torque Wrench");
        sent.Content.Should().Contain("Open &amp; pending: 1");
    }

    [Fact]
    public async Task RunAsync_WithoutManagerEmail_DoesNotSend()
    {
        using var db = NewDb();
        var email = new CapturingEmailService();
        var job = new MissingToolsReportJob(db, email, ConfigWith(""), NullLogger<MissingToolsReportJob>.Instance);

        await job.RunAsync();

        email.Sent.Should().BeEmpty(); // no recipient => logs the HTML instead of sending
    }

    private static ApplicationDbContext NewDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"job-test-{Guid.NewGuid()}")
            .Options);

    private static IConfiguration ConfigWith(string managerEmail) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Reports:ManagerEmail"] = managerEmail })
            .Build();

    private sealed class CapturingEmailService : IEmailService
    {
        public readonly List<(string To, string Subject, string Content)> Sent = new();
        public Task SendEmailAsync(string toEmail, string subject, string content)
        {
            Sent.Add((toEmail, subject, content));
            return Task.CompletedTask;
        }
    }
}
