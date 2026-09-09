# Changelog

All notable changes to the **Eagle Extra Links** plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
