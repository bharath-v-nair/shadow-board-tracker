using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using TrackerAPI.Data;
using TrackerAPI.Interfaces;
using Azure.Identity;
using TrackerAPI.Services;
using TrackerAPI.Hubs;
using TrackerAPI.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Azure Key Vault Integration
var keyVaultUriStr = builder.Configuration["KeyVaultUri"];
if (!string.IsNullOrEmpty(keyVaultUriStr))
{
    var keyVaultUri = new Uri(keyVaultUriStr);
    builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());
}


// Add these two lines if they aren't there already:
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();


// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        // In containers the SQL server may still be finishing its boot when the API's
        // startup Migrate() fires. EnableRetryOnFailure transparently retries transient
        // connection errors instead of crashing the app on the first refused connection.
        sql => sql.EnableRetryOnFailure()));

builder.Services.AddControllers();

//MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// SignalR for real-time incident push. Force camelCase on the hub payload so pushed
// objects match the REST API's casing (and the Angular Incident model's field names) —
// SignalR's JSON protocol does not camelCase by default, the MVC pipeline does.
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// Broadcasts incident changes from the command handlers to all connected clients.
builder.Services.AddScoped<IIncidentNotifier, IncidentNotifier>();

// Distributed cache (cache-aside, Phase 23). If a Redis connection string is configured
// we back the cache with Redis (shared across every API instance — the correctness win for
// Azure scale-out); otherwise we fall back to an in-process distributed memory cache so
// tests and non-Docker `dotnet run` work with ZERO extra setup. Both implement the same
// IDistributedCache, so RedisCacheService and every handler are unchanged either way.
var redisConnection = builder.Configuration["Redis:ConnectionString"];
if (!string.IsNullOrEmpty(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "shadowboard:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}
builder.Services.AddSingleton<ICacheService, RedisCacheService>();

// Enable Application Insights only when a connection string is actually configured
// (it is in Azure via app settings). Registering it without one throws at startup, which
// would break the secret-free Docker container running with ASPNETCORE_ENVIRONMENT=Production.
var appInsightsConnection = builder.Configuration["ApplicationInsights:ConnectionString"]
    ?? builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
if (!builder.Environment.IsDevelopment() && !string.IsNullOrEmpty(appInsightsConnection))
{
    builder.Services.AddApplicationInsightsTelemetry();
}

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Notification transport is abstracted behind IEmailService and chosen by config, so the
// provider is a deployment concern, not a code change. Default is plain SMTP (MailKit) —
// smtp4dev for dev/demos, any real SMTP provider (Brevo, etc.) in prod. SendGrid is kept
// as a documented alternate for Email:Provider=SendGrid.
var emailProvider = builder.Configuration["Email:Provider"] ?? "Smtp";
if (emailProvider.Equals("SendGrid", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IEmailService, SendGridEmailService>();
}
else
{
    builder.Services.AddScoped<IEmailService, SmtpEmailService>();
}

var secretKey = builder.Configuration["Jwt:SecretKey"];
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey ?? throw new InvalidOperationException("JWT Secret is missing"))),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };

    // WebSocket gotcha: browsers can't set an Authorization header on a WebSocket, so the
    // SignalR client passes the JWT in the "access_token" query string (via accessTokenFactory).
    // Pull it out — but ONLY for /hubs paths, so normal /api requests still use the header.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{

    // app.UseSwagger();
    // app.UseSwaggerUI();


    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseMiddleware<ExceptionMiddleware>();

// CORS + SignalR gotcha: a browser refuses AllowAnyOrigin("*") together with credentials,
// and the SignalR client sends credentials by default. In THIS project the Angular dev
// proxy (proxy.conf.json) forwards /api and /hubs server-side, so the browser already sees
// same-origin and CORS never actually fires; production is a unified same-origin SPA. We
// still make the policy credential-safe per environment as defense-in-depth in case the SPA
// is ever pointed directly at the API cross-origin.
if (app.Environment.IsDevelopment())
{
    // Reflect the caller's origin (instead of "*") so AllowCredentials is legal for SignalR.
    app.UseCors(policy => policy
        .SetIsOriginAllowed(_ => true)
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
}
else
{
    app.UseCors(policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .WithHeaders("Authorization", "Content-Type", "Accept"));
}



app.UseAuthentication();
app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();

// Map the hub BEFORE the SPA fallback, otherwise MapFallbackToFile would swallow the
// /hubs/incidents route and serve index.html instead of completing the negotiate handshake.
app.MapHub<IncidentHub>("/hubs/incidents");

app.MapFallbackToFile("index.html");


//tell azure to build db tables when starting up
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    // Relational providers (SQL Server) apply EF migrations. The in-memory provider
    // used by integration tests is not relational, so we just ensure the store exists
    // (this also applies HasData seed data for the in-memory case).
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
    DbInitializer.Initialize(db);
}
app.Run();

// Exposed so the integration test project (WebApplicationFactory<Program>) can boot the real app.
public partial class Program { }
