using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrackerAPI.Jobs;

namespace TrackerAPI.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        /// <summary>
        /// Fire the missing-tools report now (for demos), instead of waiting for the nightly run.
        /// Enqueues a fire-and-forget Hangfire job so the HTTP request returns immediately and the
        /// work runs on the background server — the job is visible in the /hangfire dashboard.
        ///
        /// IBackgroundJobClient is injected only when Hangfire is enabled (AddHangfire registers it);
        /// when disabled (e.g. integration tests) it resolves to null and we return 503 rather than
        /// throwing on the static BackgroundJob.Enqueue.
        /// </summary>
        [Authorize(Roles = "QA")]
        [HttpPost("missing-tools/run")]
        public IActionResult RunMissingToolsReport([FromServices] IBackgroundJobClient? jobClient)
        {
            if (jobClient is null)
                return StatusCode(503, "Background jobs are disabled on this instance.");

            var jobId = jobClient.Enqueue<MissingToolsReportJob>(job => job.RunAsync());
            return Accepted(new { jobId, message = "Missing-tools report queued." });
        }
    }
}
