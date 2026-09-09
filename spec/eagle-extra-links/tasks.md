# Implementation Tasks: Eagle Extra Links Plugin

This checklist outlines the concrete implementation tasks for developing the **Eagle Extra Links** plugin. Each task explicitly references the requirements (`REQ-X`) and acceptance criteria (`AC-X.Y`) defined in [`requirements.md`](./requirements.md).

---

## Phase 1: Manifest & Project Configuration

- [x] **TASK-1: Expand Manifest Supported Formats and Permissions**
  - **Ref**: `REQ-8`, `AC-8.1`, `AC-8.2`
  - **Steps**:
    1. Open [`manifest.json`](../../manifest.json).
    2. Expand the `preview` extension key to support all standard Eagle media, document, and web types: `jpg,jpeg,png,gif,webp,bmp,tif,tiff,svg,ai,eps,pdf,txt,md,mp4,mov,avi,webm,mkv,mp3,wav,m4a,flac,aac,url,webloc,html`.
    3. Update the inspector height to `140` to provide comfortable vertical space for multiple URL fields and controls.
    4. Ensure `multiSelect: false` is configured to enforce single-asset inspection.
    5. Add relevant metadata (`keywords`, `description`).

---

## Phase 2: Metadata Storage Engine

- [x] **TASK-2: Implement Storage Manager Module**
  - **Ref**: `REQ-5`, `AC-5.1`, `AC-5.2`, `AC-5.3`, `AC-5.4`
  - **Steps**:
    1. Create `js/storage.js`.
    2. Implement `resolveItemInfoDir(itemId)` using Node.js `path` to locate `<LibraryPath>/images/<itemId>.info/`. Support fallback via `eagle.library.path` if the item instance is not currently selected.
    3. Implement `loadLinks(itemId)` using `fs.promises.readFile` to parse `extra-links.json`. Return an empty array if the file is absent.
    4. Implement `saveLinks(itemId, links)` using `fs.promises.writeFile` to write formatted JSON. Preserve empty strings `""` in the array per AC-5.2.
    5. Implement atomic file writes using temporary file swapping (`extra-links.json.tmp` -> rename) to safeguard against power or crash corruption.
    6. Implement `appendLink(itemId, url)` and `removeLinkByIndex(itemId, index)` convenience helpers.

- [x] **TASK-3: Implement Debounced Auto-Save & Visual Indicator**
  - **Ref**: `REQ-5`, `AC-5.3`, `AC-5.4`
  - **Steps**:
    1. Create a debounced save utility in `js/storage.js` with a default delay of 300ms.
    2. Hook up an input `blur` listener that immediately flushes pending writes to disk.
    3. Provide UI state callbacks (`onSaving`, `onSaved`, `onError`) to update the header status badge.

---

## Phase 3: Inspector UI Structure & Native Theming

- [x] **TASK-4: Construct Inspector HTML Skeleton**
  - **Ref**: `REQ-1`, `AC-1.1`, `AC-1.2`, `AC-1.3`, `AC-1.4`, `REQ-3`, `AC-3.1`, `REQ-4`, `AC-4.1`
  - **Steps**:
    1. Refactor [`index.html`](../../index.html) to structure the component layout:
       - Header with title (`EXTRA LINKS`) and `#save-status` indicator.
       - `#url-list` container for dynamic URL rows.
       - `#add-btn` (+ Add URL) button.
       - In-inspector `#delete-modal` dialog markup.
    2. Embed clean SVG icons for:
       - External link open icon (box with diagonal arrow).
       - Delete "X" icon.
       - Add "+" icon.

- [x] **TASK-5: Implement Eagle Theming System in CSS**
  - **Ref**: `REQ-7`, `AC-7.1`, `AC-7.2`, `AC-7.3`, `AC-7.4`
  - **Steps**:
    1. Create `css/style.css` (or link embedded stylesheet in `index.html`).
    2. Define CSS Custom Properties for themes:
       - `DARK` & `GRAY`: `#202020` background, `#2a2a2a` input background, `#e0e0e0` text, `#3d3d3d` borders.
       - `LIGHT` & `LIGHTGRAY`: `#ffffff` background, `#f5f5f5` input background, `#1f1f1f` text, `#dddddd` borders.
       - `BLUE` & `PURPLE`: Accent highlights for buttons and active input borders.
    3. Style the input container with absolute right-anchoring for the `.link-btn`.
    4. Style the outer right `.delete-btn` with hover transition and clear hit target.
    5. Implement `eagle.onThemeChanged` and `eagle.app.theme` binding to set `document.body.setAttribute('theme', theme)`.

---

## Phase 4: Dynamic URL Management & Navigation

- [x] **TASK-6: Implement Dynamic Field Rendering & Initial State**
  - **Ref**: `REQ-1`, `AC-1.1`, `AC-1.2`, `AC-1.3`, `AC-1.4`
  - **Steps**:
    1. In `js/app.js`, listen to `eagle.onPluginCreate`.
    2. Fetch the active item using `await eagle.item.getSelected()`.
    3. Call `StorageManager.loadLinks(item.id)`.
    4. If the returned array has items, render each link into a `.url-row`.
    5. If the returned array is empty, render a single blank field.
    6. Ensure the input placeholder is set (`https://... or obsidian://...`).

- [x] **TASK-7: Implement URL Launching Handler**
  - **Ref**: `REQ-2`, `AC-2.1`, `AC-2.2`, `AC-2.3`, `AC-2.4`
  - **Steps**:
    1. Attach click listener to each `.link-btn`.
    2. Attach `keydown` listener for the `Enter` key on `.url-input`.
    3. Extract input value and trim whitespace.
    4. If value is empty, provide subtle visual feedback (e.g. shake or border pulse) and abort cleanly without errors.
    5. If populated, validate safe protocol scheme (`http:`, `https:`, `obsidian:`, `notion:`, `file:`) and call `eagle.shell.openExternal(url)`.

- [x] **TASK-8: Implement Dynamic "+" Add URL Button**
  - **Ref**: `REQ-3`, `AC-3.1`, `AC-3.2`, `AC-3.3`, `AC-3.4`
  - **Steps**:
    1. Attach click listener to `#add-btn`.
    2. Append a new `.url-row` DOM element to `#url-list`.
    3. Focus the newly created `.url-input`.
    4. Trigger a save operation to persist the new blank slot in `extra-links.json`.

---

## Phase 5: Field Deletion with Confirmation Modal

- [x] **TASK-9: Implement Confirmation Modal Dialog Logic**
  - **Ref**: `REQ-4`, `AC-4.1`, `AC-4.2`, `AC-4.3`, `AC-4.4`, `AC-4.5`
  - **Steps**:
    1. Attach click listeners to all `.delete-btn` elements.
    2. Store the index of the targeted row and reveal `#delete-modal`.
    3. Present message: *"Are you sure you want to delete this URL?"* with "Yes" and "No" buttons.
    4. Handle "No" click: hide modal without altering DOM or storage.
    5. Handle "Yes" click:
       - Remove row from DOM.
       - Update storage array and call `StorageManager.saveLinks()`.
       - If the last remaining row was deleted, automatically re-initialize a single empty row per AC-4.5.
       - Hide modal.
    6. Add keyboard support: `Escape` key closes modal (No); `Enter` triggers confirmation (Yes).

---

## Phase 6: Embedded IPC REST Server, Configuration & Access Control

- [x] **TASK-10: Build Configurable Node.js HTTP Server Module**
  - **Ref**: `REQ-6`, `AC-6.1`, `AC-6.4`, `AC-6.5`, `AC-6.7`, `REQ-9`, `AC-9.2`, `AC-9.3`, `AC-9.4`, `AC-9.10`
  - **Steps**:
    1. Create `js/ipc-server.js` utilizing Node.js native `http` module.
    2. Read host and port configuration from `ConfigManager` (defaulting to `127.0.0.1` and `41596`).
    3. Implement conditional startup: if `serverEnabled` is false, do not bind ports; if true, bind to configured host and port.
    4. Implement dynamic restart/rebind function (`restartServer(config)`) to apply settings updates without reloading the plugin.
    5. Implement CORS headers for all responses (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: *`, `Access-Control-Allow-Headers: *`).
    6. Implement `GET /health` returning status, version, host, port, and library path.
    7. Add error handling for port collision (`EADDRINUSE`) with descriptive logging.
    8. Ensure server cleanly terminates on window unload / `eagle.onPluginBeforeExit`.

- [x] **TASK-10B: Implement Access Control & IP Filtering Middleware**
  - **Ref**: `REQ-9`, `AC-9.5`, `AC-9.6`, `AC-9.7`, `AC-9.8`
  - **Steps**:
    1. Create `js/ip-filter.js`.
    2. Implement `isClientAuthorized(remoteAddress, config)`:
       - If `accessRestrictionEnabled` is false, return `true`.
       - Normalize IPv4-mapped IPv6 addresses (e.g. `::ffff:127.0.0.1` -> `127.0.0.1`).
       - If `'self'` is in `allowedClients`, match against `127.0.0.1`, `::1`, `localhost`.
       - Support exact IP matching (IPv4/IPv6).
       - Support wildcard subnet matching (e.g. `192.168.1.x` or `192.168.1.*` converted to `^192\.168\.1\.\d+$`).
       - Support hostname matching.
    3. In `ipc-server.js`, intercept incoming requests with the IP filter.
    4. If unauthorized, reject with HTTP 403 Forbidden and JSON payload `{"status":"error","message":"Forbidden: Client IP is not authorized."}`.

- [x] **TASK-10C: Implement Settings UI & Configuration Manager**
  - **Ref**: `REQ-9`, `AC-9.1`, `AC-9.2`, `AC-9.3`, `AC-9.4`, `AC-9.5`, `AC-9.6`, `AC-9.9`
  - **Steps**:
    1. Create `js/config.js` to manage reading/writing settings from `localStorage` with defaults:
       `{ serverEnabled: true, host: '127.0.0.1', port: 41596, accessRestrictionEnabled: false, allowedClients: ['self'] }`.
    2. Add `#settings-btn` gear button in header.
    3. Build `#settings-modal` in `index.html` with:
       - Server Enable toggle.
       - Host/IP input with validation.
       - Port input with range validation (1024–65535).
       - Restrict Access toggle.
       - Allowed clients input and clickable suggestion chips (`self`, `127.0.0.1`, `::1`, `192.168.1.x`).
    4. Connect event listeners to open modal, append suggestion chips on click, validate inputs, save to `localStorage`, trigger `restartServer()`, and dismiss modal.

- [x] **TASK-11: Implement REST Endpoints for Item Links**
  - **Ref**: `REQ-6`, `AC-6.2`, `AC-6.3`, `AC-6.4`, `AC-6.6`
  - **Steps**:
    1. Implement request router for `/api/item/:id/links`.
    2. Support `GET /api/item/:id/links`: Return `{ status: "success", itemId, links }`.
    3. Support `POST /api/item/:id/links`: Accept `{ url: "..." }` or `{ urls: [...] }`, append to item's `extra-links.json`, return updated list.
    4. Support `PUT /api/item/:id/links`: Accept `{ links: [...] }`, overwrite item's `extra-links.json`.
    5. Support `DELETE /api/item/:id/links`: Accept `{ index: ... }` or `{ url: "..." }`, remove target link.
    6. Implement 404 response if the item ID cannot be located in the library.

- [x] **TASK-11B: Implement Link Deduplication & Idempotent POST**
  - **Ref**: `REQ-6`, `AC-6.8`
  - **Steps**:
    1. Update `StorageManager.appendLink(itemId, newUrl, allowDuplicates)` to prevent adding duplicate links by comparing trimmed strings.
    2. Preserve intentional empty strings added via UI while skipping duplicate non-empty URLs.
    3. In `POST /api/item/:id/links`, return `addedCount` and `alreadyExists: true|false`.
    4. Skip disk writing and redundant UI re-render broadcasts if `addedCount === 0`.
    5. Support `"allowDuplicates": true` optional override in request body.

- [x] **TASK-12: Implement Live UI Refresh Dispatcher**
  - **Ref**: `REQ-6`, `AC-6.3`
  - **Steps**:
    1. Create an in-memory event dispatcher between `ipc-server.js` and `app.js`.
    2. When an external request updates links for `itemId`, check if `item.id === currentSelectedItemId`.
    3. If active, re-render the URL rows immediately with the newly added links, without requiring user deselect/reselect.

---

## Phase 7: Obsidian Client Integration Module & Reference

- [x] **TASK-13: Create Obsidian Integration Reference Documentation**
  - **Ref**: `REQ-6`, `AC-6.1`, `AC-6.2`, `AC-6.7`
  - **Steps**:
    1. Create `spec/eagle-extra-links/obsidian-integration.md` containing:
       - Ready-to-use TypeScript/JavaScript helper functions for Obsidian plugins using `requestUrl`.
       - Direct filesystem fallback implementation using Obsidian's Node `fs` access.
       - Example command: "Add Active Obsidian Note to Selected Eagle Item".
       - Example command: "Sync Obsidian Backlinks to Eagle Extra Links".

---

## Phase 8: Verification & End-to-End Testing

- [x] **TASK-14: Verify Inspector UI in Eagle**
  - **Ref**: `REQ-1`, `REQ-2`, `REQ-3`, `REQ-4`, `REQ-7`
  - **Steps**:
    1. Launch / reload plugin in Eagle.
    2. Select an asset with no extra links; confirm 1 blank input appears.
    3. Enter a web URL (`https://google.com`), click link icon; confirm browser opens.
    4. Enter an Obsidian URI (`obsidian://adv-uri?...`), click link icon; confirm Obsidian opens to target.
    5. Click "+" button multiple times; verify rows are added and focus shifts.
    6. Click "X" on a row; verify confirmation modal appears. Select "No" (verifying link persists); select "Yes" (verifying link is deleted).
    7. Switch Eagle themes (`Dark`, `Light`, `Gray`, `Blue`, `Purple`); verify UI adapts dynamically.

- [x] **TASK-15: Verify IPC REST API, Configuration & Access Control**
  - **Ref**: `REQ-6`, `AC-6.1`, `AC-6.2`, `AC-6.3`, `AC-6.4`, `AC-6.5`, `REQ-9`, `AC-9.1` – `AC-9.9`
  - **Steps**:
    1. Run `curl http://127.0.0.1:41596/health` and verify 200 OK response with version, host, and port.
    2. Test server toggle: turn server OFF in settings modal, apply; verify `curl` connection is refused. Turn server back ON, verify it responds.
    3. Test custom port: change port to `41597` in settings modal, apply; verify `curl http://127.0.0.1:41597/health` succeeds.
    4. Test access restriction:
       - Enable access restriction with `self`. Verify loopback requests succeed.
       - Add non-matching rule (e.g. `10.0.0.1`). Verify loopback request is rejected with HTTP 403 Forbidden.
       - Add `127.0.0.1` and `::1`. Verify loopback request is permitted again.
       - Test wildcard range `192.168.1.x` and verify subnet regex match.
    5. Send `POST http://127.0.0.1:41596/api/item/:id/links` with a test Obsidian link.
    6. Verify response contains updated link array and `extra-links.json` is updated on disk.
    7. While the item is visible in Eagle, send another POST request and verify the UI updates instantly in real time.
