# Klipspringer Shadow Board Tracker

## Project Overview

The Klipspringer Shadow Board Tracker is a Progressive Web App (PWA) designed to streamline quality assurance inspections and tool inventory management. It provides an intuitive interface for QA inspectors to scan shadow board QR codes, view assigned tools, and instantly report missing items. 

Upon reporting a missing tool, the system automatically assigns a recovery task to an available worker and dispatches a notification via email. Workers can seamlessly resolve and close these incidents using a secure "Magic Link" included in their email, requiring no authentication or login overhead.

## Tech Stack

**Frontend**
* Angular (v17+)
* TypeScript
* Tailwind CSS
* Angular Material
* `ngx-scanner` (QR scanning capabilities)

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

Ensure your `appsettings.Development.json` has a valid SQL Server connection string under `ConnectionStrings:DefaultConnection`.

Run Entity Framework Core migrations to set up the database schema and execute the built-in seed scripts (which provide sample Boards, Tools, and Workers for local testing):

```bash
dotnet ef database update
```

Run the API:

```bash
dotnet run
```

The API will typically be available at `http://localhost:5000` or `https://localhost:5001`.

Once the backend is running, you can explore the available API endpoints and test requests interactively by navigating to the Swagger UI:
* `http://localhost:5000/swagger` (or the equivalent HTTPS port mapped in your environment)

### 3. Frontend Setup (Angular)

In a new terminal window, navigate to the frontend directory and install dependencies.

```bash
# Adjust directory name if it differs in your local environment
cd ClientApp 
npm install
```

Start the development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The application will automatically reload if you change any of the source files.
