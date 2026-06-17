using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TrackerAPI.Hubs
{
    /// <summary>
    /// Real-time channel for incident changes. Clients only LISTEN here; the server
    /// broadcasts (via IHubContext from the command handlers), so this class needs no
    /// methods. [Authorize] means only a connection carrying a valid JWT can open the
    /// socket — the token arrives in the "access_token" query string because browsers
    /// cannot set Authorization headers on a WebSocket (see Program.cs OnMessageReceived).
    ///
    /// Roles match GET /api/incidents/all (the endpoint the dashboard reads): a WebSocket
    /// must not leak data the equivalent REST call would refuse. A Worker has no dashboard,
    /// so it has no reason to receive the full incident firehose.
    /// </summary>
    [Authorize(Roles = "QA,DemoViewer")]
    public class IncidentHub : Hub
    {
        // Event names broadcast to clients. Kept as constants so the handlers and tests
        // can't drift from the strings the Angular client subscribes to.
        public const string IncidentChangedEvent = "IncidentChanged";
        public const string IncidentDeletedEvent = "IncidentDeleted";
    }
}
