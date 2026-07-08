using FluentValidation;
using TrackerAPI.Application.Features.Tools.Commands;

namespace TrackerAPI.Application.Features.Tools.Validators
{
    // Shared condition whitelist mirrors the DTO's [RegularExpression] — but lives here as a
    // domain rule so it applies on EVERY dispatch path, not only through model binding.
    internal static class ToolRules
    {
        public static readonly string[] AllowedConditions = { "Good", "Damaged", "Lost" };
    }

    public class CreateToolCommandValidator : AbstractValidator<CreateToolCommand>
    {
        public CreateToolCommandValidator()
        {
            RuleFor(x => x.Dto).NotNull();

            RuleFor(x => x.Dto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.Dto.Type)
                .NotEmpty().WithMessage("Type is required.")
                .Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("Type cannot be blank.")
                .MaximumLength(50);

            RuleFor(x => x.Dto.Condition)
                .Must(c => ToolRules.AllowedConditions.Contains(c))
                .WithMessage("Condition must be 'Good', 'Damaged', or 'Lost'.");

            RuleFor(x => x.Dto.BoardId).NotEmpty().WithMessage("BoardId is required.");
        }
    }

    public class UpdateToolCommandValidator : AbstractValidator<UpdateToolCommand>
    {
        public UpdateToolCommandValidator()
        {
            RuleFor(x => x.Dto).NotNull();
            RuleFor(x => x.Dto.Id).NotEmpty().WithMessage("Id is required.");

            RuleFor(x => x.Dto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.Dto.Type)
                .NotEmpty().WithMessage("Type is required.")
                .Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("Type cannot be blank.")
                .MaximumLength(50);

            RuleFor(x => x.Dto.Condition)
                .Must(c => ToolRules.AllowedConditions.Contains(c))
                .WithMessage("Condition must be 'Good', 'Damaged', or 'Lost'.");

            RuleFor(x => x.Dto.BoardId).NotEmpty().WithMessage("BoardId is required.");
        }
    }
}
