using FluentValidation;
using TrackerAPI.Application.Features.Incidents.Commands;

namespace TrackerAPI.Application.Features.Incidents.Validators
{
    public class CreateIncidentCommandValidator : AbstractValidator<CreateIncidentCommand>
    {
        public CreateIncidentCommandValidator()
        {
            RuleFor(x => x.Dto).NotNull();
            RuleFor(x => x.Dto.ToolId).NotEmpty().WithMessage("ToolId is required.");
            RuleFor(x => x.Dto.WorkerId).NotEmpty().WithMessage("WorkerId is required.");
        }
    }

    public class UpdateIncidentCommandValidator : AbstractValidator<UpdateIncidentCommand>
    {
        public UpdateIncidentCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty().WithMessage("Id is required.");
            RuleFor(x => x.Dto).NotNull();
        }
    }
}
