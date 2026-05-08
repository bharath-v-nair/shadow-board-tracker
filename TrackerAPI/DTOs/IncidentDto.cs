using System;
using System.ComponentModel.DataAnnotations;
using TrackerAPI.Models;

namespace TrackerAPI.DTOs
{
    public class IncidentDto
    {
        public Guid Id { get; set; }
        public Guid ToolId { get; set; }
        public Guid WorkerId { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public IncidentStatus Status { get; set; }
    }

    public class CreateIncidentDto
    {
        [Required]
        public Guid ToolId { get; set; }

        [Required]
        public Guid WorkerId { get; set; }

        [Required]
        public IncidentStatus Status { get; set; }
    }

    public class UpdateIncidentDto
    {
        [Required]
        public Guid Id { get; set; }

        public DateTime? ResolvedAt { get; set; }

        [Required]
        public IncidentStatus Status { get; set; }
    }
}
