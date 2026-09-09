# Implementation Tasks: Title and URL Display Modes

This checklist outlines the concrete implementation tasks for the **Title and URL Display Modes** feature. Each task explicitly references the requirements (`REQ-X`) and acceptance criteria (`AC-X.Y`) defined in [`requirements.md`](./requirements.md).

---

## Phase 1: Storage Engine & Schema Version 2

- [x] **TASK-TU-1: Implement Link Normalization & V1 Compatibility**
  - **Ref**: `REQ-10`, `AC-10.1`, `AC-10.4`
  - **Steps**:
    1. In `js/storage.js`, add `normalizeLink(entry)` helper function.
    2. Convert raw strings `["https://..."]` to `{ title: "", url: "https://..." }`.
    3. Ensure object entries sanitize `title` and `url` to strings, defaulting missing properties to `""`.
    4. Update `loadLinks(itemId)` to map loaded links through `normalizeLink()`.

- [x] **TASK-TU-2: Update Storage Serialization to Schema Version 2**
  - **Ref**: `REQ-10`, `AC-10.2`, `AC-10.3`, `AC-10.5`
  - **Steps**:
    1. In `js/storage.js`, update `saveLinks(itemId, links)` to emit `"version": 2`.
    2. Ensure empty string titles (`""`) and blank URLs (`""`) are preserved in the saved JSON array.
    3. Update `appendLink(itemId, newEntry, allowDuplicates)`:
       - Accept either string or object `{ title, url }` (or arrays of either).
       - Check duplicates against `link.url.trim()`.
       - If duplicate found, check if incoming `title` is non-empty while existing title is empty; if so, update existing title.
       - Return `{ links, addedCount, alreadyExists }`.

---

## Phase 2: CSS Styling & Native Theme Tokens

- [x] **TASK-TU-3: Implement Segmented [T|U] Mode Toggle & Active Highlight**
  - **Ref**: `REQ-11`, `AC-11.3`, `AC-11.4`
  - **Steps**:
    1. In `css/style.css`, create `.mode-toggle` container styles: `display: inline-flex`, `height: 28px`, `border: 1px solid var(--border-color)`, `border-radius: 4px`, `overflow: hidden`.
    2. Style `.mode-btn`: `width: 22px`, `height: 100%`, `font-size: 10px`, `font-weight: 600`, `background: var(--bg-input)`, `color: var(--text-secondary)`.
    3. Style `.mode-btn.active`: `background: var(--btn-primary-bg)`, `color: #ffffff`, `font-weight: 700`.
    4. Style hover states on inactive buttons: `background: var(--btn-hover)`.
    5. Verify look and feel across all 6 Eagle themes (`DARK`, `GRAY`, `LIGHT`, `LIGHTGRAY`, `BLUE`, `PURPLE`).

---

## Phase 3: Inspector UI & Mode Toggling (`app.js`)

- [x] **TASK-TU-4: Update URL Row Markup & Initial Mode Resolution**
  - **Ref**: `REQ-11`, `AC-11.1`, `AC-11.2`, `AC-11.5`
  - **Steps**:
    1. In `js/app.js`, maintain `rowModes` array tracking `'title' | 'url'` per row index.
    2. In `renderLinks()`, resolve default mode for each link: `(link.title && link.title.trim().length > 0) ? 'title' : 'url'`.
    3. Generate the segmented `.mode-toggle` HTML before `.input-wrapper` containing `.mode-btn.mode-t` and `.mode-btn.mode-u`.
    4. Apply `.active` class to the button matching current mode.
    5. Set input value to `link.title` if in Title Mode, or `link.url` if in URL Mode.
    6. Set placeholder to `"Title (optional)"` for Title Mode, and `"https://... or obsidian://..."` for URL Mode.

- [x] **TASK-TU-5: Implement Mode Toggling & Input Synchronization**
  - **Ref**: `REQ-11`, `AC-11.3`, `AC-11.4`, `AC-11.7`, `AC-11.8`
  - **Steps**:
    1. Attach click listener to `.mode-t` button:
       - Commit active input value to `link.url` if coming from URL Mode.
       - Set `rowModes[index] = 'title'`.
       - Update input value, placeholder, and tooltip to Title Mode.
       - Toggle `.active` class to `.mode-t`.
       - Focus the input.
    2. Attach click listener to `.mode-u` button:
       - Commit active input value to `link.title` if coming from Title Mode.
       - Set `rowModes[index] = 'url'`.
       - Update input value, placeholder, and tooltip to URL Mode.
       - Toggle `.active` class to `.mode-u`.
       - Focus the input.
    3. In input `input` event listener, write to `link.title` if currently in Title Mode, or `link.url` if in URL Mode, and trigger debounced save.

- [x] **TASK-TU-6: Implement Hover Tooltips & External Link Launching**
  - **Ref**: `REQ-12`, `AC-12.1`, `AC-12.2`, `REQ-13`, `AC-13.1`, `AC-13.2`
  - **Steps**:
    1. Set the input element's `title` attribute:
       - In Title Mode: `input.title = link.url || "No URL set"`.
       - In URL Mode: `input.title = link.title || link.url`.
    2. Ensure `.link-btn` click and input `Enter` keypress always invoke `openUrl(link.url)`.
    3. If `link.url` is empty, trigger shake visual animation.

---

## Phase 4: IPC REST Server Protocol Updates

- [x] **TASK-TU-7: Update IPC Endpoints for Title Support**
  - **Ref**: `REQ-14`, `AC-14.1`, `AC-14.2`, `AC-14.3`
  - **Steps**:
    1. In `js/ipc-server.js`, update `GET /api/item/:id/links` to return array of `{ title, url }` objects.
    2. In `POST /api/item/:id/links`:
       - Parse `body.title` (optional string) alongside `body.url` or `body.urls` / `body.links`.
       - Forward to `Storage.appendLink`.
       - Broadcast live UI update if `addedCount > 0` or if an existing link's title was enriched.
       - Return `{ status: "success", itemId, links, addedCount, alreadyExists }`.
    3. In `PUT /api/item/:id/links`, normalize request array elements to `{ title, url }`.

---

## Phase 5: Automated Testing & Verification

- [x] **TASK-TU-8: Expand Automated Test Suite**
  - **Ref**: `AC-10.1`, `AC-10.4`, `AC-14.1`, `AC-14.2`, `AC-14.3`
  - **Steps**:
    1. In `test/test-runner.js`, add test for v1 string array loading and normalization.
    2. Test `StorageManager.appendLink` with `{ title: "My Title", url: "https://..." }`.
    3. Test duplicate POST with title enrichment.
    4. Test `GET /api/item/:id/links` response structure.
    5. Run `node test/test-runner.js` to ensure all tests pass.

---

## Phase 6: End-to-End Verification in Eagle

- [x] **TASK-TU-9: Manual Inspector Validation**
  - **Ref**: `AC-11.1`, `AC-11.2`, `AC-11.3`, `AC-11.4`, `AC-12.1`, `AC-13.1`
  - **Steps**:
    1. Load unpacked plugin in Eagle.
    2. Inspect an asset, verify rows with titles open in Title Mode (`T` highlighted).
    3. Inspect an asset without titles, verify rows open in URL Mode (`U` highlighted).
    4. Click `T` and `U` toggles; verify instantaneous switching and input value changes.
    5. Hover over input in Title Mode; verify tooltip shows the URL.
    6. Click link launch button in Title Mode; verify browser/Obsidian opens target URL.
    7. Switch Eagle themes; verify high-contrast button styling across Dark, Light, Blue, and Purple themes.
