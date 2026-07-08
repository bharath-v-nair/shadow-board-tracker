using FluentValidation;
using TrackerAPI.Application.Features.Workers.Commands;

namespace TrackerAPI.Application.Features.Workers.Validators
{
    // NOTE on role: the Create/Update worker DTOs intentionally carry NO role field — a worker's
    // Role is assigned server-side (defaults to "Worker"; QA/DemoViewer are seeded/promoted, not
    // client-set) so there is no untrusted role value to validate here. If a role were ever made
    // client-settable, the rule would be: RuleFor(x => x.Role).Must(r => Roles.Contains(r)).
    public class CreateWorkerCommandValidator : AbstractValidator<CreateWorkerCommand>
    {
        public CreateWorkerCommandValidator()
        {
            RuleFor(x => x.CreateWorkerDto).NotNull();

            RuleFor(x => x.CreateWorkerDto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.CreateWorkerDto.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Email must be a valid email address.");
        }
    }

    public class UpdateWorkerCommandValidator : AbstractValidator<UpdateWorkerCommand>
    {
        public UpdateWorkerCommandValidator()
        {
            RuleFor(x => x.UpdateWorkerDto).NotNull();
            RuleFor(x => x.UpdateWorkerDto.Id).NotEmpty().WithMessage("Id is required.");

            RuleFor(x => x.UpdateWorkerDto.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name cannot be blank.")
                .MaximumLength(100);

            RuleFor(x => x.UpdateWorkerDto.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Email must be a valid email address.");
        }
    }
}
