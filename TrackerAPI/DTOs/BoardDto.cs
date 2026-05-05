using System;
using System.ComponentModel.DataAnnotations;

namespace TrackerAPI.DTOs
{
    public class BoardDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? QrCodeUrl { get; set; }
    }

    public class CreateBoardDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Location { get; set; } = string.Empty;

        public string? QrCodeUrl { get; set; }
    }

    public class UpdateBoardDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Location { get; set; } = string.Empty;

        public string? QrCodeUrl { get; set; }
    }
}
