using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;
using TrackerAPI.Models;

namespace TrackerAPI.Jobs
{
    /// <summary>
    /// Nightly operations digest for the factory manager: how many tools are still missing and how
    /// old, how fast we resolved last week (MTTR), and which tools go missing most. Runs on a
    /// Hangfire recurring schedule (23:00 IST) and can be triggered on demand for demos.
    ///
    /// Idempotent: running it twice sends two identical emails but changes no state — it only reads.
    /// That's acceptable here because the "side effect" is an informational email, not a mutation.
    /// It would NOT be acceptable if the job, say, created invoices or charged a card; there you'd
    /// need a dedup key / "already ran for date D" guard. (See postmortem §3.)
    /// </summary>
    public class MissingToolsReportJob
    {
        private readonly ApplicationDbContext _db;
        private readonly IEmailService _email;
        private readonly IConfiguration _config;
        private readonly ILogger<MissingToolsReportJob> _logger;

        public MissingToolsReportJob(
            ApplicationDbContext db,
            IEmailService email,
            IConfiguration config,
            ILogger<MissingToolsReportJob> logger)
        {
            _db = db;
            _email = email;
            _config = config;
            _logger = logger;
        }

        // Hangfire invokes this. Kept parameterless so the serialized job payload is trivial and
        // survives app restarts (the job "arguments" live in SQL as an empty list).
        public async Task RunAsync()
        {
            var nowUtc = DateTime.UtcNow;

            // A nightly report is not a hot path, so a couple of straightforward reads + in-memory
            // aggregation is fine and provider-agnostic (works identically on SQL and EF InMemory).
            var incidents = await _db.Incidents
                .Include(i => i.Tool)
                .ToListAsync();

            var report = BuildReport(incidents, nowUtc);
            var html = RenderHtml(report);
            var subject = $"Shadow Board — Missing Tools Report ({report.GeneratedAtIst:dd MMM yyyy})";

            var managerEmail = _config["Reports:ManagerEmail"];
            if (!string.IsNullOrWhiteSpace(managerEmail))
            {
                await _email.SendEmailAsync(managerEmail, subject, html);
                _logger.LogInformation("Missing-tools report emailed to {Manager}.", managerEmail);
            }
            else
            {
                // No recipient configured (e.g. local demo without SMTP): log the HTML so the job
                // still produces visible output and the demo works end to end.
                _logger.LogInformation("Missing-tools report (no Reports:ManagerEmail configured):\n{Html}", html);
            }
        }

        // ── Pure aggregation (no I/O) — trivially unit-testable ────────────────────────────────
        public static MissingToolsReport BuildReport(IReadOnlyCollection<Incident> incidents, DateTime nowUtc)
        {
            var active = incidents
                .Where(i => i.Status == IncidentStatus.Open || i.Status == IncidentStatus.PendingReview)
                .ToList();

            int under24h = 0, oneToThreeDays = 0, overThreeDays = 0;
            foreach (var i in active)
            {
                var age = nowUtc - i.ReportedAt;
                if (age < TimeSpan.FromHours(24)) under24h++;
                else if (age <= TimeSpan.FromDays(3)) oneToThreeDays++;
                else overThreeDays++;
            }

            // MTTR over incidents RESOLVED in the last 7 days.
            var sevenDaysAgo = nowUtc.AddDays(-7);
            var recentlyResolved = incidents
                .Where(i => i.Status == IncidentStatus.Resolved
                            && i.ResolvedAt.HasValue
                            && i.ResolvedAt.Value >= sevenDaysAgo)
                .ToList();

            TimeSpan? mttr = recentlyResolved.Count > 0
                ? TimeSpan.FromTicks((long)recentlyResolved.Average(i => (i.ResolvedAt!.Value - i.ReportedAt).Ticks))
                : null;

            var topTools = incidents
                .GroupBy(i => i.ToolId)
                .Select(g => new TopTool(
                    g.First().Tool?.Name ?? "(unknown tool)",
                    g.Count()))
                .OrderByDescending(t => t.Count)
                .ThenBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
                .Take(5)
                .ToList();

            // Present the timestamp in the business timezone the schedule uses.
            var ist = ResolveIndiaTimeZone();
            var generatedAtIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, ist);

            return new MissingToolsReport(
                TotalActive: active.Count,
                Under24h: under24h,
                OneToThreeDays: oneToThreeDays,
                OverThreeDays: overThreeDays,
                ResolvedLast7Days: recentlyResolved.Count,
                Mttr: mttr,
                TopTools: topTools,
                GeneratedAtIst: generatedAtIst);
        }

        public static string RenderHtml(MissingToolsReport r)
        {
            var sb = new StringBuilder();
            sb.Append("<div style=\"font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:640px\">");
            sb.Append("<h2 style=\"color:#e56a14;margin-bottom:4px\">Missing Tools — Daily Report</h2>");
            sb.Append($"<p style=\"color:#6b7280;margin-top:0\">Generated {r.GeneratedAtIst:dd MMM yyyy, HH:mm} IST</p>");

            sb.Append($"<h3>Open &amp; pending: {r.TotalActive}</h3>");
            sb.Append("<table cellpadding=\"6\" style=\"border-collapse:collapse;width:100%\">");
            sb.Append(Row("Reported &lt; 24h", r.Under24h));
            sb.Append(Row("Aged 1–3 days", r.OneToThreeDays));
            sb.Append(Row("Overdue &gt; 3 days", r.OverThreeDays, highlight: r.OverThreeDays > 0));
            sb.Append("</table>");

            sb.Append("<h3>Resolution (last 7 days)</h3>");
            sb.Append($"<p>Resolved: <strong>{r.ResolvedLast7Days}</strong>");
            sb.Append(r.Mttr.HasValue
                ? $" &middot; Mean time to resolve: <strong>{FormatDuration(r.Mttr.Value)}</strong></p>"
                : " &middot; Mean time to resolve: <strong>n/a</strong></p>");

            sb.Append("<h3>Most-reported tools</h3>");
            if (r.TopTools.Count == 0)
            {
                sb.Append("<p style=\"color:#6b7280\">No incidents recorded yet.</p>");
            }
            else
            {
                sb.Append("<ol>");
                foreach (var t in r.TopTools)
                    sb.Append($"<li>{System.Net.WebUtility.HtmlEncode(t.Name)} — {t.Count} report(s)</li>");
                sb.Append("</ol>");
            }

            sb.Append("<p style=\"color:#9ca3af;font-size:12px\">Automated report from ShadowBoard Tracker.</p>");
            sb.Append("</div>");
            return sb.ToString();

            static string Row(string label, int value, bool highlight = false)
            {
                var color = highlight ? "#dc2626" : "#111827";
                return $"<tr style=\"border-bottom:1px solid #e5e7eb\"><td>{label}</td>" +
                       $"<td style=\"text-align:right;font-weight:600;color:{color}\">{value}</td></tr>";
            }
        }

        public static string FormatDuration(TimeSpan t)
        {
            if (t.TotalDays >= 1) return $"{t.TotalDays:0.0} days";
            if (t.TotalHours >= 1) return $"{t.TotalHours:0.0} hours";
            return $"{t.TotalMinutes:0} min";
        }

        /// <summary>
        /// Windows uses "India Standard Time"; Linux containers (and the CI runner) use the IANA id
        /// "Asia/Kolkata". Try both so the same code schedules correctly on either OS; fall back to
        /// UTC rather than throwing if neither is present.
        /// </summary>
        public static TimeZoneInfo ResolveIndiaTimeZone()
        {
            foreach (var id in new[] { "India Standard Time", "Asia/Kolkata" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
                catch (TimeZoneNotFoundException) { }
                catch (InvalidTimeZoneException) { }
            }
            return TimeZoneInfo.Utc;
        }
    }

    public record MissingToolsReport(
        int TotalActive,
        int Under24h,
        int OneToThreeDays,
        int OverThreeDays,
        int ResolvedLast7Days,
        TimeSpan? Mttr,
        IReadOnlyList<TopTool> TopTools,
        DateTime GeneratedAtIst);

    public record TopTool(string Name, int Count);
}
