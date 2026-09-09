# Requirements Specification: Eagle Extra Links Plugin

## 1. Project Summary

### 1.1 Background & Motivation
Eagle (eagle.cool) is a desktop digital asset management tool designed for designers, concept artists, and researchers. By default, Eagle associates only one primary URL with an item—populated via the `website` parameter during item creation (such as via browser extensions or the Eagle Web API) or as the `bookmarkURL` when adding a URL bookmark. In the Eagle Plugin API, this is exposed as the `url` property on an `Item` instance.

In modern research, knowledge management, and creative workflows, digital assets frequently require multiple associated references. For instance:
- An asset may originate from an online art portal (e.g., ArtStation, Pinterest, or Behance), but also link to a secondary high-resolution archive, a photographer's portfolio, or a design system page.
- Users of personal knowledge management tools like Obsidian (obsidian.md) frequently deep-link assets to multiple markdown notes, project canvases, or daily logs using Obsidian Advanced URIs (`obsidian://adv-uri?...`).

Eagle currently lacks a native interface or data model for attaching more than one clickable URL to an asset.

### 1.2 Project Goal
The **Eagle Extra Links** plugin resolves this limitation by providing an Inspector plugin that:
1. Renders a native-styled, expandable list of clickable URL text fields in Eagle's right-hand Inspector panel.
2. Allows users to dynamically add, edit, and delete extra URLs per item.
3. Guarantees that each field and its contents (whether populated or blank) are persistently stored as item metadata without corrupting Eagle's native database.
4. Enforces a confirmation popup (Yes/No) before any URL field is deleted.
5. Implements a lightweight, cross-platform IPC interface (via a local HTTP REST API on loopback) enabling external applications—particularly Obsidian plugins—to query and append URLs to an Eagle item by its unique `itemId`.

---

## 2. Numbered Requirements (EARS Format)

Requirements are specified using the **Easy Approach to Requirements Syntax (EARS)**:
- **Ubiquitous**: The `<system>` shall `<system response>`.
- **Event-driven**: When `<trigger>`, the `<system>` shall `<system response>`.
- **State-driven**: While `<precondition>`, the `<system>` shall `<system response>`.
- **Unwanted Behavior**: If `<trigger/error>`, then the `<system>` shall `<system response>`.
- **Optional Feature**: Where `<feature>`, the `<system>` shall `<system response>`.

---

### REQ-1: Initial Inspector State and Presentation

**User Story:**
*As an Eagle user inspecting a library asset, I want to see an Extra Links section with at least one URL field by default so that I can immediately input secondary URLs without manual initialization.*

- **1.1 (State-driven):** While an item is selected in Eagle and inspected, the plugin shall display the Extra Links section containing all previously saved URLs for that item.
- **1.2 (State-driven):** While an item is selected that has no existing extra URLs saved, the plugin shall initialize the view with a single empty URL text field.
- **1.3 (Ubiquitous):** The plugin shall format each URL field as an editable text box styled consistently with Eagle's native inspector inputs.

#### Acceptance Criteria
- **AC-1.1:** When an item with zero saved extra links is selected, the plugin displays exactly one blank URL text field.
- **AC-1.2:** When an item with $N$ saved extra links ($N \ge 1$) is selected, the plugin displays exactly $N$ text fields pre-populated with their respective values.
- **AC-1.3:** The URL text field contains a placeholder label (e.g., `https://... or obsidian://...`).
- **AC-1.4:** The input control spans the full usable width of the Inspector panel minus the right-hand action controls.

---

### REQ-2: URL Input and External Navigation

**User Story:**
*As an Eagle user, I want a clickable link icon at the right end inside each URL input box so that I can immediately open the URL or URI in my default browser or operating system handler.*

- **2.1 (Ubiquitous):** The plugin shall provide a clickable external link icon anchored at the right end inside each URL input field.
- **2.2 (Event-driven):** When the user clicks the link icon of a populated URL field, the plugin shall open the target URL using the operating system's default handler via `eagle.shell.openExternal`.
- **2.3 (Event-driven):** When the user presses `Enter` while focusing a populated URL field, the plugin shall trigger the external link launch.
- **2.4 (Unwanted Behavior):** If the user clicks the link icon or triggers navigation while the URL field is blank or whitespace-only, then the plugin shall ignore the action and provide subtle visual feedback (e.g., brief border highlight) without throwing an error.

#### Acceptance Criteria
- **AC-2.1:** The link icon is positioned inside the input container at the right edge without obscuring entered text.
- **AC-2.2:** Standard web URLs (`http://`, `https://`) open in the system default web browser.
- **AC-2.3:** Custom application URI schemes (including `obsidian://`, `notion://`, and `file:///`) trigger their respective registered desktop handlers.
- **AC-2.4:** Clicking the link icon on an empty field does not attempt to launch a shell process or produce unhandled promise rejections.

---

### REQ-3: Dynamic Addition of URL Fields

**User Story:**
*As an Eagle user, I want a dedicated "+" button below the fields so that I can add multiple additional URL fields to associate with the current asset.*

- **3.1 (Ubiquitous):** The plugin shall provide an accessible "+" (Add URL) button positioned beneath the list of URL fields.
- **3.2 (Event-driven):** When the user clicks the "+" button, the plugin shall append a new blank URL text field to the bottom of the list.
- **3.3 (Event-driven):** When a new URL field is added, the plugin shall immediately set input focus to the newly created text box.

#### Acceptance Criteria
- **AC-3.1:** Clicking "+" increments the field count by 1.
- **AC-3.2:** The newly appended field contains an editable input, an inline link icon, and an external "X" delete button.
- **AC-3.3:** The new field immediately receives keyboard focus, allowing instant typing or pasting.
- **AC-3.4:** The added field is included in the persistent item metadata state.

---

### REQ-4: Field Deletion with Confirmation Dialog

**User Story:**
*As an Eagle user, I want an "X" button next to each field outside the text box with a Yes/No confirmation popup so that I do not inadvertently delete valuable URLs.*

- **4.1 (Ubiquitous):** The plugin shall render an "X" (delete) button immediately to the right outside each URL text box.
- **4.2 (Event-driven):** When the user clicks the "X" button, the plugin shall display a modal confirmation popup asking the user whether they want to delete the URL.
- **4.3 (State-driven):** While the confirmation popup is visible, the popup shall present explicit "Yes" (confirm delete) and "No" (cancel) action buttons.
- **4.4 (Event-driven):** When the user selects "Yes", the plugin shall remove the corresponding URL field from the UI and update the persisted metadata.
- **4.5 (Event-driven):** When the user selects "No" or dismisses the popup (e.g., clicking backdrop or pressing `Escape`), the plugin shall preserve the URL field and dismiss the dialog without changes.

#### Acceptance Criteria
- **AC-4.1:** The "X" button is visually separated from the text input and positioned on the outer right margin.
- **AC-4.2:** Clicking "X" on any field immediately opens a confirmation dialog with the text: *"Are you sure you want to delete this URL?"*.
- **AC-4.3:** Selecting "No" leaves the field and its text completely intact.
- **AC-4.4:** Selecting "Yes" removes the row with an animated transition or immediate DOM removal.
- **AC-4.5:** If all fields are deleted, the plugin re-initializes with a single empty URL field per REQ-1.2.

---

### REQ-5: Persistent Metadata Storage

**User Story:**
*As an Eagle user, I want every field and its contents—including empty fields—persisted with the content item so that my links survive application restarts, library switching, and cloud sync.*

- **5.1 (Ubiquitous):** The plugin shall store the ordered list of extra URLs (including empty strings) as metadata associated with the Eagle item.
- **5.2 (Event-driven):** When a URL text field is edited, added, or deleted, the plugin shall persist the updated link array to a sidecar file named `extra-links.json` inside the item's `.info` directory.
- **5.3 (State-driven):** While the user is typing in a URL field, the plugin shall debounce save operations by 300 milliseconds to avoid unnecessary disk I/O.
- **5.4 (Event-driven):** When the user changes focus away from an input (`blur`), the plugin shall immediately flush any pending save operations.
- **5.5 (Unwanted Behavior):** If the item directory or metadata cannot be written to (e.g., read-only filesystem), then the plugin shall log an error to `eagle.log` and display an unobtrusive error indicator.

#### Acceptance Criteria
- **AC-5.1:** Modifying a field creates or updates `<LibraryPath>/images/<itemId>.info/extra-links.json`.
- **AC-5.2:** Empty fields added by the user are explicitly preserved in the JSON array as `""` so that custom blank slots remain on subsequent item views.
- **AC-5.3:** The file writes are atomic and use valid UTF-8 JSON formatting.
- **AC-5.4:** When navigating to a different item in Eagle and returning to the original item, all fields and their exact contents are restored.

---

### REQ-6: Cross-Platform IPC for External Integration (Obsidian)

**User Story:**
*As an Obsidian user, I want my Obsidian plugin to programmatically add URLs (such as Obsidian note links) to any Eagle item by its `itemId` over a reliable, cross-platform IPC interface.*

- **6.1 (Ubiquitous):** The plugin shall operate an embedded HTTP REST server listening on localhost loopback (`127.0.0.1:41598`).
- **6.2 (Event-driven):** When an external client sends a `GET /api/item/:itemId/links` request, the server shall return a JSON payload containing the array of extra links for that item.
- **6.3 (Event-driven):** When an external client sends a `POST /api/item/:itemId/links` request with a JSON payload `{ "url": "<url-string>" }`, the server shall append the URL to that item's metadata and return HTTP status 200/201.
- **6.4 (Event-driven):** When an external client sends a `PUT /api/item/:itemId/links` request with `{ "links": ["url1", "url2"] }`, the server shall replace the item's extra links array and return HTTP status 200.
- **6.5 (State-driven):** While the item being modified via IPC is currently displayed in the Eagle Inspector UI, the plugin shall immediately refresh the Inspector DOM in real-time to reflect the new link(s).
- **6.6 (Unwanted Behavior):** If an invalid `itemId` is supplied or the item directory does not exist, then the server shall return HTTP status 404 with a structured error JSON object.
- **6.7 (Ubiquitous):** The IPC protocol shall operate identically without modification on Windows and macOS.
- **6.8 (Ubiquitous):** The plugin shall automatically check for and prevent duplicate links when appending URLs via IPC, ensuring that duplicate requests for the same URL on an item are idempotent.

#### Acceptance Criteria
- **AC-6.1:** `GET http://127.0.0.1:41598/health` returns `{"status":"ok","version":"1.0.0"}`.
- **AC-6.2:** `POST http://127.0.0.1:41598/api/item/:itemId/links` adds the link to `extra-links.json`.
- **AC-6.3:** If Eagle is currently displaying `:itemId` in the Inspector, the new URL appears in the Inspector panel without requiring a deselect/reselect cycle.
- **AC-6.4:** Requests include standard CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`) to allow unblocked `fetch` calls from Obsidian's Electron renderer.
- **AC-6.5:** The IPC server handles port conflict gracefully (e.g., logging an informative error if port 41598 is bound by another process).
- **AC-6.8:** When `POST /api/item/:itemId/links` is called with a URL that is already associated with that item (comparing trimmed strings), the plugin does not insert a duplicate, preserves existing links, and returns HTTP 200 with `alreadyExists: true` and `addedCount: 0`.

---

### REQ-7: Theme Adaptation and Native Look & Feel

**User Story:**
*As an Eagle user, I want the plugin UI to match Eagle's native styling and react instantly to theme changes (Dark, Gray, Light, Blue, Purple) so that it feels like a built-in feature of Eagle.*

- **7.1 (State-driven):** While Eagle is running, the plugin shall synchronize its background, text, border, and input colors with the active Eagle theme retrieved from `eagle.app.theme`.
- **7.2 (Event-driven):** When the Eagle application theme changes, the plugin shall handle `eagle.onThemeChanged` and update its CSS theme attribute immediately without page reload.
- **7.3 (Ubiquitous):** The typography, font size (11px–12px), border radii (4px–6px), and input padding shall mirror Eagle's built-in inspector widgets.

#### Acceptance Criteria
- **AC-7.1:** On `LIGHT` and `LIGHTGRAY` themes, inputs render light backgrounds (`#FFFFFF` / `#F0F0F0`) with dark typography (`#222222`).
- **AC-7.2:** On `DARK` and `GRAY` themes, inputs render dark backgrounds (`#2C2C2C` / `#232323`) with light typography (`#E0E0E0`).
- **AC-7.3:** On `BLUE` and `PURPLE` themes, accent colors match the host theme accents.
- **AC-7.4:** Triggering a theme switch in Eagle Preferences dynamically updates the plugin appearance within 100ms.

---

### REQ-8: Comprehensive File Format Support

**User Story:**
*As an Eagle user with diverse digital assets (images, vectors, videos, audio, 3D, and web links), I want the Extra Links inspector to appear for all common file types in my library.*

- **8.1 (Ubiquitous):** The plugin's `manifest.json` shall configure the `preview` inspector property to match all major Eagle supported file extensions.

#### Acceptance Criteria
- **AC-8.1:** Supported extensions include raster images (`jpg,jpeg,png,gif,webp,bmp,tif,tiff`), vector graphics (`svg,ai,eps`), documents (`pdf,txt,md`), video files (`mp4,mov,avi,webm,mkv`), audio files (`mp3,wav,m4a,flac,aac`), and web items (`url,webloc,html`).
- **AC-8.2:** The Inspector plugin loads seamlessly when any asset of these formats is selected.

---

### REQ-9: Configurable IPC Server Settings & Access Control

**User Story:**
*As an Eagle user, I want full control over the IPC server—including the ability to turn it off, configure its bind address and port, and restrict incoming connections by IP or hostname—so that I can manage network security, avoid port conflicts, and connect from other devices on my LAN when desired.*

- **9.1 (Ubiquitous):** The plugin shall provide a settings interface accessible from the Inspector panel header to configure all IPC server options.
- **9.2 (Optional Feature):** Where the user does not require external integrations, the plugin shall allow toggling the IPC server feature completely ON or OFF (enabled by default).
- **9.3 (State-driven):** While the IPC server toggle is OFF, the plugin shall shut down the HTTP server and release any bound network ports.
- **9.4 (Ubiquitous):** The plugin shall allow configuring the bind hostname or IP address, defaulting to `127.0.0.1` (required).
- **9.5 (Ubiquitous):** The plugin shall allow configuring the listen port number, defaulting to `41598` (required, valid range 1024–65535).
- **9.6 (Optional Feature):** Where the user requires access control, the plugin shall provide an optional access restriction feature (defaulted to OFF).
- **9.7 (State-driven):** While access restriction is enabled, the plugin shall validate incoming client connections against a user-configurable whitelist supporting exact IPs, IP ranges/wildcards (e.g. `192.168.1.x` or `192.168.1.*`), hostnames, or the `'self'` alias (representing loopback addresses `127.0.0.1` and `::1`).
- **9.8 (Ubiquitous):** When access restriction is enabled, the plugin shall suggest `'self'` as the initial preset, alongside quick-selection suggestions for `127.0.0.1`, `::1`, and `192.168.1.x`.
- **9.9 (Unwanted Behavior):** If a client connection originates from an IP address not matched by the whitelist when access restriction is enabled, then the server shall reject the request with HTTP status 403 Forbidden and log the rejected address.
- **9.10 (Event-driven):** When the user updates any server setting and applies changes, the plugin shall automatically restart the HTTP server with the new parameters and display the active server status.

#### Acceptance Criteria
- **AC-9.1:** Clicking the settings icon (`⚙️`) opens a settings drawer/modal displaying: Server On/Off toggle, Bind Host/IP, Port, and Access Restriction controls.
- **AC-9.2:** Switching the server toggle to OFF immediately closes the listening port (`server.close()`). `GET /health` requests will be refused by the OS.
- **AC-9.3:** The bind address input is required and defaults to `127.0.0.1`. Entering `0.0.0.0` allows connections from local network devices.
- **AC-9.4:** The port input is required, defaults to `41598`, and rejects values outside the `1024-65535` range.
- **AC-9.5:** Access restriction toggle defaults to OFF (allowing any client that can reach the bound interface, which is loopback-only by default).
- **AC-9.6:** Turning access restriction ON pre-fills `'self'` and displays clickable suggestion chips for `self`, `127.0.0.1`, `::1`, and `192.168.1.x`.
- **AC-9.7:** Entering `192.168.1.x` or `192.168.1.*` correctly matches any client in the `192.168.1.0/24` subnet.
- **AC-9.8:** Unauthorized client requests receive HTTP 403 Forbidden with JSON payload `{"status":"error","message":"Forbidden: Client IP <ip> is not authorized."}`.
- **AC-9.9:** All server settings are persistently stored in plugin configuration (`localStorage` or `config.json`) and survive application restarts.

