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
Represents a staff member who can be assigned recovery tasks.
* `Id` (Guid, PK)
* `Name` (string)
* `Email` (string)
* `IsAvailable` (boolean) - Determines if a worker can be assigned a new incident.

**Incident**
Represents a missing tool report and its resolution state.
* `Id` (Guid, PK)
* `ToolId` (Guid, FK to Tool)
* `WorkerId` (Guid, FK to Worker)
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
