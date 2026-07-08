using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;

namespace TrackerAPI.Application.Behaviors
{
    /// <summary>
    /// Cross-cutting observability: logs the name of every MediatR request and how long its
    /// handler took, warning when a request crosses a latency budget (500ms). Because it is a
    /// pipeline behavior it applies to EVERY command and query with zero per-handler code — the
    /// point of behaviors. Registered AFTER ValidationBehavior, so it only times requests that
    /// actually reached a handler (rejected-at-validation requests are cheap and uninteresting).
    /// </summary>
    public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : notnull
    {
        private const long SlowRequestThresholdMs = 500;
        private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

        public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
        {
            _logger = logger;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            var requestName = typeof(TRequest).Name;
            var stopwatch = Stopwatch.StartNew();

            var response = await next(cancellationToken);

            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;

            if (elapsedMs > SlowRequestThresholdMs)
            {
                _logger.LogWarning(
                    "Slow request: {RequestName} took {ElapsedMilliseconds}ms (threshold {ThresholdMs}ms)",
                    requestName, elapsedMs, SlowRequestThresholdMs);
            }
            else
            {
                _logger.LogInformation(
                    "Handled {RequestName} in {ElapsedMilliseconds}ms", requestName, elapsedMs);
            }

            return response;
        }
    }
}
