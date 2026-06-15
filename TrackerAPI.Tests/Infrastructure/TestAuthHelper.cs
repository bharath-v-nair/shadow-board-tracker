using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TrackerAPI.Tests.Infrastructure;

/// <summary>
/// Mints JWTs identical in shape to the ones AuthController issues (same claims,
/// same HMAC-SHA256 signing, same secret key the test host validates against).
/// This lets us drive the real [Authorize(Roles = ...)] pipeline from tests.
/// </summary>
public static class TestAuthHelper
{
    public static string CreateToken(string role, string? name = null, Guid? userId = null)
    {
        var keyBytes = Encoding.UTF8.GetBytes(CustomWebApplicationFactory.JwtSecretKey);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, (userId ?? Guid.NewGuid()).ToString()),
                new Claim(ClaimTypes.Name, name ?? $"Test {role}"),
                new Claim(ClaimTypes.Role, role),
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256Signature),
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }
}
