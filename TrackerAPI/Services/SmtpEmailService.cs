using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Services
{
    /// <summary>
    /// Provider-agnostic email transport over plain SMTP (MailKit). The same code talks to
    /// smtp4dev locally and to any real SMTP provider (Brevo, Mailjet, Resend, SendGrid) in
    /// prod — switching providers is a config change, not a code change. All settings come
    /// from the "Email" config section (env vars in Docker, appsettings for local dev).
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string content)
        {
            var host = _configuration["Email:Host"];

            // Graceful no-op (mirrors the old SendGrid behaviour): with no SMTP host
            // configured — e.g. a secret-free container — log and return instead of crashing
            // the maker-checker flow.
            if (string.IsNullOrWhiteSpace(host))
            {
                _logger.LogWarning(
                    "Email:Host not configured — skipping email to {ToEmail} (subject: {Subject}).",
                    toEmail, subject);
                return;
            }

            var port = int.TryParse(_configuration["Email:Port"], out var parsedPort) ? parsedPort : 587;
            var user = _configuration["Email:User"];
            var password = _configuration["Email:Password"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@shadowboard.local";
            var fromName = _configuration["Email:FromName"] ?? "ShadowBoard Tracker";
            // Default to STARTTLS (real providers on :587); dev catchers set this false.
            var useStartTls = !bool.TryParse(_configuration["Email:UseStartTls"], out var tls) || tls;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;
            message.Body = new BodyBuilder { HtmlBody = content }.ToMessageBody();

            try
            {
                using var client = new SmtpClient();
                var socketOptions = useStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None;
                await client.ConnectAsync(host, port, socketOptions);

                // Authenticate only when credentials are supplied AND the server offers AUTH.
                // Real providers require it; local catchers like smtp4dev advertise no AUTH,
                // so we must not attempt it (MailKit would throw).
                if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(password)
                    && client.Capabilities.HasFlag(SmtpCapabilities.Authentication))
                {
                    await client.AuthenticateAsync(user, password);
                }

                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Email sent to {ToEmail} via {Host}:{Port}.", toEmail, host, port);
            }
            catch (Exception ex)
            {
                // Email is best-effort: the incident is already persisted, so a transport
                // failure must not fail the domain action. Log loudly rather than throw.
                _logger.LogError(ex, "Failed to send email to {ToEmail} via {Host}:{Port}.", toEmail, host, port);
            }
        }
    }
}
