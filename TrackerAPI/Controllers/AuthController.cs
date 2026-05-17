using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Controllers
{
    public class RequestLinkDto
    {
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyTokenDto
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }

    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IEmailService emailService, IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
        }

        [HttpPost("request-link")]
        public async Task<IActionResult> RequestLink(RequestLinkDto request)
        {
            var worker = await _context.Workers.FirstOrDefaultAsync(w => w.Email == request.Email);
            
            if (worker == null)
            {
                // Return Ok even if not found to prevent email enumeration
                return Ok(new { message = "If the email exists, a magic link has been sent." });
            }

            // Generate 6-digit OTP
            var token = Random.Shared.Next(100000, 999999).ToString();
            
            // Save token and 15-minute expiration
            worker.MagicLinkToken = token;
            worker.MagicLinkTokenExpiresAt = DateTime.UtcNow.AddMinutes(15);
            await _context.SaveChangesAsync();

            // Send OTP email
            var emailBody = $"<p>Your Shadow Board Tracker login code is:</p><h2 style='font-size:32px;letter-spacing:8px;font-family:monospace;color:#2563eb'>{token}</h2><p>Enter this code in the app. It expires in <strong>15 minutes</strong>.</p><p>If you did not request this, you can safely ignore this email.</p>";
            
            await _emailService.SendEmailAsync(worker.Email, "Your Shadow Board Tracker Login Code", emailBody);

            return Ok(new { message = "If the email exists, a login code has been sent." });
        }

        [HttpPost("verify")]
        public async Task<IActionResult> Verify(VerifyTokenDto request)
        {
            var worker = await _context.Workers.FirstOrDefaultAsync(w => w.Email == request.Email && w.MagicLinkToken == request.Token);

            if (worker == null || worker.MagicLinkTokenExpiresAt < DateTime.UtcNow)
            {
                return Unauthorized(new { message = "Invalid or expired token." });
            }

            // Clear token
            worker.MagicLinkToken = null;
            worker.MagicLinkTokenExpiresAt = null;
            await _context.SaveChangesAsync();

            // Generate JWT
            var secretKey = _configuration["Jwt:SecretKey"];
            if (string.IsNullOrEmpty(secretKey))
            {
                return StatusCode(500, "JWT secret key is not configured.");
            }

            var keyBytes = Encoding.UTF8.GetBytes(secretKey);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, worker.Id.ToString()),
                    new Claim(ClaimTypes.Email, worker.Email),
                    new Claim(ClaimTypes.Name, worker.Name),
                    new Claim(ClaimTypes.Role, worker.Role)
                }),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.CreateToken(tokenDescriptor);
            var jwtString = tokenHandler.WriteToken(jwtToken);

            return Ok(new { token = jwtString });
        }
    }
}
