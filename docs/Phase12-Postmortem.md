# Phase 12 Post-Mortem: The Magic Link Context Switch & OTP Migration

**Date:** May 17, 2026
**Author:** Lead QA Engineer
**Phase:** Phase 12 - Authentication UX Overhaul
**Status:** Resolved

## Executive Summary

Phase 12 began as a routine QA pass on the Magic Link authentication flow that was implemented in Phase 11. During mobile emulation testing, the team identified a fundamental UX flaw — a "context switch" inherent to the Magic Link pattern — that would render the application unusable as a PWA on mobile devices. This post-mortem documents why Magic Links were built initially, the precise moment the flaw was identified, and every technical step taken to migrate to a 6-Digit OTP login system.

---

## The Initial Implementation: Why We Built Magic Links

### The Reasoning
The Shadow Board Tracker is designed for use on a factory floor by workers who do not manage passwords. The design specification called for a **zero-friction, passwordless authentication** system. Magic Links were the natural first choice: a user enters their email, the backend generates a secure, time-limited token, appends it to a URL, and emails that URL to the worker. Clicking the link completes authentication automatically — no code to remember, no password to forget.

### The Initial Technical Architecture
The `AuthController`'s `POST /auth/request-link` endpoint was first designed to:
1. Generate a cryptographically random URL token (a long, unguessable string).
2. Store it in the `Worker` record with a 15-minute expiry (`MagicLinkToken`, `MagicLinkTokenExpiresAt`).
3. Email the worker a URL of the form: `http://localhost:4200/auth/verify?token=<TOKEN>&email=<EMAIL>`.

The Angular router had a dedicated top-level route at `/auth/verify` (with an empty `verify/` component directory) to receive the callback and exchange the token for a JWT.

---

## The Critical Flaw: The PWA Context Switch

### How the Bug Was Identified
During mobile emulation testing on the QA build, the following scenario was simulated:

1. QA Inspector opens the Shadow Board Tracker PWA, which is installed on the device home screen and runs in **standalone mode** (no browser chrome, its own app window).
2. They tap "Send Login Link" and enter their email.
3. A Magic Link email is received.
4. The user taps the link in the email client.

At step 4, the operating system's intent system (on both iOS Safari and Android Chrome) interprets the `http://` link as a web URL and opens it in the **default browser** — a completely separate application process from the installed PWA. The authentication succeeds inside the browser, not inside the PWA. The user is now logged in inside the browser but the PWA window on their home screen is still sitting at the unauthenticated state.

### Why This is a Fatal UX Flaw
This is known as the **PWA Context Switch problem**. A Magic Link is fundamentally a browser navigation event. It is impossible for a link in an external email client to navigate inside a PWA's standalone app window without complex platform-specific configuration (iOS Universal Links or Android App Links), which is far beyond the scope of a factory-floor tool. The authentication state would **never** be transferred to the PWA context. Every QA Inspector would be permanently locked out of the app on mobile.

### The Decision
The Magic Link approach was abandoned entirely. The replacement needed to be:
1. **Context-independent:** Works entirely within the current app window.
2. **Simple enough for a factory floor worker to use** without technical guidance.
3. **Backend-compatible:** Reuse the existing `MagicLinkToken` database columns.

A **6-Digit One-Time Password (OTP)** was selected as the replacement.

---

## The Migration: Technical Steps

### Step 1: Collapse the Auth Routing

**Before:**
```typescript
// app.routes.ts — old state
{ path: 'auth/verify', component: VerifyComponent },
```

The old routing architecture had a dedicated `/auth/verify` route to receive magic link callbacks from email. This was the entry point for the context-switched browser flow.

**After:**
```typescript
// app.routes.ts — new state
{ path: 'login', component: LoginComponent },
```

The `auth/verify` route was eliminated. The `verify/` component directory was emptied. All authentication — both requesting a code and submitting it — now happens on the single `/login` route within the PWA's own window. The login component manages its own internal state machine.

---

### Step 2: Modify the Backend to Send OTPs

**`AuthController.cs` — `POST /auth/request-link`**

The endpoint name was deliberately preserved (`request-link`) to avoid breaking the Angular `ApiService`. Only the internal behaviour changed.

**Before (conceptual):**
```csharp
// Old: Generates a long URL token and emails a clickable link
var token = Guid.NewGuid().ToString("N"); // Long random string
var magicLink = $"http://localhost:4200/auth/verify?token={token}&email={Uri.EscapeDataString(request.Email)}";
await _emailService.SendEmailAsync(worker.Email, "Login Link", $"<a href='{magicLink}'>Click here to log in</a>");
```

**After (implemented):**
```csharp
// New: Generates a 6-digit OTP and emails it as a plain code
var token = Random.Shared.Next(100000, 999999).ToString();

worker.MagicLinkToken = token;
worker.MagicLinkTokenExpiresAt = DateTime.UtcNow.AddMinutes(15);
await _context.SaveChangesAsync();

var emailBody = $"<p>Your Shadow Board Tracker login code is:</p>" +
                $"<h2 style='font-size:32px;letter-spacing:8px;font-family:monospace;color:#2563eb'>{token}</h2>" +
                $"<p>Enter this code in the app. It expires in <strong>15 minutes</strong>.</p>";

await _emailService.SendEmailAsync(worker.Email, "Your Shadow Board Tracker Login Code", emailBody);
```

The `MagicLinkToken` database column was repurposed — instead of storing a URL-safe GUID, it now stores a 6-digit numeric string. No migration was required as the column type (`nvarchar`) accommodates both formats.

---

### Step 3: Redesign the Login Component as a State Machine

The `LoginComponent` was built as a self-contained two-step flow, eliminating any need for cross-window navigation.

**State machine type definition:**
```typescript
type LoginStatus = 'enter-email' | 'loading' | 'enter-code' | 'verifying' | 'error';
```

| State | UI Shown | Trigger |
|---|---|---|
| `enter-email` | Email input + "Send Login Code" button | Initial load |
| `loading` | Spinner inside button | User taps "Send Login Code" |
| `enter-code` | OTP input + "Verify Code" button | API responds `200 OK` |
| `verifying` | Spinner inside "Verify Code" button | User taps "Verify Code" |
| `error` | Inline error banner | API call fails |

The OTP input uses `inputmode="numeric"` to trigger the numeric keyboard on mobile devices automatically, and `maxlength="6"` to prevent over-entry. The large monospace font (`text-3xl font-mono tracking-[0.5em]`) provides visual clarity so users can easily verify each digit.

---

### Step 4: Update the Angular ApiService

The `ApiService` methods were already named for the magic link flow, so no renaming was required. The same endpoints are called with the same payloads — only the backend's response changed from a URL to a numeric code.

```typescript
// api.service.ts — method names retained for backwards compatibility
requestMagicLink(email: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/auth/request-link`, { email });
}

verifyMagicLink(email: string, token: string): Observable<{ token: string }> {
  return this.http.post<{ token: string }>(`${this.apiUrl}/auth/verify`, { email, token });
}
```

---

## Lessons Learned

| Lesson | Category |
|---|---|
| Magic Links are incompatible with PWA standalone mode on mobile. Design for the runtime context, not just the happy path on a desktop browser. | UX / Architecture |
| Database columns can be repurposed without migrations if the new value fits the existing schema. Assess before migrating. | Database |
| Naming methods after their original intent (e.g., `requestMagicLink`) can create confusion when the underlying mechanism changes. Consider renaming in a future refactor. | Code Hygiene |
| A finite state machine (`type LoginStatus`) is the correct pattern for multi-step UI flows — it eliminates impossible UI states and makes the component trivially testable. | Frontend Architecture |
| OTPs are a superior auth mechanism for PWAs on mobile because they keep the user inside the current app context. | Security / UX |

---

**Prepared By:** QA Engineering Team
