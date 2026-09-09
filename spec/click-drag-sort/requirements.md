# Requirement Specifications: Clickable Drag Handler & Link Sorting

This document specifies the requirements for the **Clickable Drag Handler & Link Sorting** feature in the **Eagle Extra Links** plugin. This feature extends the foundational requirements (`REQ-1` through `REQ-9` in [`spec/eagle-extra-links/requirements.md`](../eagle-extra-links/requirements.md)) and Title/URL display modes (`REQ-10` through `REQ-14` in [`spec/title-and-url-modes/requirements.md`](../title-and-url-modes/requirements.md)).

Requirements follow the **Easy Approach to Requirements Syntax (EARS)**:
- **Ubiquitous**: *The [system/plugin] shall [behavior].*
- **Event-driven**: *When [trigger], the [system/plugin] shall [behavior].*
- **State-driven**: *While [condition], the [system/plugin] shall [behavior].*
- **Unwanted Behavior**: *If [error/edge condition], then the [system/plugin] shall [behavior].*
- **Optional**: *Where [feature flag is enabled], the [system/plugin] shall [behavior].*

---

## REQ-15: Clickable Drag Handler & Visual Grip

**User Story:**
*As an Eagle user, I want a dedicated grip handle on each link row so that I can click and drag to reorder my links without accidentally dragging text when trying to select or edit inputs.*

- **15.1 (Ubiquitous):** The plugin shall render a dedicated drag handle button (`.drag-handle`) positioned on the far left of each `.url-row` before the mode toggle `[T|U]`.
- **15.2 (Ubiquitous):** The drag handle shall display a standard 6-dot grip icon (two vertical columns of three dots: `⋮⋮`).
- **15.3 (State-driven):** While hovering over an active drag handle, the cursor shall be displayed as `grab`. While actively dragging, the cursor shall be displayed as `grabbing`.
- **15.4 (State-driven):** While only a single row exists in the Inspector (`currentLinks.length === 1`), the drag handle shall remain visible but be visually dimmed (`opacity: 0.35`) and functionally disabled (`cursor: default`), preventing unnecessary drag actions.
- **15.5 (Ubiquitous):** Dragging shall only initiate when the mouse interaction begins on the `.drag-handle`. Interactions inside `.url-input`, `.mode-btn`, `.link-btn`, or `.delete-btn` shall never initiate a row drag operation.

#### Acceptance Criteria
- **AC-15.1:** The drag handle appears on the far left of every row with a clean 6-dot SVG icon.
- **AC-15.2:** When multiple rows exist, hovering over the drag handle changes the cursor to `grab`.
- **AC-15.3:** When only 1 row exists, the drag handle is displayed with `opacity: 0.35` and `cursor: default`.
- **AC-15.4:** Users can click, highlight, and select text inside the input box without triggering a row drag.

---

## REQ-16: Drag-and-Drop Reordering Mechanics

**User Story:**
*As an Eagle user, I want to drag a row up or down and drop it between other rows so that I can prioritize my most important links at the top.*

- **16.1 (Event-driven):** When the user presses the mouse button on the drag handle and moves the cursor, the plugin shall initiate a drag operation for that specific row (`one item at a time`).
- **16.2 (State-driven):** While dragging over another link row, the plugin shall calculate whether the cursor position is in the upper half or lower half of the target row to determine whether the insertion point is above or below.
- **16.3 (Event-driven):** When the user releases the mouse button (drop) over a valid target position, the plugin shall update the order of both `currentLinks` and `rowModes`, re-rendering the rows at their new positions within 50ms.
- **16.4 (Unwanted Behavior):** If the user drops the dragged row onto its own original position or outside the link list container, the plugin shall cancel the operation without modifying the links array.

#### Acceptance Criteria
- **AC-16.1:** Dragging row 3 onto the upper half of row 1 moves row 3 to position 1.
- **AC-16.2:** Dragging row 1 onto the lower half of row 3 moves row 1 to position 3.
- **AC-16.3:** Releasing a drag outside the Inspector cancels cleanly with no errors or layout disruption.

---

## REQ-17: Visual Drop Feedback (Option A: Drop Indicator Line)

**User Story:**
*As an Eagle user, I want clear visual cues while dragging so that I know exactly where my link will land.*

- **17.1 (State-driven):** While a row is being actively dragged, its DOM element shall be given a `.dragging` class with reduced opacity (`opacity: 0.45`).
- **17.2 (State-driven):** While a dragged row is hovered over the upper half of a target row, a 2px horizontal accent-colored line shall appear directly above the target row (`.drop-above`).
- **17.3 (State-driven):** While a dragged row is hovered over the lower half of a target row, a 2px horizontal accent-colored line shall appear directly below the target row (`.drop-below`).
- **17.4 (Event-driven):** When the drag operation ends (via drop or drag cancellation), the plugin shall remove all `.dragging`, `.drop-above`, and `.drop-below` indicator classes immediately.

#### Acceptance Criteria
- **AC-17.1:** The dragged row visually fades to ~45% opacity.
- **AC-17.2:** A distinct 2px colored line matching the active Eagle theme's accent color (`--btn-primary-bg` / `--border-focus`) indicates the exact drop slot.
- **AC-17.3:** No leftover indicator lines remain after dropping or canceling.

---

## REQ-18: Order Persistence & State Synchronization

**User Story:**
*As an Eagle user, I want my reordered links to save automatically and preserve their title and URL display modes.*

- **18.1 (Event-driven):** When a drag-and-drop reorder is completed, the plugin shall immediately persist the updated array order to `extra-links.json` via `StorageManager.saveLinks`.
- **18.2 (Ubiquitous):** The reorder operation shall preserve the exact `title`, `url`, and active display mode (`rowModes`) of every row.
- **18.3 (Event-driven):** When navigating away from the item and returning to it in Eagle, the newly sorted order shall be restored exactly as saved.

#### Acceptance Criteria
- **AC-18.1:** Reordering items immediately triggers save and displays the `Saved` status indicator.
- **AC-18.2:** If item A was in Title Mode and item B was in URL Mode, their respective modes remain intact after swapping.
- **AC-18.3:** Re-selecting the item in Eagle verifies the persistent JSON file on disk matches the new order.
