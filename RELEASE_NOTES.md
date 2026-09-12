# Release Notes: Eagle Extra Links

## Release Notes: v1.2.0 (Clickable Drag Handler & Link Sorting)

**v1.2.0** introduces interactive drag-and-drop link reordering:

### 1. Clickable Drag Handler (`⋮⋮`)
- Each row features a dedicated 6-dot grip handle on the far left.
- **Controlled Draggable Pipeline**: Dragging is only initiated from the handle, ensuring that text selection and cursor movement within `.url-input` fields are never compromised.
- **Single-Row State**: When only one link row exists, the handle is automatically dimmed (`opacity: 0.35`) and disabled (`cursor: default`).

### 2. Option A Drop Indicator Lines
- While dragging over other rows, a 2px accent-colored insertion line (`--btn-primary-bg`) indicates whether the link will be dropped above or below the hovered target.
- The dragged row dims to 45% opacity during the drag operation.

### 3. Immediate State & Mode Preservation
- Dropping a row splices both `currentLinks` and `rowModes` in lockstep, preserving active Title (`T`) and URL (`U`) display states.
- Saves immediately to `extra-links.json` without debounce delay.

### 4. Default Port Migrated to 41598
- The default REST IPC server port is now `41598` (previously `41596`) to eliminate port collisions with Eagle's official `mcp-server` plugin (which runs on port `41596`).
- Integrated automated CLI testing tool `test-push-link.js` with port conflict detection and smart Eagle item auto-discovery.

---

## Release Notes: v1.1.0 (Title and URL Display Modes)

**v1.1.0** added support for human-readable link titles:
- **Title and URL Display Modes**: Segmented `[T|U]` button toggle on each row with active state styling.
- **Smart Defaults**: Rows with a title default to Title Mode; rows without a title default to URL Mode.
- **Hover Tooltips**: In Title Mode, hovering over an input shows the target URL in a tooltip.
- **Schema Version 2**: Upgraded `extra-links.json` with automatic backward compatibility for v1 string arrays.
- **Idempotent Title Enrichment**: Appending duplicate links with a new title enriches empty titles in-place.

---

## Release Notes: v1.0.0 (Initial Release)

We are thrilled to announce the initial **v1.0.0** release of **Extra Links for Eagle** (`eagle.cool`)!

Extra Links is an Inspector plugin designed for creatives, researchers, and knowledge workers who need to associate multiple clickable URLs, URIs, and deep links (such as Obsidian backlinks, Figma files, ArtStation references, Notion pages, and local file URIs) with any asset in their Eagle library.

---

## 🌟 Key Highlights

### 1. Unlimited Clickable Links in the Inspector
- Add as many URLs/URIs to an Eagle asset as you need.
- Seamless one-click opening in your system's default browser or desktop application via `eagle.shell.openExternal`.
- Keyboard-friendly: pressing `Enter` inside any link field immediately launches the URL.
- Empty fields are cleanly preserved as blank slots so you can organize template rows without losing your layout.

### 2. Universal File Format Support
- The Extra Links inspector panel automatically appears for all 130+ asset types supported by Eagle:
  - **Images & Vectors**: `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `heic`, `jxl`, `bmp`, `tif`, `tiff`, `svg`, `ai`, `eps`, `psd`, `cdr`, `raw`, `dng`, `arw`, `cr3`
  - **3D Assets**: `obj`, `fbx`, `glb`, `gltf`, `blend`, `stl`, `3ds`, `c4d`
  - **Documents & Data**: `pdf`, `txt`, `md`, `docx`, `xlsx`, `pptx`, `epub`, `json`, `csv`
  - **Video & Audio**: `mp4`, `mov`, `avi`, `webm`, `mkv`, `m4v`, `mp3`, `wav`, `m4a`, `flac`, `aac`, `ogg`
  - **Fonts**: `otf`, `ttf`, `woff`, `woff2`
  - **Web & Bookmarks**: `url`, `webloc`, `html`, `htm`

### 3. Safe, Atomic Sidecar Metadata Storage
- Eagle stores library items inside `<LibraryPath>/images/<itemId>.info/`.
- Extra Links writes to an isolated sidecar file (`extra-links.json`) inside the item directory, guaranteeing that Eagle’s internal `metadata.json` is never directly altered or corrupted.
- All writes are executed atomically using temporary file staging (`.tmp` -> atomic rename) to protect against unexpected app crashes or power loss.
- Input keystrokes are automatically debounced (300ms) with instant flush on blur, accompanied by a subtle `Saved` / `Saving...` indicator in the header.

### 4. Delete Confirmation Dialog
- Prevents accidental loss of reference URLs.
- Clicking the delete (`✕`) button prompts an in-inspector modal confirmation dialog.
- Supports keyboard navigation: `Enter` to confirm, `Escape` or clicking `No` to dismiss.

### 5. Native Eagle Theme Adaptation
- Automatically reads and synchronizes with Eagle's active color palette:
  - `DARK` & `GRAY`
  - `LIGHT` & `LIGHTGRAY`
  - `BLUE` & `PURPLE`
- Real-time theme switching via `eagle.onThemeChanged`—no plugin reloading required.

### 6. Embedded Cross-Platform HTTP REST IPC Server
- Operates a local HTTP server (default port `41596`, bind host `127.0.0.1`) enabling external tools to read and modify item links programmatically:
  - `GET /health` — Health check, version info, and library path.
  - `GET /api/item/:id/links` — Retrieve links for any asset by its Eagle Item ID.
  - `POST /api/item/:id/links` — Append one or more links.
  - `PUT /api/item/:id/links` — Replace all links for an asset.
  - `DELETE /api/item/:id/links` — Remove a link by URL or index.
- Includes full CORS support for browser and Electron fetch calls.
- **Live UI Refresh**: When an external script modifies links for the currently inspected item, the Eagle UI instantly re-renders in real time without requiring a deselect/reselect cycle.

### 7. Automatic Link Deduplication & Idempotent POST
- Designed specifically for automated integration workflows (e.g. Obsidian paste handlers).
- When external scripts call `POST /api/item/:id/links`, Eagle Extra Links checks for existing entries (comparing trimmed strings).
- Duplicate links are skipped without unnecessary disk writes, returning `200 OK` with `{ addedCount: 0, alreadyExists: true }`.
- External plugins can naively fire requests whenever an item is pasted without risk of polluting links.
- Optional `"allowDuplicates": true` override is available if explicit duplicates are ever required.

### 8. Configurable Server Settings & IP Access Control
- Access settings anytime by clicking the gear icon (`⚙️`) in the Extra Links header.
- **Server Toggle**: Turn the HTTP server on or off completely for security-conscious users.
- **Configurable Bind Host & Port**: Bind to `127.0.0.1` (default) or `0.0.0.0` for local network access. Choose any available port between `1024` and `65535`.
- **IP Access Restriction**:
  - Restrict access to authorized clients only.
  - Supports `'self'` (loopback), exact IPv4/IPv6 addresses, wildcard subnets (e.g. `192.168.1.x`), and hostnames.
  - One-click suggestion chips (`self`, `127.0.0.1`, `::1`, `192.168.1.x`).
  - Dynamic evaluation: IP whitelist changes take effect immediately without restarting the server.

### 9. Obsidian Integration Guide & Helper
- Complete integration documentation included in [`./spec/eagle-extra-links/obsidian-integration.md`](./spec/eagle-extra-links/obsidian-integration.md).
- Ready-to-use TypeScript `EagleExtraLinksClient` class using Obsidian's native `requestUrl`.
- Sample paste-handler snippet for automatically syncing Obsidian note backlinks when pasting Eagle assets.

---

## 🛠 Getting Started

1. Ensure the plugin folder is located in your Eagle plugins directory or loaded via Eagle's **Developer Mode > Load Unpacked Plugin**.
2. Select any asset in Eagle.
3. Look for the **EXTRA LINKS** section in the right-hand Inspector panel.
4. Type or paste your first URL, or click the gear icon (`⚙️`) to customize IPC server settings.
