using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;

namespace TrackerAPI.Application.Behaviors
{
    /// <summary>
    /// A MediatR pipeline behavior = middleware wrapped around every command/query handler
    /// (the "Russian-doll" model, exactly like ASP.NET middleware but INSIDE MediatR).
    /// This one resolves every <see cref="IValidator{TRequest}"/> registered for the incoming
    /// request, runs them all, and — if any fail — throws a single <see cref="ValidationException"/>
    /// carrying ALL failures. ExceptionMiddleware turns that into a 400 ProblemDetails response.
    ///
    /// Why here and not in the controllers: EVERY dispatch path is covered, including callers
    /// that never touch a controller (e.g. Phase 28's AI agent tools that call handlers directly).
    /// Registered as the FIRST (outermost) behavior so invalid requests fail fast, before the
    /// handler — or any inner behavior like logging — does any work.
    /// </summary>
    public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : notnull
    {
        private readonly IEnumerable<IValidator<TRequest>> _validators;

        public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        {
            _validators = validators;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            // No validator registered for this request type => nothing to enforce, pass through.
            if (_validators.Any())
            {
                var context = new ValidationContext<TRequest>(request);

                var results = await Task.WhenAll(
                    _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

                var failures = results
                    .SelectMany(r => r.Errors)
                    .Where(f => f is not null)
                    .ToList();

                if (failures.Count != 0)
                {
                    // One exception carrying every failure across every validator, so the client
                    // sees all field errors at once instead of fixing them one round-trip at a time.
                    throw new ValidationException(failures);
                }
            }

            return await next(cancellationToken);
        }
    }
}
