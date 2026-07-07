using System;
using System.ComponentModel.DataAnnotations;

namespace TrackerAPI.DTOs
{
    public class WorkerDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public bool IsOnShift { get; set; }
    }

    public class CreateWorkerDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string Email { get; set; } = string.Empty;

        public bool IsAvailable { get; set; } = true;
    }

    public class UpdateWorkerDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string Email { get; set; } = string.Empty;

        public bool IsAvailable { get; set; }
    }
}
