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
