using FluentValidation;
using TrackerAPI.Application.Features.Boards.Commands;

namespace TrackerAPI.Application.Features.Boards.Validators
{
    // Business-rule validation of the COMMAND (including its nested DTO). This is the second
    // validation layer: [Required] on the DTO catches transport-shape problems at model binding;
    // these rules encode what a *valid board* means to the domain (trimmed, non-empty, bounded).
    public class CreateBoardCommandValidator : AbstractValidator<CreateBoardCommand>
    {
        public CreateBoardCommandValidator()
        {
            RuleFor(x => x.Dto).NotNull();

            RuleFor(x => x.Dto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.Dto.Location)
                .NotEmpty().WithMessage("Location is required.")
                .Must(l => !string.IsNullOrWhiteSpace(l)).WithMessage("Location cannot be blank.")
                .MaximumLength(200);
        }
    }

    public class UpdateBoardCommandValidator : AbstractValidator<UpdateBoardCommand>
    {
        public UpdateBoardCommandValidator()
        {
            RuleFor(x => x.Dto).NotNull();
            RuleFor(x => x.Dto.Id).NotEmpty().WithMessage("Id is required.");

            RuleFor(x => x.Dto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.Dto.Location)
                .NotEmpty().WithMessage("Location is required.")
                .Must(l => !string.IsNullOrWhiteSpace(l)).WithMessage("Location cannot be blank.")
                .MaximumLength(200);
        }
    }
}
