using System;

namespace TrackerAPI.Models
{
    public class Tool
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? IconName { get; set; }
        public string Condition { get; set; } = string.Empty;
        public Guid BoardId { get; set; }
        public Board? Board { get; set; }
    }
}
