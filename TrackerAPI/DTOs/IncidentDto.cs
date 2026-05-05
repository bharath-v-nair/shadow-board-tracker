using System;
using System.ComponentModel.DataAnnotations;

namespace TrackerAPI.DTOs
{
    public class IncidentDto
    {
        public Guid Id { get; set; }
        public Guid ToolId { get; set; }
        public Guid WorkerId { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateIncidentDto
    {
        [Required]
        public Guid ToolId { get; set; }

        [Required]
        public Guid WorkerId { get; set; }

        [Required]
        [RegularExpression("^(Open|Closed)$", ErrorMessage = "Status must be 'Open' or 'Closed'")]
        public string Status { get; set; } = string.Empty;
    }

    public class UpdateIncidentDto
    {
        [Required]
        public Guid Id { get; set; }

        public DateTime? ResolvedAt { get; set; }

        [Required]
        [RegularExpression("^(Open|Closed)$", ErrorMessage = "Status must be 'Open' or 'Closed'")]
        public string Status { get; set; } = string.Empty;
    }
}
