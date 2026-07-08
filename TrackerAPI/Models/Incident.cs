using System;

namespace TrackerAPI.Models
{
    public class Incident
    {
        public Guid Id { get; set; }
        public Guid ToolId { get; set; }
        public virtual Tool? Tool { get; set; }
        public Guid WorkerId { get; set; }
        public Worker? Worker { get; set; }
        public Guid ReporterId { get; set; }
        public Worker? Reporter { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public IncidentStatus Status { get; set; } = IncidentStatus.Open;

        // Blob path (e.g. "{incidentId}/{guid}.jpg") of an optional evidence photo of the
        // missing/damaged tool. Nullable: photos are optional. We store the PATH, not the blob
        // bytes and not a signed URL — SAS URLs expire, so persisting one would rot. The read
        // URL is minted on demand from this path. See Phase 25 postmortem.
        public string? PhotoPath { get; set; }
    }
}
