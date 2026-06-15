using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;

namespace TrackerAPI.Tests.Infrastructure;

/// <summary>
/// Boots the REAL .NET application in-memory (controllers, MediatR pipeline, JWT auth,
/// middleware) but swaps two pieces of infrastructure so tests are fast and hermetic:
///   1. SQL Server  -> EF Core InMemory provider (no database required)
///   2. SendGrid     -> a no-op email service (no real emails sent)
/// Everything else — the MediatR handlers, the [Authorize] attributes, the
/// ExceptionMiddleware — runs exactly as it does in production.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Shared with TestAuthHelper so minted tokens validate against the running app.
    public const string JwtSecretKey = "shadowboard-integration-test-signing-key-256bit-minimum-length!!";

    static CustomWebApplicationFactory()
    {
        // Program.cs reads Jwt:SecretKey while building the host (before the factory's
        // ConfigureAppConfiguration runs), so an env var is the only source guaranteed to
        // be present in time. "__" maps to the ":" config hierarchy. This makes the app
        // validate tokens with the SAME key TestAuthHelper signs them with.
        Environment.SetEnvironmentVariable("Jwt__SecretKey", JwtSecretKey);
    }

    // Unique store name per factory instance keeps test classes isolated from each other.
    private readonly string _dbName = $"ShadowBoardTests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Development => skips AddApplicationInsightsTelemetry() in Program.cs.
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // JWT auth needs a signing key; Program.cs reads this at startup.
                ["Jwt:SecretKey"] = JwtSecretKey,
                // Present so GetConnectionString doesn't return null at registration time.
                ["ConnectionStrings:DefaultConnection"] = "InMemory",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove the SQL Server DbContext registration and re-add an in-memory one.
            // EF Core 10 applies the provider via IDbContextOptionsConfiguration<T>, so it
            // must be removed too — otherwise UseSqlServer + UseInMemory both run and EF
            // throws "Only a single database provider can be registered".
            RemoveAll(services, typeof(IDbContextOptionsConfiguration<ApplicationDbContext>));
            RemoveAll(services, typeof(DbContextOptions<ApplicationDbContext>));
            RemoveAll(services, typeof(DbContextOptions));
            RemoveAll(services, typeof(ApplicationDbContext));

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            // Don't hit SendGrid during tests.
            RemoveAll(services, typeof(IEmailService));
            services.AddScoped<IEmailService, NoOpEmailService>();
        });
    }

    private static void RemoveAll(IServiceCollection services, Type serviceType)
    {
        foreach (var descriptor in services.Where(d => d.ServiceType == serviceType).ToList())
        {
            services.Remove(descriptor);
        }
    }

    private sealed class NoOpEmailService : IEmailService
    {
        public Task SendEmailAsync(string toEmail, string subject, string content) => Task.CompletedTask;
    }
}
