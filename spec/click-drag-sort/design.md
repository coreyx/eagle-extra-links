# Design Specification: Clickable Drag Handler & Link Sorting

## 1. UI Layout & Visual Hierarchy

The Eagle Extra Links Inspector displays links in a single-column vertical list. The drag handle is positioned at the leftmost edge of each row to form a consistent control gutter.

### 1.1 Inspector Row Structure

```
+-------------------------------------------------------------------------+
| [⋮⋮]  [T|U]  [ Documentation                     🔗]  [×]               |
+-------------------------------------------------------------------------+
   ^      ^                  ^                      ^    ^
   |      |                  |                      |    +-- Delete button
   |      |                  |                      +------- Open link button
   |      |                  +------------------------------ Text input (Title / URL)
   |      +------------------------------------------------- Mode toggle segmented button
   +-------------------------------------------------------- Drag grip handle (6-dot)
```

### 1.2 Visual States of the Drag Handle

| State | Cursor | Opacity / Color | Description |
| :--- | :--- | :--- | :--- |
| **Normal (Multiple rows)** | `grab` | `var(--text-secondary)` (~60%) | Ready to drag; clean 6-dot grip icon |
| **Hover (Multiple rows)** | `grab` | `var(--text-primary)` (100%) | Highlighted on mouse hover |
| **Active / Dragging** | `grabbing` | `var(--text-primary)` (100%) | Mouse button held down |
| **Disabled (Single row)** | `default` | `opacity: 0.35` | Visible grip icon indicating capability, but dimmed |

---

## 2. Drop Feedback: Option A (Accent Drop Line)

When dragging row 3 over row 1:

### 2.1 Dragging Over Upper Half (`.drop-above`)
```
      +=========================================================+ <--- 2px Accent Line (top: -2px)
      | [⋮⋮]  [T|U]  [ Row 1 (Hovered Target)             🔗]  [×] |
      +---------------------------------------------------------+
      | [⋮⋮]  [T|U]  [ Row 2                              🔗]  [×] |
      +---------------------------------------------------------+
      | [⋮⋮]  [T|U]  [ Row 3 (Active Dragging - 45% Opacity) 🔗]  [×] |
      +---------------------------------------------------------+
```

### 2.2 Dragging Over Lower Half (`.drop-below`)
```
      +---------------------------------------------------------+
      | [⋮⋮]  [T|U]  [ Row 1 (Hovered Target)             🔗]  [×] |
      +=========================================================+ <--- 2px Accent Line (bottom: -2px)
      | [⋮⋮]  [T|U]  [ Row 2                              🔗]  [×] |
      +---------------------------------------------------------+
      | [⋮⋮]  [T|U]  [ Row 3 (Active Dragging - 45% Opacity) 🔗]  [×] |
      +---------------------------------------------------------+
```

---

## 3. Interaction Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Handle as .drag-handle
    participant Row as .url-row
    participant App as app.js
    participant Storage as StorageManager
    participant Disk as extra-links.json

    User->>Handle: mousedown
    Handle->>Row: set draggable = true
    User->>Row: dragstart
    Row->>App: dragstart event (store draggedIndex)
    App->>Row: add .dragging (opacity: 0.45)
    
    loop Dragging over other rows
        User->>Row: dragover (targetRow)
        Row->>App: dragover event (compute relY vs height/2)
        App->>Row: toggle .drop-above or .drop-below
    end

    alt Dropped outside or self
        User->>App: drop / dragend
        App->>Row: remove all indicator classes
        App->>Row: set draggable = false
    else Valid drop position
        User->>Row: drop (targetRow)
        Row->>App: drop event (compute newIndex)
        App->>App: splice currentLinks & rowModes
        App->>Row: renderLinks()
        App->>Storage: saveLinks(currentItem.id, currentLinks)
        Storage->>Disk: writeFileSync extra-links.json
        Storage-->>App: save completed
        App->>User: showStatus("Saved", "saved")
    end
```

---

## 4. Accessibility & Touch Safeguards

1. **Screen Readers**:
   - The drag handle has `aria-label="Drag to reorder"` and `title="Drag to reorder"`.
   - When disabled: `aria-disabled="true"` and `title="Single link cannot be reordered"`.
2. **Tab Navigation**:
   - The drag handle has `tabindex="0"`.
3. **Selection Safety**:
   - The drag handle uses `user-select: none`.
   - Double-clicking or selecting text inside `.url-input` never triggers a drag event.
