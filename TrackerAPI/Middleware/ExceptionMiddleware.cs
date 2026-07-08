using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using FluentValidation;

namespace TrackerAPI.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        // camelCase to match the rest of the API's JSON contract (MVC + SignalR both camelCase).
        private static readonly JsonSerializerOptions JsonOptions =
            new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Proceed to the next middleware (or controller) in the pipeline
                await _next(context);
            }
            catch (ValidationException validationException)
            {
                // Thrown by ValidationBehavior when a command fails its FluentValidation rules.
                // This is an expected client error (bad input), NOT a server fault — so it maps
                // to a 400 with a structured field->messages contract, and is logged at Warning.
                _logger.LogWarning(
                    "Validation failed: {Message}", validationException.Message);
                await HandleValidationExceptionAsync(context, validationException);
            }
            catch (Exception ex)
            {
                // If anything crashes, catch it here!
                // This automatically sends the stack trace to Application Insights
                _logger.LogError(ex, $"Something went wrong: {ex.Message}");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleValidationExceptionAsync(HttpContext context, ValidationException exception)
        {
            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

            // Group failures by field into { field: [messages...] }. FluentValidation reports the
            // property path (e.g. "Dto.Name"); we expose the leaf ("Name") so the contract matches
            // the client-facing field names, not our internal command shape.
            var errors = exception.Errors
                .GroupBy(f => LeafPropertyName(f.PropertyName))
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(f => f.ErrorMessage).Distinct().ToArray());

            // RFC 7807 ProblemDetails — the standard machine-readable error contract, shaped like
            // ASP.NET's own ValidationProblemDetails so clients can treat both the same way.
            var problem = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                title = "One or more validation errors occurred.",
                status = context.Response.StatusCode,
                errors
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(problem, JsonOptions));
        }

        private static string LeafPropertyName(string propertyName)
        {
            if (string.IsNullOrEmpty(propertyName)) return propertyName;
            var lastDot = propertyName.LastIndexOf('.');
            return lastDot >= 0 ? propertyName[(lastDot + 1)..] : propertyName;
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            // Return a clean JSON object instead of an ugly HTML stack trace
            var response = new
            {
                StatusCode = context.Response.StatusCode,
                Message = "Internal Server Error from Global Middleware"
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
