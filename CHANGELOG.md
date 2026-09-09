# Changelog

All notable changes to the **Eagle Extra Links** plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-09

### Added
- **Clickable Drag Handler & Link Sorting**:
  - Dedicated 6-dot grip handle (`.drag-handle`) positioned on the far left of each row.
  - Safe controlled drag pattern: rows are only draggable when mouse interaction begins on `.drag-handle`, fully preserving native text selection in inputs.
  - Drop visual feedback (Option A): 2px accent-colored insertion lines (`.drop-above` / `.drop-below`) indicating the exact drop position, with dragged row fading to 45% opacity.
  - Single-row disabled state (Option A): drag handle remains visible on single rows but is dimmed (`opacity: 0.35`) and disabled (`cursor: default`), preventing unnecessary drag actions.
  - Atomic synchronization: reordering splices both `currentLinks` and `rowModes` concurrently to preserve active display modes across row movements.
  - Immediate persistence: automatically saves reordered links to `extra-links.json` without debounce delays upon dropping.
- **Specification Suite**:
  - Full specification suite added under `spec/click-drag-sort/` (`requirements.md`, `tech.md`, `design.md`, `api.md`, `obsidian-integration.md`, `tasks.md`).
- **Automated Testing**:
  - Unit tests added to `test/test-runner.js` for DnD drop index calculation logic and disk persistence of sorted lists.

### Changed
- **Default IPC Port Migration**:
  - Changed default REST IPC server port from `41596` to `41598` to eliminate port conflict with Eagle's official `mcp-server` plugin (which defaults to `41596`).
  - Added startup promise coalescing and guarded config change listeners in `IpcServer` to prevent duplicate listen attempts.
  - Added CLI test tool `test-push-link.js` and `test-push-link.ps1`.

## [1.1.0] - 2026-09-08

### Added
- **Title and URL Display Modes**:
  - Optional `title` property in data model and REST API for human-readable link names.
  - Segmented `[ T | U ]` button control on each row to toggle display between Title and URL with active state highlight.
  - Smart default display mode: rows with titles display in Title Mode (`T` active) by default; rows without titles display in URL Mode (`U` active) by default.
  - Native browser tooltip displaying the underlying target URL when hovering over an input in Title Mode.
  - Support for launching target URL from Title Mode via `Enter` or inline open icon.
  - Visual `.shake` animation feedback when attempting to launch empty URLs.
- **Sidecar Schema Version 2**:
  - `extra-links.json` upgraded to schema version 2 storing `[{ title: string, url: string }]`.
  - Transparent backward compatibility: legacy version 1 string arrays are automatically normalized to `{ title: '', url: '...' }` on load.
- **REST IPC Extensions**:
  - `GET /api/item/:id/links` returns array of `{ title, url }` objects.
  - `POST /api/item/:id/links` accepts `{ title, url }` and enriches titles on existing links if previously blank.
  - `PUT /api/item/:id/links` accepts array of `{ title, url }` objects.
  - `DELETE /api/item/:id/links` supports removing links by matching `url` or `index`.
- **Specifications & Documentation**:
  - Complete specification suite added under `spec/title-and-url-modes/` (`requirements.md`, `tech.md`, `design.md`, `api.md`, `obsidian-integration.md`, `tasks.md`).
- **Testing**:
  - Test runner expanded with v1-to-v2 normalization tests, title persistence, and title enrichment on duplicate post.

## [1.0.0] - 2026-09-08

### Added
- **Inspector UI**:
  - Dynamic URL rows with inline one-click external launcher button (`eagle.shell.openExternal`).
  - Native keyboard support: press `Enter` on any URL input to launch the link.
  - `+ Add URL` button to append new rows dynamically.
  - Delete button with in-inspector confirmation modal dialog and keyboard accessibility (`Enter` to confirm, `Escape` to cancel).
  - Debounced auto-save (300ms) with visual status indicator (`Saved` / `Saving...`) and instant flush on blur.
  - Preservation of empty input strings `""` to support template slots.
- **Sidecar Metadata Storage Engine**:
  - Isolated metadata persistence in `<LibraryPath>/images/<itemId>.info/extra-links.json`.
  - Atomic write mechanism using temporary swap files (`extra-links.json.tmp.<timestamp>`) to prevent file corruption.
- **Embedded HTTP REST IPC Server**:
  - Local HTTP REST server running on port `41596` with full CORS preflight support.
  - `GET /health` endpoint returning health status, version, and active Eagle library path.
  - `GET /api/item/:id/links` endpoint returning stored links array.
  - `POST /api/item/:id/links` endpoint to append links with automated deduplication (`addedCount`, `alreadyExists`).
  - `PUT /api/item/:id/links` endpoint to replace the full link list for an asset.
  - `DELETE /api/item/:id/links` endpoint to remove links by exact URL or index.
  - Real-time UI synchronization: automatically refreshes the Eagle Inspector view when an external IPC call modifies the currently inspected asset.
- **Configuration Manager & Settings Modal**:
  - Settings modal with on/off server toggle, bind host (default `127.0.0.1`), port (default `41596`), and client access restriction.
  - Persistent storage in `localStorage` with fallback `config.json`.
  - Clickable suggestion chips for common IP entries (`self`, `127.0.0.1`, `::1`, `192.168.1.x`).
- **IP Access Filtering**:
  - IP filtering middleware with IPv4/IPv6 loopback normalization (`self`, `127.0.0.1`, `::1`, `::ffff:127.0.0.1`).
  - Wildcard IP subnet range matching (e.g. `192.168.1.x`, `192.168.1.*`).
  - Rejection with structured HTTP `403 Forbidden` response for unauthorized clients.
- **Theme Adaptation**:
  - Full native theming support across 6 Eagle themes (`DARK`, `GRAY`, `LIGHT`, `LIGHTGRAY`, `BLUE`, `PURPLE`).
  - Dynamic theme synchronization using `eagle.onThemeChanged`.
- **Format Support**:
  - Extended `manifest.json` `preview` extension whitelist for all major Eagle asset types: images, vectors, documents, video, audio, and web links.
- **Specifications & Documentation**:
  - Complete specifications in EARS format (`spec/eagle-extra-links/requirements.md`).
  - Technical architecture guide (`spec/eagle-extra-links/tech.md`).
  - System design and UI wireframes (`spec/eagle-extra-links/design.md`).
  - Standalone REST API documentation (`spec/eagle-extra-links/api.md`).
  - Drop-in Obsidian integration guide with TypeScript helper class (`spec/eagle-extra-links/obsidian-integration.md`).
  - Implementation task checklist (`spec/eagle-extra-links/tasks.md`).
- **Testing**:
  - Comprehensive unit and integration test suite (`test/test-runner.js`) verifying IP filtering, configuration, atomic storage, REST endpoints, deduplication, and port collision handling.
