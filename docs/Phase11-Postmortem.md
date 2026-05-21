# Phase 11 Post-Mortem: Full-Stack Integration

**Date:** May 16, 2026
**Author:** Lead QA Engineer
**Phase:** Phase 11 - Full-Stack Integration & Maker-Checker Workflow
**Status:** Resolved

## Executive Summary

Phase 11 was the most integration-heavy phase of the Shadow Board Tracker project. The team connected the Angular 19 PWA frontend to the .NET 10 backend, implemented a role-based Maker-Checker workflow for incident resolution, wired up automated email notifications via SendGrid, and resolved several non-trivial infrastructure bugs that surfaced at the intersection of the frontend, backend, and database layers. This document records every major hurdle and feature implementation for future reference.

---

## Incident 1: The Scroll-Jacking UI Issue

### Problem Description
After implementing the `LayoutComponent` as a persistent shell (containing the top app bar and bottom navigation), nested child components were incorrectly applying `h-screen` (100vh) to their own container elements. On mobile devices and in the browser's mobile emulation mode, this caused each child to independently claim the full viewport height, stacking vertically far beyond the screen boundary and triggering double scroll bars — a classic scroll-jacking effect.

### Root Cause Analysis
The `h-screen` utility sets `height: 100vh` on the element it is applied to. When `LayoutComponent` itself already occupies 100% of the viewport, any child component that also declares `h-screen` creates an inner scroll container that is itself 100vh tall, nested inside the layout's own scrollable area. The result is a broken, un-scrollable mobile layout where content is clipped or overflows unpredictably.

### Resolution
- **Routing Restructure:** We restructured `app.routes.ts` to use `LayoutComponent` as the parent shell with `children: []` routes for all authenticated views (`/dashboard`, `/boards`, `/board/:id`, `/workers`). Routes that genuinely needed full-screen control (e.g., `/scan`, `/login`, `/incident/:id`) were placed at the top level, outside the `LayoutComponent`.
- **Child Component Fix:** The `h-screen` declarations were removed from nested child component templates. Children now use `overflow-y-auto` and `flex-1` to fill the space provided by the parent layout, not the viewport directly.
- **`app.html` Cleanup:** The Angular default placeholder content was replaced with a single `<router-outlet></router-outlet>`, removing all conflicting full-screen styles.

---

## Incident 2: The Multiple Cascade Paths Database Error

### Problem Description
Upon adding the `ReporterId` foreign key to the `Incident` model (to track which QA worker filed the report), Entity Framework Core threw an exception when attempting to apply the migration:

```
Introducing FOREIGN KEY constraint 'FK_Incidents_Workers_ReporterId' on table 'Incidents' may cause cycles or multiple cascade paths.
```

The application was completely unable to start until this was resolved.

### Root Cause Analysis
The `Incidents` table held two foreign keys that both pointed to the `Workers` table: `WorkerId` (the floor worker assigned to the incident) and `ReporterId` (the QA inspector who reported it). SQL Server's default cascade delete behaviour would attempt to delete all associated `Incident` rows from **both** paths simultaneously if a `Worker` record were deleted. Having two separate cascade paths to the same target table is illegal under SQL Server's constraint engine, as it cannot resolve which delete action to honour.

### Resolution
We explicitly configured the delete behaviour for both relationships in `ApplicationDbContext.OnModelCreating`:

```csharp
// WorkerId relationship
modelBuilder.Entity<Incident>()
    .HasOne(i => i.Worker)
    .WithMany()
    .HasForeignKey(i => i.WorkerId)
    .OnDelete(DeleteBehavior.Restrict);

// ReporterId relationship
modelBuilder.Entity<Incident>()
    .HasOne(i => i.Reporter)
    .WithMany()
    .HasForeignKey(i => i.ReporterId)
    .OnDelete(DeleteBehavior.Restrict);
```

Setting `.OnDelete(DeleteBehavior.Restrict)` instructs SQL Server to **block** the deletion of a `Worker` record if any associated `Incident` rows still exist, removing both cascade paths entirely. This is the correct pattern for any entity with multiple foreign keys pointing to the same table.

---

## Incident 3: The LINQ Immutability Trap

### Problem Description
After adding `role` and `isOnShift` query parameters to the `GET /workers` endpoint, integration testing revealed that the filter was being silently ignored. All workers were returned regardless of the parameters passed in the request. The Angular `ReportDialogComponent` always received an unfiltered list.

### Root Cause Analysis
The initial implementation retrieved `_context.Workers` as an `IQueryable<Worker>` but never **reassigned** the variable after calling `.Where()`. In C#, LINQ's `IQueryable` is **immutable by design** — calling `.Where()` on a query returns a **new** `IQueryable` object with the filter applied; it does not mutate the original variable in place. The original implementation looked like:

```csharp
// BUG: filter is applied but the result is discarded
var query = _context.Workers.AsQueryable();
query.Where(w => w.Role == role); // This does nothing!
var workers = await query.ToListAsync();
```

### Resolution
The fix was to always **reassign** the query variable whenever a filter was chained:

```csharp
var query = _context.Workers.AsQueryable();

if (!string.IsNullOrEmpty(role))
{
    query = query.Where(w => w.Role == role); // Reassignment is mandatory
}

if (isOnShift.HasValue)
{
    query = query.Where(w => w.IsOnShift == isOnShift.Value);
}

var workers = await query.ToListAsync();
```

The Angular `ApiService` was simultaneously updated to pass the parameters correctly using `HttpParams`, and the `ReportDialogComponent` was updated to call `getWorkers('Worker', true)` to fetch only on-shift floor workers for the assignment dropdown.

---

## Incident 4: CORS and HTTP Interceptor Integration

### Problem Description
After deploying the Angular frontend (served on `localhost:4200`) alongside the .NET API (served on `localhost:5029`), all authenticated API calls from the Angular `HttpClient` were blocked by the browser's CORS policy. The `Authorization` header was being stripped from preflight `OPTIONS` requests.

### Root Cause Analysis
The initial CORS policy used `.AllowAnyHeader()`, which is overly permissive and was later tightened. The replacement policy used `.WithHeaders()` but initially omitted `"Authorization"` and `"Content-Type"` from the allowed list. The browser's CORS preflight check (`OPTIONS`) was successfully completing, but the actual request was rejected because the `Authorization` header was not explicitly whitelisted.

### Resolution
**Backend (`Program.cs`):** The CORS policy was updated to explicitly allow the required headers:

```csharp
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .WithHeaders("Authorization", "Content-Type", "Accept"));
```

**Frontend (`app.config.ts`):** The `authInterceptor` was registered using the new functional interceptor pattern:

```typescript
provideHttpClient(withInterceptors([authInterceptor]))
```

The interceptor reads the JWT from `localStorage` via `AuthService` and automatically attaches it to every outgoing request as a `Bearer` token, ensuring that all `[Authorize]` endpoints receive credentials without requiring manual header management in each service method.

---

## Incident 5: Automated Email Notifications (SendGrid)

### Problem Description
The initial `IncidentsController` had no notification mechanism. When a QA Inspector assigned a missing tool incident to a floor worker, the worker had no way of knowing they had a task. Similarly, if a QA Inspector rejected a resolution, the worker was not informed.

### Resolution
We implemented the `IEmailService` interface (backed by `SendGridEmailService`) and injected it into `IncidentsController`. Two notification triggers were added:

1. **`POST /incidents` (Assignment Notification):** After successfully persisting a new incident, the backend fetches the assigned worker, reporter, tool, and board names, then sends a richly formatted HTML email to the worker's registered email address containing the task details and a deep-link to the incident's resolution page.

2. **`PATCH /incidents/{id}/reopen` (Rejection Notification):** When a QA Inspector reopens an incident (rejecting the worker's resolution), an email is dispatched to the worker informing them that their fix was rejected and directing them back to the incident.

Both notification calls are wrapped in `try/catch` blocks with `ILogger<IncidentsController>` error logging, ensuring that an email delivery failure cannot crash the primary API response.

---

## Incident 6: Role-Based Access Control (RBAC)

### Problem Description
Critical administrative actions — such as toggling a worker's shift status or marking an incident as fully resolved — were accessible to any authenticated user, violating the Maker-Checker security model.

### Resolution
The `[Authorize(Roles = "QA")]` attribute was applied to the following endpoints, restricting them exclusively to workers whose JWT contains the `QA` role claim:

| Endpoint | Controller | Restriction |
|---|---|---|
| `PATCH /workers/{id}/shift` | `WorkersController` | `Roles = "QA"` |
| `PATCH /incidents/{id}/verify` | `IncidentsController` | `Roles = "QA"` |
| `PATCH /incidents/{id}/reopen` | `IncidentsController` | `Roles = "QA"` |
| `GET /incidents/all` | `IncidentsController` | `Roles = "QA"` |

Standard `[Authorize]` (any authenticated user) was applied to `POST /incidents`, `PUT /incidents/{id}`, and `DELETE /incidents/{id}`. The `PATCH /incidents/{id}/resolve` action was left as `[AllowAnonymous]` to allow workers to submit resolutions via the deep-link without being forced through the QA login flow.

---

## Incident 7: UI Polish — MatBottomSheet Admin Menu

### Problem Description
QA Inspectors had no dedicated navigation entry point in the mobile UI. All admin actions were inaccessible from the main layout.

### Resolution
A `MatBottomSheet` was integrated into `LayoutComponent`. Tapping the avatar icon in the top app bar now opens the `AdminMenuComponent` as a bottom sheet — a standard mobile design pattern for contextual menus. The component displays the current user's name and email and provides quick-access navigation to QA-specific views (worker management, global incidents).

---

**Prepared By:** QA Engineering Team
