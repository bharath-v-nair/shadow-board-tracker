# Klipspringer Shadow Board Tracker

## Project Overview

The Klipspringer Shadow Board Tracker is a Progressive Web App (PWA) designed to streamline quality assurance inspections and tool inventory management. It provides an intuitive interface for QA inspectors to scan shadow board QR codes, view assigned tools, and instantly report missing items. 

Upon reporting a missing tool, the system automatically assigns a recovery task to an available worker and dispatches a notification via email. Workers can seamlessly resolve and close these incidents using a secure "Magic Link" included in their email, requiring no authentication or login overhead.

**V2 Features:**
* **Role-Based Access Control (RBAC):** Secure differentiation between QA inspectors (who report issues) and Workers (who resolve them).
* **Audit Trails:** Comprehensive tracking of who reported an incident and when it was resolved, ensuring accountability across the factory floor.
* **Maker-Checker Verification Loop:** A strict workflow where Workers can mark tasks as resolved, but QA Inspectors must physically verify the tool and officially "Close" or "Reject" the resolution.
* **Mobile-First QA Command Center:** A streamlined dashboard featuring real-time triage, aging incident tracking (MTTR metrics), and color-coded status tabs for rapid on-the-floor operations.
* **Real-Time Shift Management:** Tracks physical worker presence via a shift roster to optimize task assignments, ensuring incidents are only routed to staff currently active on the factory floor.
* **PWA-Optimized OTP Authentication:** A passwordless, invite-only authentication system using a 6-digit OTP code delivered via email. Designed specifically to keep users inside the installed PWA shell, eliminating the mobile OS context-switch that magic links force when they open the default browser.
* **Installable PWA:** Integrated with a web manifest allowing the application to be installed directly to a mobile device's home screen, launching in a full-screen, chromeless native-like window.
* **Cross-Device Local Network Testing Setup:** The development environment is configured to bind both servers (API and Angular dev server) to the wildcard IP (`0.0.0.0`), enabling live testing on physical mobile hardware on the same Wi-Fi subnet without a production deployment.
* **Board CRUD Operations:** QA Administrators can create, update, and delete shadow boards and their associated tool inventories directly from the application.
* **Minimalist Mobile-First UI:** A clean, Tailwind-driven interface designed for one-handed factory operations, replacing rigid tables and lists with intuitive, color-coded accent cards.
* **JIT Global Dictionaries:** A highly optimized "Just-In-Time" data fetching architecture that pushes deduplication to the SQL layer, ensuring autocomplete fields (like Tool Names) are always 100% synchronized globally across the factory floor without caching overhead.
* **Dynamic QR Code Engine & Hardware Printing:** An on-the-fly QR code generation system that allows QA managers to customize board labels (size, logos, titles). Utilizing a stateless configuration architecture and an advanced `@media print` CSS strategy (with absolute layout decoupling), the system bypasses browser print engine stretching bugs to guarantee pixel-perfect proportions when sent to physical A4 hardware printers.

## Tech Stack

**Frontend**
* Angular (v17+) PWA
* Standalone Components & Signals
* TypeScript
* Tailwind CSS
* Angular Material
* `@zxing/ngx-scanner` (QR scanning capabilities)

**Backend & Persistence**
* .NET 10 Web API (C#)
* Entity Framework Core (EF Core)
* SQL Server
* SendGrid (Automated email dispatch)

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

* [.NET 10 SDK](https://dotnet.microsoft.com/download)
* [Node.js](https://nodejs.org/) (v18.x or higher recommended)
* [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)
* [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or a local Docker instance of SQL Server)

## Local Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/shadow-board-tracker.git
cd shadow-board-tracker
```

### 2. Backend Setup (.NET Web API)

Navigate to the API project directory and configure the database.

```bash
cd TrackerAPI
```

Ensure your `appsettings.Development.json` is properly configured. You will need:
1. A valid SQL Server connection string under `ConnectionStrings:DefaultConnection`.
2. A valid SendGrid API Key under `SendGrid:ApiKey` to enable email dispatch for authentication magic links.

Run Entity Framework Core migrations to set up the database schema:

```bash
dotnet ef database update
```

**Note:** Running this command will also execute the built-in EF Core seed scripts. This automatically populates the database with initial sample data, including a test Worker, ensuring you can immediately test the email dispatch and JWT authentication flows locally.

Run the API:

```bash
dotnet run
```

The API will run on `http://localhost:5029`.

Once the backend is running, you can explore the available API endpoints and test requests interactively by navigating to the Swagger UI:
* `http://localhost:5029/swagger`

### 3. Frontend Setup (Angular)

In a second terminal window (keeping the .NET API running), navigate to the frontend directory (`tracker-ui`) and install dependencies.

```bash
cd tracker-ui
npm install
```

Start the development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser. 

**CRITICAL: CORS & Browser Caching**
During local development, browsers like Chrome aggressively cache CORS preflight (OPTIONS) requests. If you encounter persistent CORS errors despite backend configuration, **you must run your frontend in an Incognito/Private window** to bypass this local cache.

### 4. Troubleshooting

If the Angular frontend exhibits strange behavior or fails to build after pulling new changes:

1. Wipe the `node_modules` and the `.angular` cache.
2. Reinstall dependencies.

```bash
rm -rf node_modules
rm -rf .angular
npm cache clean --force
npm install
```

### 5. Local Mobile Testing

To test the application on a physical mobile device connected to the same Wi-Fi network as your development machine, you must bind both servers to the wildcard IP address (`0.0.0.0`) to break out of the local loopback interface.

1. **Find your Mac's IP address** (e.g., run `ipconfig getifaddr en0` in the terminal). Let's assume it's `192.168.1.2`.
2. **Update the Angular Environment:** Temporarily modify `src/environments/environment.ts` to point `apiUrl` to your IP: `'http://192.168.1.2:5029/api'`.
3. **Run the Backend on all interfaces:**
   ```bash
   cd TrackerAPI
   dotnet run --urls "http://0.0.0.0:5029"
   ```
4. **Run the Frontend on all interfaces:**
   ```bash
   cd tracker-ui
   ng serve --host 0.0.0.0
   ```
5. **Access on Mobile:** Open your mobile browser and navigate to `http://192.168.1.2:4200`.

## Roadmap

The following features are planned or currently in progress:

| Feature | Status |
|---|---|
| Dynamic QR Generation & Printing | ✅ Complete (Phase 16) |
| Board & Tool CRUD Operations | ✅ Complete (Phase 15) |
| Cross-Device Local Network Testing | ✅ Complete (Phase 14) |
| Production Docker Deployment | 🔜 Planned |
| PWA Service Worker Offline Caching | ⏳ Deferred to Final Deployment Phase |

> **Note on Offline Caching:** The Angular Service Worker is intentionally **not activated** in the development (`ng serve`) environment. Enabling aggressive asset caching during active development creates cache-invalidation conflicts that interfere with hot-module reloading and rapid iteration. The Service Worker will be fully configured and enabled as part of the final production build and deployment phase.
