using System.Net;
using Hangfire.Dashboard;

namespace TrackerAPI.Infrastructure
{
    /// <summary>
    /// Authorizes access to the /hangfire dashboard.
    ///
    /// KNOWN PAIN: the Hangfire dashboard authenticates via cookies, not our Bearer JWT, so our
    /// [Authorize(Roles="QA")] pipeline can't guard it directly. Pragmatic call for this project:
    /// allow the dashboard only from local (loopback) requests, plus anything in Development. In a
    /// containerized Production deployment, requests arrive from the Docker/proxy gateway (not
    /// loopback), so the dashboard is effectively locked down there.
    ///
    /// Org-grade options (documented in the postmortem, not built here):
    ///   - Put cookie auth in front of the dashboard (a small login that sets an auth cookie).
    ///   - Terminate at a reverse proxy with an IP allowlist / SSO (oauth2-proxy) in front.
    /// </summary>
    public class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
    {
        private readonly bool _allowAll;

        public HangfireDashboardAuthorizationFilter(bool allowAll)
        {
            _allowAll = allowAll;
        }

        public bool Authorize(DashboardContext context)
        {
            if (_allowAll) return true; // Development

            var http = context.GetHttpContext();
            var remoteIp = http.Connection.RemoteIpAddress;
            if (remoteIp is null) return false;

            // Loopback (127.0.0.1 / ::1) means the request originated on the host itself.
            return IPAddress.IsLoopback(remoteIp);
        }
    }
}
