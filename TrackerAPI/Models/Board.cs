using System;

namespace TrackerAPI.Models
{
    public class Board
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? QrCodeUrl { get; set; }
    }
}
