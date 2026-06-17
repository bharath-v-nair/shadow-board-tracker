using System;
using System.Threading;
using System.Threading.Tasks;

namespace TrackerAPI.Interfaces
{
    /// <summary>
    /// Pushes incident changes to every connected client over SignalR. Command handlers
    /// depend on this abstraction (not on IHubContext directly) so the broadcast shape —
    /// the enriched IncidentDto — lives in exactly one place and the handlers stay focused
    /// on their write logic.
    /// </summary>
    public interface IIncidentNotifier
    {
        /// <summary>
        /// Re-loads the incident, projects the enriched DTO (tool/board/people names) and
        /// broadcasts it as "IncidentChanged" so clients can upsert it without calling back
        /// to the API. Call AFTER SaveChangesAsync.
        /// </summary>
        Task IncidentChangedAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Broadcasts "IncidentDeleted" with just the id so clients can drop the card.
        /// The row is already gone, so there is nothing to re-load.
        /// </summary>
        Task IncidentDeletedAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
