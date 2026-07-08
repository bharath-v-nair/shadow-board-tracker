# syntax=docker/dockerfile:1
#
# Multi-stage build for the unified SPA (Angular UI baked into the .NET API's wwwroot).
# The build CONTEXT is the repo root (see docker-compose.yml), so both tracker-ui/ and
# TrackerAPI/ are reachable. The final image is the exact same artifact deploy.yml ships
# to Azure App Service — one deployable unit, dev/CI/prod parity.

# ---------------------------------------------------------------------------
# Stage 1 — build the Angular frontend
# node:20 matches the Node version pinned in .github/workflows/deploy.yml.
# ---------------------------------------------------------------------------
FROM node:20 AS frontend
WORKDIR /src/tracker-ui

# Copy ONLY the manifest + lockfile first. Docker caches each layer by the files it
# touches, so as long as these two don't change, the (slow) npm install layer is reused
# even when app source changes. Copying everything up front would bust the cache on
# every code edit.
COPY tracker-ui/package.json tracker-ui/package-lock.json ./
# --legacy-peer-deps mirrors the CI build; the Angular 21 peer graph needs it.
RUN npm ci --legacy-peer-deps

# Now bring in the rest of the frontend source and build the production bundle.
COPY tracker-ui/ ./
RUN npm run build -- --configuration production
# Output lands in /src/tracker-ui/dist/tracker-ui/browser (Angular 21 default layout).

# ---------------------------------------------------------------------------
# Stage 2 — restore + publish the .NET API, embedding the Angular build
# The SDK image (~1GB) has the compiler/CLI; it never ships to prod.
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src

# Copy the csproj alone and restore first — same layer-cache trick as npm above.
# NuGet restore only re-runs when the project file (dependencies) changes.
COPY TrackerAPI/TrackerAPI.csproj TrackerAPI/
RUN dotnet restore TrackerAPI/TrackerAPI.csproj

# Copy the rest of the API source.
COPY TrackerAPI/ TrackerAPI/

# Drop the compiled Angular app into wwwroot so app.UseStaticFiles() +
# MapFallbackToFile("index.html") serve the SPA from the same origin as the API.
# Mirrors the "Copy Angular Build to .NET wwwroot" step in deploy.yml.
COPY --from=frontend /src/tracker-ui/dist/tracker-ui/browser/ TrackerAPI/wwwroot/

RUN dotnet publish TrackerAPI/TrackerAPI.csproj -c Release -o /app/publish --no-restore

# ---------------------------------------------------------------------------
# Stage 3 — runtime only
# aspnet image (~200MB) has the runtime but no SDK/compiler and no source code:
# smaller image, smaller attack surface.
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Kestrel listens on 8080 (App Service and most orchestrators expect the app on a
# single HTTP port; TLS is terminated by the platform in front of the container).
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Run as the built-in non-root user. If the app is ever compromised, the attacker
# does not get root inside the container.
USER $APP_UID

COPY --from=backend /app/publish .
ENTRYPOINT ["dotnet", "TrackerAPI.dll"]
