# Architecture

## Phase 16: Dynamic QR Code Engine & Print Architecture

During Phase 16, we implemented an on-the-fly QR code generation and hardware printing system. A critical architectural decision was separating the visual concerns into two distinct scopes: **Tenant-Scope** and **Instance-Scope**.

### 1. Tenant-Scope (Static Branding)
We designed the core visual identity of the QR codes to be strictly tied to the application's overall tenant brand, rather than allowing configuration on a per-board basis.
- **Implementation:** Corporate branding elements—specifically the Quorn logo image and the primary orange brand border color (`#E56A14`)—are hardcoded directly into the layout templates.
- **Trade-off:** By enforcing branding at the Tenant-Scope, we intentionally sacrificed granular per-board customization (e.g., users cannot choose different logos or colors for different boards). In return, we guaranteed strict corporate brand consistency across the entire factory floor. Furthermore, it kept our database payloads exceptionally light, as we do not need to store Base64 images or custom hex codes for every shadow board.

### 2. Instance-Scope (Dynamic Sizing & Layout)
While the branding is locked globally, the physical layout requirements vary wildly depending on where the QR code will be physically placed on the factory floor. To handle this dynamic configuration, we implemented an **Instance-Scope Dialog** architecture.
- **Implementation:** The `QrCustomizerDialogComponent` (an Angular Material Dialog) encapsulates the layout logic. It acts as an isolated, stateless sandbox where QA Managers can manipulate physical dimensions (Small, Medium, Large) and toggle the text label on/off.
- **State Management:** Because the dialog operates strictly on an instance level, it provides instant live previews without dirtying the global application state. Upon completion, the dialog outputs a minimal JSON configuration payload (`QrConfig`) that is saved strictly to the `qrConfig` field of the individual Board entity.
- **Hardware Print Rendering:** Printing physical A4 labels requires bypassing unpredictable browser layout engines. Within the Instance-Scope, we built an isolated `<div id="qr-print-region">`. We utilized advanced `@media print` CSS rules to completely hide the application shell. Crucially, we bypassed the browser print engine's tendency to infinitely stretch percentage-based flexbox layouts by utilizing absolute decoupling (`absolute w-[110%]`) and dynamic container queries (`clamp()`) for font scaling. This ensures the output sent to physical hardware printers is perfectly proportional.
