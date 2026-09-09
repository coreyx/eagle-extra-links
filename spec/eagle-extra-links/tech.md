# Technical Specification: Eagle Extra Links Plugin

## 1. Technical Stack Overview

| Component | Technology | Purpose / Role |
| :--- | :--- | :--- |
| **Host Application** | Eagle 4.0+ (Build 17+) | Digital asset manager desktop host (Electron-based) |
| **Operating Systems** | Windows (10/11, x64/arm64), macOS (Intel/Apple Silicon) | Target cross-platform desktop operating systems |
| **Plugin Type** | Eagle Inspector Plugin | Renders custom sidebar panels in Eagle's right-hand Inspector |
| **Runtime Environment** | Electron Chromium WebView + Node.js Native Integration | Executes plugin UI while exposing full Node.js standard library |
| **Frontend Language** | HTML5, Modern Vanilla JavaScript (ES2022+) | Inspector UI structure and event orchestration (zero external build tools) |
| **UI & Styling** | Modern CSS3, CSS Custom Properties (Variables), Flexbox | Native Eagle theme matching and responsive Inspector widget layout |
| **Persistence Engine** | Node.js `fs.promises` (File System) | Atomic read/write of `extra-links.json` sidecar files in `.info` folders |
| **IPC Server** | Node.js Native `http` Module | Embedded RESTful server on `127.0.0.1:41598` for external integrations |
| **External Client** | Obsidian (obsidian.md) Desktop App | External knowledge base client communicating via IPC |
| **Client Transport** | Obsidian `requestUrl` / Standard `fetch` | Cross-platform HTTP requests from Obsidian to Eagle plugin |

---

## 2. Host Application & Eagle Plugin API Integration

### 2.1 Plugin Architecture: Inspector Plugin
The plugin is structured as an **Inspector** plugin under the Eagle Plugin API. Unlike Window or Service plugins, Inspector plugins are embedded directly inside the right-hand panel of Eagle's main window whenever an asset with a matching file extension is selected.

Inspector plugins are registered in `manifest.json` under the `preview` property:
```json
{
  "id": "244578b2-3bcf-461f-b03a-b698bae53984",
  "version": "1.0.0",
  "platform": "all",
  "arch": "all",
  "name": "Extra Links",
  "logo": "/logo.png",
  "keywords": ["links", "urls", "obsidian", "references", "inspector"],
  "devTools": true,
  "preview": {
    "jpg,jpeg,png,gif,webp,bmp,tif,tiff,svg,ai,eps,pdf,txt,md,mp4,mov,avi,webm,mkv,mp3,wav,m4a,flac,aac,url,webloc,html": {
      "inspector": {
        "path": "index.html",
        "height": 130,
        "multiSelect": false
      }
    }
  }
}
```

### 2.2 Eagle APIs Utilized
The plugin leverages the following official Eagle APIs:
1. **`eagle.onPluginCreate(callback)`**:
   - Invoked when the plugin view is mounted for an inspected item.
   - Retrieves the active item via `eagle.item.getSelected()` and initial theme via `eagle.app.theme`.
2. **`eagle.onThemeChanged(callback)`**:
   - Listens for application-wide theme switches in real time.
   - Updates `document.body.setAttribute('theme', theme)` to trigger CSS custom property recomputations.
3. **`eagle.item.getSelected()` & `eagle.item.getById(itemId)`**:
   - Obtains the item instance. Exposes `item.id`, `item.name`, and `item.metadataFilePath`.
4. **`eagle.shell.openExternal(url)`**:
   - Delegates URL/URI launching to the operating system's default handler.
   - Supports web URLs (`http://`, `https://`) and desktop app schemes (`obsidian://`, `notion://`, `file:///`).
5. **`eagle.library.path` & `eagle.library.info()`**:
   - Resolves the active library root directory (e.g., `C:\Users\...\Main.library`).
6. **`eagle.log`**:
   - Outputs diagnostics and operational messages to Eagle's software console and log files.

---

## 3. Storage Architecture: Sidecar Metadata File

### 3.1 Why a Dedicated Sidecar File?
Eagle organizes its library as a collection of self-contained `.info` directories inside `<LibraryPath>/images/<itemId>.info/`. Each directory contains:
- `metadata.json`: Eagle's internal item manifest.
- The original file (e.g., `<itemId>.png`).
- Generated thumbnails (e.g., `<itemId>_thumbnail.png`).

Directly mutating `metadata.json` is strongly discouraged by Eagle's engineering team because unsanctioned property injections or race conditions can cause library indexing corruption or be overwritten by Eagle's internal SQLite sync mechanisms.

Instead, the Extra Links plugin stores its metadata in:
```
<LibraryPath>/images/<itemId>.info/extra-links.json
```

### 3.2 Benefits of the Sidecar Pattern
1. **Zero Database Pollution**: Keeps Eagle's internal schema 100% pristine.
2. **Automatic Cloud Sync**: If the user synchronizes their Eagle library via Dropbox, Google Drive, iCloud, OneDrive, or Synology, the `.info` directory synchronizes as a single unit. Extra links follow the asset across all workstations.
3. **Automatic Lifecycle Tracking**: Moving an item to the trash or deleting it in Eagle automatically trashes or deletes the entire `.info` directory, preventing orphaned link files.
4. **Offline Obsidian Compatibility**: Obsidian plugins running locally can read and write `extra-links.json` directly from the filesystem even when Eagle is closed.

### 3.3 Atomic Write & Debounce Strategy
- Writes are executed using Node.js `fs.promises.writeFile`.
- To prevent write contention and disk thrashing during active user typing, keystrokes trigger a 300ms debounce timer.
- When an input loses focus (`blur`), any pending save is flushed immediately.

---

## 4. IPC Architecture: Local HTTP REST Server

### 4.1 Communication Model
To ensure reliable, hassle-free communication between an Obsidian plugin and the Eagle Extra Links plugin on both Windows and macOS, the plugin embeds a lightweight HTTP server using Node.js's built-in `http` module:
- **Binding**: Configurable host/IP, defaulting to `127.0.0.1`. Can be set to `0.0.0.0` or a specific network interface IP for LAN access.
- **Port**: Configurable port, defaulting to `41598` (range 1024–65535).
- **On/Off Toggle**: Feature toggle allowing complete shutdown of the HTTP server (`server.close()`) for users who do not require external integrations.
- **Access Restriction (IP / IP Range / Hostname)**:
  - Optional filter defaulting to OFF.
  - When enabled, validates incoming socket `req.socket.remoteAddress` against a whitelist.
  - Supports:
    - `'self'`: Matches loopback addresses (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `localhost`).
    - Exact IP addresses (IPv4 & IPv6): e.g. `192.168.1.50`.
    - Wildcard ranges: e.g. `192.168.1.*` or `192.168.1.x` (converted to regex `^192\.168\.1\.\d+$` or subnet match).
    - Hostnames: matched against reverse lookup or hostname match.
  - Suggestions provided in UI: `self`, `127.0.0.1`, `::1`, `192.168.1.x`.
- **Protocol**: HTTP/1.1 with JSON request and response payloads.
- **CORS Support**: Implements preflight `OPTIONS` and headers:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

### 4.2 Configuration Storage
Settings are managed by a dedicated configuration module (`js/config.js`):
- Persisted to `localStorage` under key `eagle_extra_links_config` for instant synchronous retrieval on UI boot.
- Synchronized to a fallback `config.json` inside the plugin's data directory.
- Schema:
  ```json
  {
    "serverEnabled": true,
    "host": "127.0.0.1",
    "port": 41598,
    "accessRestrictionEnabled": false,
    "allowedClients": ["self"]
  }
  ```

### 4.3 Endpoint Design
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Health check; returns status, version, and active library path |
| `GET` | `/api/item/:id/links` | None | Returns JSON array of extra links for specified `itemId` |
| `POST` | `/api/item/:id/links` | `{ "url": "..." }`, `{ "urls": [...] }`, optional `"allowDuplicates": false` | Appends one or more URLs to the specified item. Idempotent by default: prevents duplicates (comparing trimmed strings), returns `addedCount` and `alreadyExists`. |
| `PUT` | `/api/item/:id/links` | `{ "links": [...] }` | Replaces the full link array for the specified item |
| `DELETE` | `/api/item/:id/links` | `{ "url": "..." }` or `{ "index": 0 }` | Deletes a specific link from the item |

### 4.4 Link Deduplication & Idempotency
To support external callers (such as an Obsidian plugin creating backlinks whenever an Eagle item is pasted into a note), `POST /api/item/:id/links` implements automatic server-side deduplication:
- **Default Behavior**: When a URL is posted, the server checks if a trimmed, case-exact match already exists in that item's stored links.
- **Duplicate Found**: If the URL already exists, the server does not append a duplicate and skips unnecessary disk writes. It returns HTTP status 200 with `{ "status": "success", "itemId": "...", "links": [...], "addedCount": 0, "alreadyExists": true }`.
- **New URL**: If the URL is new, it is appended to `extra-links.json`, returning HTTP 200 with `{ "addedCount": 1, "alreadyExists": false }`.
- **Opt-in Duplicates**: Clients may supply `"allowDuplicates": true` in the JSON request body to explicitly bypass deduplication.

### 4.5 Live UI Synchronization
When an external client (such as an Obsidian command) issues a `POST` or `PUT` to `/api/item/:id/links`:
1. The IPC server validates client IP authorization.
2. The IPC server determines if changes occurred (if `addedCount > 0`). If duplicate and no changes occurred, disk write and UI broadcasts are skipped.
3. If changes occurred, the IPC server writes the updated links to `extra-links.json`.
4. The IPC server checks if the currently inspected item in the Eagle UI matches `:id`.
5. If matched, an internal UI refresh event is triggered, instantly updating the displayed input fields without requiring the user to deselect and reselect the asset.

---

## 5. Obsidian Plugin Client Integration

### 5.1 Obsidian Desktop Architecture
Obsidian plugins execute in an Electron environment with full web standards (`fetch`, `DOM`) and Node.js access (`fs`, `path`). The Obsidian API provides the native `requestUrl` utility, which bypasses typical browser CORS restrictions and provides a consistent interface across Windows and macOS.

### 5.2 Obsidian Plugin Implementation Pattern
An Obsidian plugin can integrate with Eagle Extra Links via two complementary paths:
1. **Primary Path (REST IPC)**:
   ```typescript
   import { requestUrl } from 'obsidian';

   async function addEagleExtraLink(itemId: string, url: string): Promise<boolean> {
       try {
           const response = await requestUrl({
               url: `http://127.0.0.1:41598/api/item/${itemId}/links`,
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ url })
           });
           return response.status === 200 || response.status === 201;
       } catch (err) {
           console.error("Eagle Extra Links IPC error:", err);
           return false;
       }
   }
   ```
2. **Fallback Path (Direct Filesystem)**:
   If the HTTP server is unreachable (e.g. Eagle is shut down), the Obsidian plugin can query Eagle's library path via the Eagle Web API (port `41595`) or cached settings, locate `<library>/images/<itemId>.info/extra-links.json`, and append the link directly via Node `fs.promises.writeFile`.

---

## 6. UI Theming & Design System

### 6.1 Eagle Theming Engine
Eagle supports multiple user interface themes:
- `LIGHT`
- `LIGHTGRAY`
- `GRAY` (Default dark neutral)
- `DARK` (High contrast dark)
- `BLUE`
- `PURPLE`

### 6.2 CSS Variable Architecture
The plugin defines a comprehensive set of CSS Custom Properties mapped directly to the active theme attribute on `<body>`:

```css
body[theme="DARK"], body[theme="GRAY"] {
    --bg-primary: #202020;
    --bg-input: #2a2a2a;
    --bg-input-focus: #333333;
    --border-color: #3d3d3d;
    --border-focus: #5297ff;
    --text-primary: #e6e6e6;
    --text-secondary: #999999;
    --icon-color: #888888;
    --icon-hover: #ffffff;
    --delete-btn-hover: #ff5c5c;
    --btn-add-bg: #2d2d2d;
    --btn-add-hover: #3a3a3a;
}

body[theme="LIGHT"], body[theme="LIGHTGRAY"] {
    --bg-primary: #ffffff;
    --bg-input: #f5f5f5;
    --bg-input-focus: #ffffff;
    --border-color: #dddddd;
    --border-focus: #2d8cf0;
    --text-primary: #1f1f1f;
    --text-secondary: #777777;
    --icon-color: #999999;
    --icon-hover: #222222;
    --delete-btn-hover: #e02424;
    --btn-add-bg: #f0f0f0;
    --btn-add-hover: #e4e4e4;
}
```

This guarantees 100% visual consistency with Eagle's native Inspector widgets without requiring any third-party UI frameworks.
