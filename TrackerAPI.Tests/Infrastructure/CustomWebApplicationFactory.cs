using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
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

        // Same build-time-read problem for Hangfire: Program.cs decides whether to register
        // Hangfire.SqlServer while building the host. Hangfire.SqlServer cannot run against the
        // EF InMemory provider and would fail at startup, so force it off via the env var (the
        // one source guaranteed present in time). Without this, every integration test breaks.
        Environment.SetEnvironmentVariable("Hangfire__Enabled", "false");
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
                // Blank out Redis (appsettings.Development.json points it at localhost:6379,
                // which isn't running in CI). Program.cs then registers AddDistributedMemoryCache
                // — a REAL working distributed cache — so the cache-aside path is exercised
                // hermetically without a Redis container.
                ["Redis:ConnectionString"] = "",
                // Belt-and-suspenders with the env var above: keep Hangfire off in tests.
                ["Hangfire:Enabled"] = "false",
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

            // Swap real Azure Blob storage for an in-memory fake (no Azurite needed). IsEnabled
            // is true so the upload happy-path and validation branches are exercised end to end;
            // GetReadUrl returns a deterministic fake URL so DTO assertions can check for it.
            RemoveAll(services, typeof(IPhotoStorageService));
            services.AddSingleton<IPhotoStorageService, FakePhotoStorageService>();

            // Give EACH factory instance its OWN distributed cache. The default
            // AddDistributedMemoryCache registration otherwise bleeds cached entries across
            // the separate factory instances xUnit creates per test class (one class seeds
            // boards:all, another sees it) — flaky cross-class contamination. A fresh
            // MemoryDistributedCache object per factory keeps the cache-aside tests hermetic
            // while still exercising the real RedisCacheService against a real IDistributedCache.
            RemoveAll(services, typeof(IDistributedCache));
            services.AddSingleton<IDistributedCache>(
                new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions())));
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

    /// <summary>
    /// In-memory stand-in for BlobPhotoStorageService. Stores uploaded bytes in a dictionary
    /// keyed by the container-qualified path, so the full upload -> persist PhotoPath -> read URL
    /// flow works without an Azurite container. Thread-safe for parallel test execution.
    /// </summary>
    public sealed class FakePhotoStorageService : IPhotoStorageService
    {
        public readonly System.Collections.Concurrent.ConcurrentDictionary<string, byte[]> Blobs = new();

        public bool IsEnabled => true;

        public Task<string> UploadAsync(Stream content, string contentType, string container, string blobName, CancellationToken cancellationToken = default)
        {
            using var ms = new MemoryStream();
            content.CopyTo(ms);
            var path = $"{container}/{blobName}";
            Blobs[path] = ms.ToArray();
            return Task.FromResult(path);
        }

        // Mirrors the real service's contract: null for empty path, otherwise a stable fake URL.
        public string? GetReadUrl(string? path)
            => string.IsNullOrWhiteSpace(path) ? null : $"https://fake.blob/{path}?sig=test";

        public Task DeleteAsync(string? path, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrWhiteSpace(path)) Blobs.TryRemove(path, out _);
            return Task.CompletedTask;
        }
    }
}
