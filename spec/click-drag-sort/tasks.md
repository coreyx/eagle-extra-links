# Implementation Tasks: Clickable Drag Handler & Link Sorting

## Task Overview

| ID | Status | Description | Dependencies |
| :--- | :---: | :--- | :--- |
| `TASK-DRAG-1` | [x] | Draft complete specification suite in `spec/click-drag-sort/` | None |
| `TASK-DRAG-2` | [x] | Implement drag styling, handle icons, and drop line indicators in `css/style.css` | `TASK-DRAG-1` |
| `TASK-DRAG-3` | [x] | Add `.drag-handle` rendering and single-row disabled logic in `js/app.js` | `TASK-DRAG-2` |
| `TASK-DRAG-4` | [x] | Implement HTML5 DnD event pipeline and input selection protection in `js/app.js` | `TASK-DRAG-3` |
| `TASK-DRAG-5` | [x] | Implement array reordering, state synchronization (`rowModes`), and save in `js/app.js` | `TASK-DRAG-4` |
| `TASK-DRAG-6` | [x] | Add automated test coverage in `test/test-runner.js` and execute tests | `TASK-DRAG-5` |
| `TASK-DRAG-7` | [x] | Update documentation (`README.md`, `CHANGELOG.md`) and commit changes | `TASK-DRAG-6` |

---

## Task Details

### `TASK-DRAG-1`: Specification Suite
- [x] Create `spec/click-drag-sort/requirements.md` (`REQ-15` through `REQ-18`).
- [x] Create `spec/click-drag-sort/tech.md` (Controlled draggable pattern, DnD event pipeline, CSS pseudo-elements).
- [x] Create `spec/click-drag-sort/design.md` (Inspector layout, Option A drop line wireframes, sequence diagram).
- [x] Create `spec/click-drag-sort/api.md` (Deterministic indexing, `PUT` reordering, `POST` append).
- [x] Create `spec/click-drag-sort/obsidian-integration.md` (Safe reading, non-disruptive appending, programmatic sorting).
- [x] Create `spec/click-drag-sort/tasks.md` (This checklist).

### `TASK-DRAG-2`: CSS Styling
- [x] Add `.drag-handle` button styling: `width: 20px`, `cursor: grab`, `user-select: none`.
- [x] Add `.drag-handle[disabled]` with `opacity: 0.35`, `cursor: default`, `pointer-events: none`.
- [x] Add `.url-row.dragging` with `opacity: 0.45`.
- [x] Add `.url-row.drop-above::before` and `.url-row.drop-below::after` 2px accent indicator lines.

### `TASK-DRAG-3`: DOM Rendering
- [x] Define `GRIP_ICON_SVG` template in `js/app.js`.
- [x] Prepend `.drag-handle` before `.mode-toggle` in `createRowElement()`.
- [x] Check `currentLinks.length <= 1` to set `disabled` attribute and appropriate tooltip on drag handle.

### `TASK-DRAG-4`: DnD Event Pipeline
- [x] Attach `mousedown` to `.drag-handle` to toggle `row.draggable = true`.
- [x] Attach `dragstart` on row: set `effectAllowed = 'move'`, add `.dragging`, track `draggedIndex`.
- [x] Attach `dragover` on row: `e.preventDefault()`, compute top/bottom half, set `.drop-above` / `.drop-below`.
- [x] Attach `dragleave` on row: clear drop indicator classes.
- [x] Attach `dragend` on row: clear all indicator classes, reset `row.draggable = false`.

### `TASK-DRAG-5`: Array Reordering & Persistence
- [x] Attach `drop` on row: calculate target index based on cursor position (`above`/`below`).
- [x] Splice `currentLinks` and `rowModes` concurrently.
- [x] Re-render list (`renderLinks()`).
- [x] Persist immediately via `StorageManager.saveLinks()`.

### `TASK-DRAG-6`: Testing & Verification
- [x] Add unit tests in `test/test-runner.js` verifying link reordering logic and persistence.
- [x] Run test suite with `node test/test-runner.js`.

### `TASK-DRAG-7`: Documentation & Release
- [x] Update `CHANGELOG.md` with version `1.2.0` and new feature notes.
- [x] Update `README.md` with drag-and-drop link sorting documentation.
- [x] Mark tasks as complete in `spec/click-drag-sort/tasks.md`.
- [x] Git commit all changes cleanly.
