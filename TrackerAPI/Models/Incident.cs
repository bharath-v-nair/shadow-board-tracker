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
    }
}
