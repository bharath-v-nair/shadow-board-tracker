using System;
using System.ComponentModel.DataAnnotations;

namespace TrackerAPI.DTOs
{
    public class ToolDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? IconName { get; set; }
        public string Condition { get; set; } = string.Empty;
        public Guid BoardId { get; set; }
    }

    public class CreateToolDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        public string? IconName { get; set; }

        [Required]
        [RegularExpression("^(Good|Defective|Lost)$", ErrorMessage = "Condition must be 'Good', 'Defective', or 'Lost'")]
        public string Condition { get; set; } = string.Empty;

        [Required]
        public Guid BoardId { get; set; }
    }

    public class UpdateToolDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        public string? IconName { get; set; }

        [Required]
        [RegularExpression("^(Good|Defective|Lost)$", ErrorMessage = "Condition must be 'Good', 'Defective', or 'Lost'")]
        public string Condition { get; set; } = string.Empty;

        [Required]
        public Guid BoardId { get; set; }
    }
}
