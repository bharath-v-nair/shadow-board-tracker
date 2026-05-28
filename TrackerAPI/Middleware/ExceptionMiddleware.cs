using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace TrackerAPI.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

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
            catch (Exception ex)
            {
                // If anything crashes, catch it here!
                // This automatically sends the stack trace to Application Insights
                _logger.LogError(ex, $"Something went wrong: {ex.Message}");
                await HandleExceptionAsync(context, ex);
            }
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
