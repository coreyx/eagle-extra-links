# Eagle Extra Links 🔗

[![Eagle Plugin](https://img.shields.io/badge/Eagle-Plugin-3370FF.svg)](https://eagle.cool)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue.svg)](https://eagle.cool)
[![Node.js](https://img.shields.io/badge/Node.js-Builtin-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Extra Links** is an Inspector plugin for [Eagle](https://eagle.cool) (`eagle.cool`) that allows creatives, researchers, and knowledge workers to associate **multiple clickable URLs, URIs, and deep links** (Obsidian backlinks, Figma files, ArtStation references, Notion pages, local file links) with any asset in their Eagle library.

It includes **human-readable titles** with instant **Title (`T`) / URL (`U`) mode toggles**, URL preview tooltips on hover, **clickable drag-and-drop link reordering**, safe **atomic sidecar storage** (`extra-links.json`), native 6-theme adaptation, and an **embedded Node.js HTTP REST IPC server** with IP access control and automatic link deduplication for smooth, naive Obsidian paste integration.

---

## 📸 Overview & Visual Interface

```
+-------------------------------------------------------------------------+
| EXTRA LINKS                                                   Saved [⚙] |
|                                                                         |
| +----+ +----+ +-------------------------------------+--+   +----------+ |
| |::::| |*T*|U| | Character Turnaround Sheet           |[]|   |    X     | |
| +----+ +----+ +-------------------------------------+--+   +----------+ |
|   ^      ^      ^ Human-readable title                ^          ^      |
| Drag    Mode    (Hover cursor for URL preview)     Launch     Delete    |
| Handle  Toggle                                                          |
|                                                                         |
| +----+ +----+ +-------------------------------------+--+   +----------+ |
| |::::| | T|*U*| | obsidian://adv-uri?vault=Main...    |[]|   |    X     | |
| +----+ +----+ +-------------------------------------+--+   +----------+ |
|          ^      ^ Raw URL mode (Title empty or user viewing URL)        |
|          U active                                                       |
|                                                                         |
| [+ Add URL]                                                             |
+-------------------------------------------------------------------------+
```

---

## ✨ Features

- 🔗 **Unlimited Links per Item**: Break free from Eagle's single-URL limitation. Attach references, source pages, project notes, or design files to any asset.
- ↕️ **Click & Drag Link Sorting**:
  - Reorder links intuitively one item at a time using a dedicated 6-dot grip handle (`⋮⋮`) on the far left.
  - **Drop Indicator Lines**: Clear 2px accent-colored insertion lines preview exactly where the row will land (above or below hovered item).
  - **Text Selection Safety**: Drag is strictly gated to the handle (`mousedown`), so selecting, clicking, or highlighting text inside the input box is never hijacked.
  - **State-Preserving & Immediate**: Swapping rows preserves active Title/URL display modes and saves directly to disk without debounce delay.
  - **Single-Row State**: Dimmed handle (`opacity: 0.35`, `cursor: default`) when only one row exists.
- 🏷️ **Human-Readable Titles & Modes (`[T|U]`)**:
  - Each row features a segmented **`T`** (Title) and **`U`** (URL) toggle.
  - **Smart Default**: Rows with a title open in Title Mode (`T` active); rows without a title open in URL Mode (`U` active).
  - Seamlessly switch between viewing/editing the title and the raw URL with a single click.
- 🔍 **URL Hover Tooltips**: While in Title Mode, hovering your mouse over the text input reveals the underlying URL in a native tooltip.
- ⚡ **Instant Launching**:
  - Click the open icon (`[]`) or press `Enter` in the field (in either Title Mode or URL Mode) to launch the target in your default browser or desktop application (`eagle.shell.openExternal`).
  - Safe protocol validation (`http:`, `https:`, `obsidian:`, `notion:`, `file:`).
  - Empty URL protection: pressing Enter on a blank field gives a subtle shake animation without opening invalid URLs.
- 🛡️ **Safe, Atomic Sidecar Storage**:
  - Stored inside each item's `.info` folder at `<LibraryPath>/images/<itemId>.info/extra-links.json`.
  - Never touches or risks corrupting Eagle's internal `metadata.json`.
  - Preserved in Trash: sidecar data stays with the asset and reappears automatically when restored from Eagle's Trash.
  - Atomic writes (`.tmp` staging file -> rename) prevent file loss during unexpected power loss or crashes.
  - Automatic migration: seamlessly loads legacy Version 1 string arrays and upgrades to Schema Version 2.
- 🎨 **Native Theme Adaptation**:
  - Matches Eagle's built-in inspector styling with pixel precision.
  - Automatically updates colors in real time across all 6 Eagle themes: `DARK`, `GRAY`, `LIGHT`, `LIGHTGRAY`, `BLUE`, and `PURPLE`.
- 🌐 **Embedded HTTP REST IPC Server**:
  - Operates a local HTTP server on port `41598` (configurable).
  - Programmatically query, append, replace, or delete links from external tools like Obsidian, Raycast, Alfred, or custom CLI scripts.
  - **Real-Time UI Synchronization**: When an external script modifies links via IPC, the Eagle Inspector immediately updates live without requiring you to reselect the asset.
- 🔁 **Automatic Deduplication & Idempotent POST**:
  - Obsidian plugins can naively send `POST` requests every time an asset is pasted into a note without querying first.
  - Eagle Extra Links automatically prevents duplicate links and enriches existing titles if previously blank, returning `200 OK` with `{ addedCount: 0, alreadyExists: true }`.
- 🔒 **Configurable Server & Access Control**:
  - On/Off server toggle for security-conscious users.
  - Configurable bind host (e.g. `127.0.0.1` for loopback, `0.0.0.0` for LAN).
  - Configurable port (`1024`–`65535`).
  - IP restriction filter with CIDR/wildcard matching (`192.168.1.x`, `self`, `127.0.0.1`, `::1`).
- 📁 **Universal Format Support**:
  - Appears for all major Eagle asset formats: images (`jpg, png, gif, webp, svg`), vectors (`ai, eps`), documents (`pdf, txt, md`), video (`mp4, mov, webm`), audio (`mp3, wav, flac`), and bookmarks (`url, html`).

---

## 🚀 Installation

### Option 1: Developer Mode (Recommended for testing & development)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/eagle-extra-links.git
   ```
2. Open **Eagle** (`eagle.cool`).
3. In the menu bar, navigate to **Eagle > Preferences > Developer** (or enable Developer Mode).
4. Click **Load Unpacked Plugin...** and select the `eagle-extra-links` repository folder.
5. Select any asset in Eagle—the **EXTRA LINKS** section will appear in the right Inspector panel!

### Option 2: Eagle Plugin Package
Double-click the exported `.eagleplugin` package to install directly into Eagle.

---

## 🖥️ Using the Inspector UI

### Adding & Editing Links
1. Select any asset in your Eagle library.
2. Type or paste a URL into the input field (e.g. `https://artstation.com/artwork/ref` or `obsidian://adv-uri?...`).
3. Click the **`T`** button to switch to Title Mode and enter a friendly name (e.g. `"Character Concept Reference"`).
4. Click **`+ Add URL`** to add additional fields.
5. Changes auto-save in the background (indicated by `Saving...` / `Saved` in the header). Blank fields are intentionally preserved.

### Launching Links
- Click the external link icon on the right side of the input, or press `Enter` while inside the field.
- The link opens in your OS default browser or associated desktop application (such as Obsidian).

### Deleting Links
- Click the delete button (`✕`) on any row.
- A confirmation modal will appear: press `Enter` or click **Yes** to confirm, or press `Escape` / click **No** to cancel.

### Reordering Links (Drag & Drop)
- Click and hold the 6-dot grip handle (`⋮⋮`) on the far left of any row.
- Drag up or down over other rows. A 2px accent indicator line will preview where the row will be placed (above or below the hovered target).
- Release the mouse button to drop. The links immediately reorder and save to disk, preserving each link's active Title/URL display mode.
- Selecting, double-clicking, or highlighting text inside the input box never triggers a drag.
- When an item has only a single link row, the drag handle is automatically dimmed and disabled.

### 🗑️ Items in Eagle's Trash
> [!NOTE]
> Extra links will not be shown when a content item is in the **Trash** in Eagle due to what seems like an Eagle limitation (Eagle does not render custom Inspector plugins for trashed assets). However, the sidecar data in `extra-links.json` remains safely stored with the item inside its `.info` directory and will be displayed again as soon as the item is restored.

---

## ⚙️ IPC Server Configuration

Click the gear icon (`⚙️`) in the header to open the **IPC Server Settings** dialog:

| Setting | Default | Description |
| :--- | :--- | :--- |
| **Enable IPC Server** | `true` (On) | Toggle HTTP server on or off completely |
| **Bind Host / IP** | `127.0.0.1` | Host address to bind (`127.0.0.1` for local, `0.0.0.0` for LAN) |
| **Port** | `41598` | Port number to listen on (range: `1024`–`65535`) |
| **Restrict Client Access** | `false` (Off) | Restrict incoming connections to specific IPs or hostnames |
| **Allowed Clients** | `self` | Comma-separated whitelist (supports exact IP, `self`, `192.168.1.x` wildcards) |

*Preset suggestion chips (`+ self`, `+ 127.0.0.1`, `+ ::1`, `+ 192.168.1.x`) allow quick one-click IP configuration.*

---

## 📡 REST API Reference

The plugin embeds an HTTP REST server listening on `http://127.0.0.1:41598`.

### Endpoints Overview

| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Health check, version, and active Eagle library path |
| `GET` | `/api/item/:id/links` | None | Returns array of `{ title, url }` for specified item |
| `POST` | `/api/item/:id/links` | `{ "title": "...", "url": "..." }` | Appends link with deduplication |
| `PUT` | `/api/item/:id/links` | `{ "links": [{ title, url }] }` | Replaces full link list for item |
| `DELETE` | `/api/item/:id/links` | `{ "url": "..." }` or `{ "index": 0 }` | Deletes a specific link |

### Examples

#### 1. Retrieve Links
```bash
curl -s http://127.0.0.1:41598/api/item/MTSPUNN17LBUG/links
```
**Response (200 OK)**:
```json
{
  "status": "success",
  "itemId": "MTSPUNN17LBUG",
  "links": [
    {
      "title": "Character Turnaround Sheet",
      "url": "https://artstation.com/artwork/example"
    },
    {
      "title": "Project Notes",
      "url": "obsidian://adv-uri?vault=Main&uid=db4d22f3-52cb-4de0"
    }
  ]
}
```

#### 2. Append Link with Title (Idempotent)
```bash
curl -X POST http://127.0.0.1:41598/api/item/MTSPUNN17LBUG/links \
     -H "Content-Type: application/json" \
     -d '{"title": "Obsidian Note", "url": "obsidian://adv-uri?vault=Main&uid=db4d22f3"}'
```
**Response (200 OK - New Link Added)**:
```json
{
  "status": "success",
  "itemId": "MTSPUNN17LBUG",
  "links": [...],
  "addedCount": 1,
  "alreadyExists": false
}
```
**Response (200 OK - Duplicate Skipped)**:
```json
{
  "status": "success",
  "itemId": "MTSPUNN17LBUG",
  "links": [...],
  "addedCount": 0,
  "alreadyExists": true
}
```

*For complete REST API documentation and error schemas, see [`spec/title-and-url-modes/api.md`](./spec/title-and-url-modes/api.md).*

---

## 🔮 Obsidian Integration

Integrating with [Obsidian](https://obsidian.md) is straightforward. When you paste an Eagle asset into an Obsidian note, an Obsidian plugin can naively trigger a `POST` request to attach the note backlink to Eagle:

```typescript
// Example: In an Obsidian editor-paste handler
app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor, view: MarkdownView) => {
    const activeFile = view.file;
    if (!activeFile) return;

    // Extract note title and frontmatter UID
    const cache = app.metadataCache.getFileCache(activeFile);
    const noteUid = cache?.frontmatter?.uid;
    const noteTitle = cache?.frontmatter?.title || activeFile.basename;
    const vaultName = encodeURIComponent(app.vault.getName());

    const eagleItemId = extractEagleItemId(evt.clipboardData);
    if (eagleItemId && noteUid) {
        const backlinkUri = `obsidian://adv-uri?vault=${vaultName}&uid=${noteUid}`;

        // Naively POST without pre-checking:
        // Eagle Extra Links automatically deduplicates and displays the note title!
        await requestUrl({
            url: `http://127.0.0.1:41598/api/item/${eagleItemId}/links`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: noteTitle, url: backlinkUri })
        });
    }
});
```

*For the complete TypeScript client helper and offline fallback implementation, see [`spec/title-and-url-modes/obsidian-integration.md`](./spec/title-and-url-modes/obsidian-integration.md).*

---

## 📂 Data Model & Storage

Extra Links persists data inside each item's `.info` folder:

```
Main.library/
└── images/
    └── MTSPUNN17LBUG.info/
        ├── metadata.json       <-- Untouched Eagle metadata
        ├── MTSPUNN17LBUG.png   <-- Asset file
        └── extra-links.json    <-- Extra Links sidecar file (Schema v2)
```

**`extra-links.json` (Schema Version 2)**:
```json
{
  "version": 2,
  "itemId": "MTSPUNN17LBUG",
  "links": [
    {
      "title": "Concept Art Reference",
      "url": "https://artstation.com/artwork/ref"
    },
    {
      "title": "",
      "url": "https://example.com"
    }
  ],
  "updatedAt": 1725850000000
}
```

---

## 🧪 Testing & CLI Diagnostics

### 1. Automated Test Suite
The repository includes a comprehensive, zero-dependency automated unit and integration test runner verifying all subsystems:

```bash
node test/test-runner.js
```

**Test Coverage**:
- IP access filter (IPv4/IPv6 normalization, loopback `self`, wildcard ranges `192.168.1.x`).
- Configuration persistence and validation.
- Sidecar storage engine (v1-to-v2 normalization, atomic file swapping, preservation of blank slots).
- Drag-and-drop index calculation logic and disk persistence of sorted lists.
- HTTP REST IPC server endpoints (`/health`, `GET`, `POST`, `PUT`, `DELETE`).
- Automatic link deduplication, title enrichment, and `allowDuplicates` override.
- Access control rejection (HTTP 403 Forbidden).

---

### 2. Interactive CLI Link Tester (`test-push-link.js` & `test-push-link.ps1`)

Use the included test tool to verify IPC server connectivity, push links with custom titles and URLs, and inspect the resulting stored links.

#### Quick Start (Interactive Prompt)
If you run without arguments in a terminal, the script auto-discovers items from your active Eagle library and interactively prompts for link details:

```bash
node test-push-link.js
```

Or via PowerShell:
```powershell
.\test-push-link.ps1
```

#### CLI Options & Flags

| Flag | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `--title <title>` | `-t` | Link title (human-readable label) | Interactive prompt |
| `--url <url>` | `-u` | Target URL, web address, or deep link URI | Interactive prompt |
| `--id <itemId>` | `-i` | Target Eagle Item ID | Auto-detected from Eagle |
| `--port <port>` | `-p` | Extra Links REST IPC port | `41598` (auto-scans if busy) |
| `--host <host>` | `-H` | Host address | `127.0.0.1` |
| `--standalone` | `-s` | Run in-process test server (no Eagle plugin required) | `false` |
| `--allow-duplicates` | `-d` | Explicitly permit duplicate URLs | `false` (idempotent) |
| `--json` | | Print raw JSON response from IPC server | `false` |
| `--help` | `-h` | Display help screen and usage examples | |

#### Common Usage Examples

**1. Push with title and URL to auto-detected active item:**
```bash
node test-push-link.js --title "Obsidian Note" --url "obsidian://adv-uri?vault=Main&uid=123"
```

**2. Push to specific Eagle item and custom port:**
```bash
node test-push-link.js --id MTSPUNN17LBUG --title "Figma Spec" --url "https://figma.com/file/xyz" --port 41598
```

**3. Test immediately in Standalone Mode:**
Spins up a temporary Extra Links server in-process against your library directly without needing the plugin open in Eagle UI:
```bash
node test-push-link.js --standalone --title "Documentation" --url "https://eagle.cool/blog"
```

**4. PowerShell command passing:**
```powershell
.\test-push-link.ps1 -Title "Design Token Spec" -Url "https://tokens.example.com"
```

#### Pro-Tips & Troubleshooting

- **Smart Item Auto-Discovery**: If you don't supply an `--id`, the script queries Eagle Core's API (`http://127.0.0.1:41595/api/item/list`) to automatically locate the latest item in your open library.
- **Port Conflict Protection**: Default port is `41598` to guarantee zero collisions with Eagle Core (`41595`), Eagle's official `mcp-server` (`41596`), or `ai-sdk` (`41597`). If port 41598 is busy, the script automatically scans alternate ports (`41599`, `41600`, `41605`).
- **Idempotency & Title Enrichment**: Running the script with an existing URL will not duplicate the link. If the existing link previously had a blank title, sending a new title will automatically enrich it in-place!
- **Safe Termination**: The script disables HTTP socket keep-alive (`agent: false`, `Connection: close`) and terminates cleanly (`process.exit(0)`) so it never hangs in scripts or CI.

---

## 📁 Repository Structure

```
eagle-extra-links/
├── css/
│   └── style.css                     # Native Eagle theming (6 themes), drag handles & drop lines
├── js/
│   ├── app.js                        # Inspector controller, HTML5 DnD pipeline & state machine
│   ├── config.js                     # IPC settings manager & localStorage cache
│   ├── ip-filter.js                  # Access control & IP matching middleware
│   ├── ipc-server.js                 # Embedded Node.js HTTP REST IPC server
│   └── storage.js                    # Atomic sidecar storage engine & Schema v2
├── spec/
│   ├── eagle-extra-links/            # Core system specifications (v1.0.0)
│   ├── title-and-url-modes/          # Title & URL display mode specifications (v1.1.0)
│   └── click-drag-sort/              # Clickable drag handler & link sorting specs (v1.2.0)
│       ├── requirements.md           # EARS requirements & acceptance criteria
│       ├── tech.md                   # Controlled draggable pattern & DnD pipeline
│       ├── design.md                 # UI layout wireframes & sequence diagrams
│       ├── api.md                    # REST API link ordering semantics
│       ├── obsidian-integration.md   # Link ordering preservation in Obsidian
│       └── tasks.md                  # Implementation tracking checklist
├── test/
│   └── test-runner.js                # Automated unit & integration test suite
├── test-push-link.js                 # Interactive CLI test script for testing & pushing links
├── test-push-link.ps1                # PowerShell wrapper for test-push-link.js
├── CHANGELOG.md                      # Keep a Changelog version history
├── RELEASE_NOTES.md                  # User-facing release notes
├── manifest.json                     # Eagle plugin manifest
├── index.html                        # Inspector HTML layout & dialog markup
└── README.md                         # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).