using System;

namespace TrackerAPI.Models
{
    public class Worker
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAvailable { get; set; } = true;
        public string Role { get; set; } = "Worker";
        public bool IsOnShift { get; set; } = false;
        public string? MagicLinkToken { get; set; }
        public DateTime? MagicLinkTokenExpiresAt { get; set; }
    }
}
