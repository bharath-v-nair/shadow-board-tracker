# System Architecture

This document provides a comprehensive overview of the Klipspringer Shadow Board Tracker backend architecture, data models, and persistence flow. Our goal is to maintain a clean, predictable, and scalable codebase using standard .NET enterprise patterns.

## Project Structure

The backend is built as a .NET 10 Web API. The core components are organized to separate concerns, ensuring that our data shapes, database interactions, and application startup logic remain distinct.

* **`/Models/`**: Contains the domain entities (e.g., `Board`, `Tool`, `Worker`, `Incident`). These classes define the shape of our data and map directly to our database schema. They are purely data containers with no business logic.
* **`/Data/`**: Contains the `ApplicationDbContext`, the core bridge between the C# application and the SQL Server database. It manages entity collections and handles the translation of C# LINQ queries into optimized SQL.
* **`Program.cs`**: The entry point and command center of the application. It handles dependency injection, database connection configuration, routing rules, and application bootstrapping.

## Database Schema

The system utilizes a relational schema to track shadow boards, the tools placed on them, the workforce, and any reported incidents. 

### Core Entities

**Board**
Represents a physical shadow board.
* `Id` (Guid, PK)
* `Name` (string)
* `Location` (string)
* `QrCodeUrl` (string, nullable)

**Tool**
Represents an individual tool assigned to a specific board.
* `Id` (Guid, PK)
* `Name` (string)
* `Type` (string)
* `IconName` (string, nullable) - Reference for frontend UI mapping.
* `Condition` (enum: Good, Defective, Lost)
* `BoardId` (Guid, FK to Board)

**Worker**
Represents a staff member who can be assigned recovery tasks or a QA inspector who reports them.
* `Id` (Guid, PK)
* `Name` (string)
* `Email` (string)
* `IsAvailable` (boolean) - Determines if a worker can be assigned a new incident.
* `Role` (string) - Defines access level (e.g., "QA", "Worker").

**Incident**
Represents a missing tool report and its resolution state.
* `Id` (Guid, PK)
* `ToolId` (Guid, FK to Tool)
* `WorkerId` (Guid, FK to Worker) - The worker assigned to resolve the issue.
* `ReporterId` (Guid, FK to Worker) - The QA inspector who reported the issue.
* `ReportedAt` (datetime)
* `ResolvedAt` (datetime, nullable)
* `Status` (enum: Open, Closed)

## Data Flow & Entity Framework Core

We leverage Entity Framework Core (EF Core) as our Object-Relational Mapper (ORM) to handle data persistence securely and efficiently.

### Request Lifecycle

1. **Client Request:** A client (e.g., the Angular PWA) dispatches an HTTP POST request containing a JSON payload (such as a new Incident report).
2. **API Endpoint / Controller:** The Minimal API endpoint or Controller intercepts the request, deserializes the JSON into the corresponding C# domain model, and performs initial validation.
3. **Database Context:** The validated entity is passed to the `ApplicationDbContext`. EF Core begins tracking this new entity.
4. **Persistence:** Upon calling `SaveChanges()`, EF Core translates the pending operations into parameterized SQL `INSERT` or `UPDATE` statements, communicating directly with the SQL Server.
5. **Client Response:** Upon successful database commit, the API returns an HTTP 200/201 response back to the client.

### EF Core Responsibilities

* **SQL Translation:** Translates C# LINQ queries into highly optimized SQL, abstracting away raw database commands.
* **Change Tracking:** Monitors entities fetched from the database, enabling precise and efficient SQL `UPDATE` generation for modified properties.
* **Migrations:** Maintains database version control. As domain models evolve, EF Core Migrations programmatically apply structural schema updates to the SQL database, ensuring code and persistence layers remain synchronized.

## API Layer Architecture

Our external interaction surface is built using standard ASP.NET Core REST API patterns. This layer securely exposes our domain models to clients like the Angular PWA.

### Data Transfer Objects (DTOs)

To prevent over-posting (mass assignment) vulnerabilities, the API does not accept or return raw domain models directly. Instead, we use Data Transfer Objects.

DTOs act as a strict contract defining exactly what data is permitted in a request. For example, a `CreateBoardDto` only accepts properties the client is allowed to set (like `Name` and `Location`), while deliberately omitting system-managed properties (like internal `Id` fields). This pattern guarantees that our internal entity state cannot be manipulated via unexpected JSON payloads.

### Controllers

Incoming HTTP requests are handled by dedicated Controller classes (e.g., `BoardsController`, `IncidentsController`), which map directly to RESTful endpoints using standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).

The typical data flow within a controller action follows these steps:
1. **Receive:** Intercept the incoming request and bind the JSON payload to the appropriate incoming DTO.
2. **Translate:** Map the incoming DTO into our internal domain model.
3. **Persist:** Instruct the `ApplicationDbContext` to track the new or updated entity and commit the changes to the database.
4. **Respond:** Map the resulting domain model back into a safe response DTO and return it with the appropriate HTTP status code (e.g., `201 Created`).

## Phase 3: Security & Auth

To ensure our endpoints remain secure without burdening end users with complex authentication flows, we implemented a passwordless authentication model.

### Passwordless "Magic Link" Authentication
Instead of traditional usernames and passwords, we leverage JSON Web Tokens (JWTs) and SendGrid. 
When an incident requires action, the system generates a secure, time-limited JWT and uses SendGrid to email a "Magic Link" to the assigned worker. Clicking this link authenticates the worker for that specific task. This approach minimizes friction while maintaining robust security.

### Data Seeding
For reliable local testing of this authentication flow, our EF Core setup includes automated Data Seeding. Upon running database migrations, the system seeds an initial test Worker record. This ensures that developers can immediately test email dispatch and token validation without manual database setup.

### RBAC & Claim Injection
With V2, our JWT generation process now injects specific identity claims, including the user's `Role`. This enables robust Role-Based Access Control (RBAC) across our API, ensuring that only "QA" personnel can report incidents, while "Workers" can only resolve tasks assigned to them.

## Phase 4-7: Frontend Architecture & Integration

Our client application is a modern Progressive Web App (PWA) built with Angular (v17+). It serves as the primary interface for QA inspectors on the factory floor.

### Angular Standalone Components & Signals
We have fully embraced Angular's modern authoring format. 
* **Standalone Components:** We avoid `NgModules` to reduce boilerplate and keep component dependencies explicit and localized.
* **Signals:** We use Angular Signals for fine-grained reactivity and state management across the Dashboard, Scanner, and Board Detail views. This provides a more predictable and performant UI update cycle compared to traditional RxJS Subjects for simple state.

### HTTP Interceptors & Auth
To securely communicate with the protected .NET API endpoints, the Angular app utilizes an `AuthInterceptor`. This interceptor automatically attaches the JWT (obtained via the "Magic Link") as a Bearer token to all outgoing HTTP requests, ensuring seamless authorization.

### Cross-Origin Resource Sharing (CORS)
The .NET backend is configured to accept cross-origin requests from the Angular dev server (`http://localhost:4200`). 
* **Development Gotcha:** Modern browsers (specifically Chrome) aggressively cache CORS preflight `OPTIONS` requests. If token headers or CORS policies change during local development, developers must use an **Incognito/Private window** to bypass this local cache and ensure accurate request routing.

### Hardware Integration
We utilize `@zxing/ngx-scanner` for hardware-agnostic QR code scanning. This allows QA inspectors to use any mobile device camera via the browser without requiring native app wrappers.

## Phase 8: V2 State & Tracking

As the application matures, tracking precise physical inventory state and providing a seamless UI experience became paramount.

### Instance Model for Tools
We employ an "Instance Model" for our inventory. This means every physical tool on the factory floor is assigned a completely unique `Guid`, even if multiple tools share the exact same `Name` and `Type`. This prevents ambiguity during incident reporting and ensures precise audit trails.

### Dynamic State Merging (Angular)
The UI needs to accurately reflect both static tool data and real-time incident status. To achieve this without over-fetching, the Angular client leverages `forkJoin` (RxJS) to make parallel requests, then uses Signals to dynamically merge the `Tool`'s physical condition with any active `Incident` state. This reactive architecture guarantees the UI always displays the most accurate, up-to-date board status without complex state synchronization logic.

## Phase 9: Operations & The Maker-Checker Loop

To ensure strict compliance on the factory floor, we implemented a Maker-Checker workflow. This pattern guarantees that a tool is only considered "returned" when physically verified by a QA Inspector.

### Three-Tier State Machine
Incidents now flow through a three-stage lifecycle:
1. **Open (Red):** The tool is reported missing by QA. A Worker is assigned and notified.
2. **PendingReview (Yellow):** The Worker has located the tool and marked the task as resolved. The UI visually indicates that QA verification is required.
3. **Resolved/Closed (Green):** A QA Inspector physically verifies the tool is back on the board and permanently closes the incident. Alternatively, QA can **Reject** the resolution, reverting the state back to Open and notifying the Worker.

### UI Role-Based Rendering
The Angular application adapts its UI based on the authenticated user's identity. By decoding the JWT stored in the browser, the client inspects the user's `Role` claim. For incidents in the `PendingReview` state, the "Verify & Close" and "Reject & Reopen" action buttons are dynamically injected into the DOM *only* if the current user possesses the "QA" role. 

### Silent Background Hydration
When QA Inspectors or Workers interact with incident records, we often need relational data (like the `ReporterName` or `WorkerName`) that isn't stored directly on the base entity. To provide a seamless user experience, the Angular client leverages silent background refresh patterns. Upon loading an incident, the client fetches the latest relational projections from the API and updates its Signals without triggering disruptive, full-screen loading spinners (screen-flicker), maintaining the application's snappy, native-like feel.

## Phase 10: Mobile Operations Dashboard

As QA operations moved entirely to the factory floor, the application required a dedicated, mobile-optimized triage center.

### Mobile-First Tailwind Layout
The UI shifted away from traditional desktop-heavy tables to a mobile-first Tailwind CSS container layout. Using responsive design principles, the dashboard focuses on vertical scrolling, large touch targets, and distinct visual hierarchy, ensuring QA Inspectors can comfortably operate the application one-handed on mobile devices.

### Reactive State Slicing with Signals
To maintain a snappy experience, the application fetches the entire incident state at once (resolving N+1 query issues on the backend via Eager Loading). The Angular frontend then utilizes `computed()` signals to slice this single, immutable global state array into reactive, color-coded tabs (Pending, Open, Resolved). This guarantees that as incidents change state (e.g., from Open to Pending Review), they instantly and automatically animate between tabs without requiring expensive re-renders or additional network calls.

## Phase 11: UI Shell & Roster Management

As the tool scaled to manage a larger workforce, managing shift rosters and providing a unified navigation experience became necessary.

### RESTful Query Parameters & Deferred Execution
We transitioned our API layer from rigid, single-purpose endpoints to flexible resource querying. By introducing `[FromQuery]` parameters (such as `role` and `isOnShift`) on the `WorkersController`, clients can dynamically shape their requests. On the backend, we leverage EF Core's `IQueryable` to defer execution, appending SQL `WHERE` clauses dynamically before the final database trip, ensuring highly optimized SQL generation regardless of the filter combination.

### UI Shell & Admin Navigation
To improve the user experience and support global navigation, the Angular application's routing was refactored into a Parent-Child structure. A unified `LayoutComponent` now acts as the application shell, maintaining a persistent bottom navigation bar. We also implemented an administrative "QA Menu" using Angular Material's Bottom Sheet (`MatBottomSheet`), providing quick access to the user profile and shift management tools without cluttering the main dashboard.

### Data Integrity & Audit Protection
With the introduction of shift management, worker turnover or profile deletion became a possibility. To protect our stringent audit trails, we explicitly configured the EF Core relationship between the `Incident` entity and its `Worker` and `Reporter` foreign keys with `DeleteBehavior.Restrict`. This enforces data integrity at the SQL level, preventing cascading deletes and ensuring that historical incident records are never orphaned or erased if a worker profile is removed.
