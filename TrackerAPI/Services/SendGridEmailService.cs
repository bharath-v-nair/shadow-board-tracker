using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SendGridEmailService> _logger;

        public SendGridEmailService(IConfiguration configuration, ILogger<SendGridEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string content)
        {
            var apiKey = _configuration["SendGrid:ApiKey"];
            var fromEmail = _configuration["SendGrid:FromEmail"];
            var fromName = _configuration["SendGrid:FromName"];

            // No key configured (e.g. the Docker demo stack runs without secrets). Don't
            // crash the request — SendGridClient(null) would throw. Log and no-op so the
            // maker-checker flow still completes; the email is simply not delivered.
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning(
                    "SendGrid:ApiKey not configured — skipping email to {ToEmail} (subject: {Subject}).",
                    toEmail, subject);
                return;
            }

            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var to = new EmailAddress(toEmail);

            // Send email as HTML
            var msg = MailHelper.CreateSingleEmail(from, to, subject, content, content);

            await client.SendEmailAsync(msg);
        }
    }
}
