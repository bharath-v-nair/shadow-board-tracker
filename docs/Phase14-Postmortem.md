# Phase 14 Post-Mortem: Local Networking & Infrastructure

**Date:** May 25, 2026
**Author:** Lead QA Engineer
**Phase:** Phase 14 - Local Networking & Infrastructure
**Status:** Resolved

## Executive Summary

Phase 14 exposed two infrastructure-level issues that had nothing to do with application code but blocked live device testing on the local network. The first was a TCP/IP port collision caused by an orphaned Node.js process — a "zombie app" — that was silently serving stale content on the loopback interface while the live development server ran on a separate network binding. The second was a strategic architectural decision: the `@angular/pwa` Service Worker installation was formally deferred to the final phase to remove a class of configuration blockers and preserve momentum on core feature delivery. This document records both incidents for future reference.

---

## Incident 1: TCP/IP Port Collision — The Zombie App

### Problem Description

During live device testing (accessing the Angular frontend from a phone on the same Wi-Fi network using the Mac's LAN IP address), the team observed a split-brain scenario:

- **Mac localhost (`http://127.0.0.1:4200`)** was serving a **stale, outdated build** — an old version of the application with missing UI features.
- **Network IP (`http://0.0.0.0:4200` / LAN address)** was correctly serving the **live, up-to-date application**.

Changes made in the editor were reflecting on the phone but not in the local browser tab, and vice versa. This created significant confusion about which version of the app was canonical.

### Root Cause Analysis

The root cause was a **zombie Node.js process** — an orphaned `ng serve` instance that had not been cleanly terminated from a previous session. The process was still alive and bound to port `4200` on the **loopback interface** (`127.0.0.1`), intercepting all local browser requests before they could reach the active development server.

When a new `ng serve` was started, it attempted to bind to `0.0.0.0:4200` (the wildcard address, which covers all network interfaces including LAN). Because the zombie process already held `127.0.0.1:4200`, the OS allowed the new server to bind to the wildcard address — but loopback traffic was still captured by the zombie first.

**The two bindings in play:**

| Process | Binding | Accessible From |
|---|---|---|
| Zombie (orphaned) old `ng serve` | `127.0.0.1:4200` | Mac browser only (loopback) |
| Live new `ng serve` | `0.0.0.0:4200` | All interfaces (LAN IP, phone) |

The Mac's local browser always resolves `localhost` to `127.0.0.1` and hit the zombie first. The phone, connecting via the LAN IP, bypassed the loopback entirely and reached the live server correctly.

### Debugging Steps

**Step 1: Identify all processes bound to port 4200.**

```bash
lsof -i :4200
```

This command lists all open file descriptors (network sockets) on port `4200`. The output revealed two separate Node.js PIDs — one bound to `127.0.0.1:4200` (the zombie) and one bound to `*:4200` / `0.0.0.0:4200` (the live server).

**Example output (illustrative):**
```
COMMAND   PID  USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
node    18432  user   23u  IPv4  ...         TCP 127.0.0.1:4200 (LISTEN)
node    22891  user   23u  IPv6  ...         TCP *:4200 (LISTEN)
```

**Step 2: Identify the zombie PID.**

The zombie was the process bound to `127.0.0.1` (the loopback-only binding). Its PID was `18432`.

**Step 3: Forcefully terminate the zombie process.**

```bash
kill -9 18432
```

`kill -9` sends `SIGKILL` — an unblockable, immediate termination signal. Unlike `SIGTERM` (`kill -15`), `SIGKILL` cannot be caught or ignored by the process, making it the correct tool for orphaned processes that may not respond to graceful shutdown.

**Step 4: Verify the port is clear.**

```bash
lsof -i :4200
```

Re-running `lsof` confirmed only one Node.js process remained, now correctly bound to the wildcard address. The Mac browser and phone both served the live application.

### Key Networking Concepts Documented

| Concept | Explanation |
|---|---|
| `127.0.0.1` (loopback) | A virtual network interface visible **only to the local machine**. Traffic sent here never leaves the OS network stack. |
| `0.0.0.0` (wildcard) | A binding that listens on **all available network interfaces** simultaneously — loopback, LAN, and any VPN adapters. |
| `SIGKILL` (`kill -9`) | An OS-level forced termination signal. The process is given no opportunity to clean up. Use when `kill` (SIGTERM) is insufficient. |
| Zombie / Orphan process | A process that continues to run after its parent session has ended, holding OS resources such as network port bindings. |

---

## Strategic Decision: Deferring `@angular/pwa` Service Worker to Final Phase

### Background

The Shadow Board Tracker is designed to function as a Progressive Web App (PWA) — installable on mobile device home screens and capable of offline operation. The `@angular/pwa` package registers a Service Worker that intercepts network requests to cache assets and enable offline functionality.

### The Problem With Installing It Now

Installing `@angular/pwa` during active feature development introduces a category of subtle, hard-to-diagnose bugs:

1. **Stale Cache Serving:** The Service Worker aggressively caches the application shell. During development, code changes may not be reflected in the browser even after a hard refresh, because the Service Worker intercepts requests and returns cached responses before they reach the live dev server.

2. **`ng serve` Incompatibility:** Angular's `ngsw` (service worker) is designed for **production builds** (`ng build`). Running it against `ng serve` in development mode can produce inconsistent behaviour, including broken asset paths and failed worker registration.

3. **Configuration Blockers:** The `ngsw-config.json` file, HTTPS requirements for Service Worker registration on mobile, and the interaction with `provideServiceWorker()` in `app.config.ts` collectively represent a non-trivial configuration surface that can block other team members' development environments.

### The Decision

> **The `@angular/pwa` Service Worker installation is officially deferred to the final phase (post-feature-freeze).**

This decision was made to:
- **Eliminate a class of debugging noise** during active frontend development (no more "why isn't my change showing up?" caused by Service Worker caching).
- **Preserve development velocity** by keeping `ng serve` as the single source of truth during the build phase.
- **Reduce risk** of partially-installed PWA configuration interfering with routing, HTTP interceptors, or authentication flows.

### What This Means in Practice

| Area | Current Behaviour | Final Phase Behaviour |
|---|---|---|
| Service Worker | Not installed. App fetches live from dev server. | Installed via `ng add @angular/pwa`. Caches shell, routes, and API responses. |
| Offline support | None. Requires active network connection. | Core views load offline from cache. |
| Install prompt | Not available. Cannot be added to home screen. | `manifest.webmanifest` registered. Mobile browsers show "Add to Home Screen". |
| Dev server | `ng serve` as normal. | `ng build --configuration production` + local static server for testing. |

### Deferral Checklist (For Final Phase)

- [ ] Run `ng add @angular/pwa` to scaffold `ngsw-config.json` and `manifest.webmanifest`
- [ ] Configure `provideServiceWorker('ngsw-worker.js', { enabled: isDevMode() })` in `app.config.ts`
- [ ] Define caching strategies per route group in `ngsw-config.json`
- [ ] Test on HTTPS or `localhost` (Service Workers require a secure origin)
- [ ] Validate offline fallback routes for unauthenticated users
- [ ] Test "Add to Home Screen" flow on both iOS Safari and Android Chrome

---

**Prepared By:** QA Engineering Team
