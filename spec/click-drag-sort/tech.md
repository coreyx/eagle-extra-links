# Technical Architecture: Clickable Drag Handler & Link Sorting

## 1. Overview & Objectives

This specification outlines the technical design for the drag-and-drop link reordering system in the **Eagle Extra Links** plugin. The goal is to allow users to intuitively reorder links one item at a time using a dedicated grip handle (`⋮⋮`), while strictly safeguarding text selection in input boxes and immediately persisting the new order to `extra-links.json`.

---

## 2. Browser / Electron Drag and Drop Considerations

Eagle plugins run inside Electron's Chromium renderer process. Chromium provides native support for the HTML5 Drag and Drop API (`dragstart`, `dragover`, `dragleave`, `drop`, `dragend`).

### 2.1 The Text Selection vs. Draggable Conflict
If an entire row container (`.url-row`) is marked `draggable="true"` statically, Chromium intercepts mouse drags inside `<input>` elements, preventing users from dragging to highlight or select text within the input field.

### 2.2 The Controlled Draggable Pattern
To completely eliminate text selection issues, rows are **not** draggable by default:
1. When the user initiates a `mousedown` specifically on the `.drag-handle`, the parent `.url-row` is dynamically set to `draggable = true`.
2. If mouse down occurs anywhere else (such as inside `.url-input`, `.mode-btn`, `.link-btn`, or `.delete-btn`), `draggable` remains `false`.
3. When `dragend` or `mouseup` occurs, `draggable` is restored to `false`.

```
[User clicks .drag-handle] ──> row.draggable = true
[Drag initiates]           ──> HTML5 DnD pipeline active
[Drag terminates / drops]  ──> row.draggable = false
```

---

## 3. Component Architecture & DOM Structure

### 3.1 Row DOM Layout
Each row in `#url-list` is structured as:

```html
<div class="url-row" data-index="0" draggable="false">
  <button class="drag-handle" type="button" title="Drag to reorder" aria-label="Drag to reorder">
    <svg class="grip-icon" viewBox="0 0 16 16" width="12" height="12">
      <!-- 6 dots: 2 columns of 3 circles -->
      <circle cx="5" cy="3" r="1.5" fill="currentColor" />
      <circle cx="11" cy="3" r="1.5" fill="currentColor" />
      <circle cx="5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="5" cy="13" r="1.5" fill="currentColor" />
      <circle cx="11" cy="13" r="1.5" fill="currentColor" />
    </svg>
  </button>
  
  <div class="mode-toggle">
    <button class="mode-btn active" data-mode="title">T</button>
    <button class="mode-btn" data-mode="url">U</button>
  </div>

  <div class="input-wrapper">
    <input class="url-input" type="text" ... />
    <button class="link-btn" ...>🔗</button>
  </div>

  <button class="delete-btn" ...>×</button>
</div>
```

### 3.2 Single-Row State
When `currentLinks.length === 1`:
- The `.drag-handle` receives the `disabled` HTML attribute.
- In CSS: `opacity: 0.35; cursor: default; pointer-events: none;`.
- Dragging cannot be initiated.

---

## 4. Drag & Drop Event Pipeline

### 4.1 State Variables
In `js/app.js`:
- `draggedIndex: number | null` — Index of the row currently being dragged.
- `dragTargetIndex: number | null` — Index of the target row currently being hovered over.
- `dropPosition: 'above' | 'below' | null` — Target insertion position relative to `dragTargetIndex`.

### 4.2 Detailed Event Handlers

#### `dragstart (e)`
- Guard: only fire if `draggedIndex !== null` (set on `mousedown` of handle).
- `e.dataTransfer.effectAllowed = 'move'`.
- `e.dataTransfer.setData('text/plain', String(draggedIndex))`.
- Add CSS class `dragging` to `e.currentTarget` (`opacity: 0.45`).

#### `dragover (e)`
- Must invoke `e.preventDefault()` to allow dropping.
- Calculate vertical midpoint of hovered row:
  ```javascript
  const rect = targetRow.getBoundingClientRect();
  const relY = e.clientY - rect.top;
  const isAbove = relY < (rect.height / 2);
  ```
- Clear existing `.drop-above` and `.drop-below` classes on other rows.
- Set `.drop-above` if `isAbove`, else `.drop-below` on `targetRow`.
- Store `dropPosition = isAbove ? 'above' : 'below'`.
- Store `dragTargetIndex = parseInt(targetRow.dataset.index, 10)`.

#### `dragleave (e)`
- If the cursor moves outside `targetRow` (and not into its children), remove `.drop-above` and `.drop-below`.

#### `drop (e)`
- Invoke `e.preventDefault()`.
- Calculate target insertion index:
  ```javascript
  let newIndex = dragTargetIndex;
  if (dropPosition === 'below') {
    newIndex += 1;
  }
  // If moving downward, removing the item first shifts subsequent indices by -1
  if (draggedIndex < newIndex) {
    newIndex -= 1;
  }
  ```
- If `newIndex !== draggedIndex` and within valid bounds `[0, currentLinks.length - 1]`:
  1. Splice `currentLinks`:
     ```javascript
     const [movedLink] = currentLinks.splice(draggedIndex, 1);
     currentLinks.splice(newIndex, 0, movedLink);
     ```
  2. Splice `rowModes`:
     ```javascript
     const [movedMode] = rowModes.splice(draggedIndex, 1);
     rowModes.splice(newIndex, 0, movedMode);
     ```
  3. Re-render rows: `renderLinks()`.
  4. Immediate persistence: `StorageManager.saveLinks(currentItem.id, currentLinks, currentItem)`.
  5. Update status indicator: `showStatus('Saved', 'saved')`.

#### `dragend (e)`
- Clean up all state:
  - Remove `.dragging`, `.drop-above`, `.drop-below` from all rows.
  - Reset `row.draggable = false`.
  - Reset `draggedIndex = null`, `dragTargetIndex = null`, `dropPosition = null`.

---

## 5. CSS Architecture (Option A: Drop Indicator Lines)

### 5.1 Positioning & Pseudo-elements
Each `.url-row` has `position: relative;`. Indicator lines are rendered via absolute pseudo-elements so they do not cause layout reflow or jitter during drag operations.

```css
.url-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  /* ... existing styling ... */
}

.url-row.dragging {
  opacity: 0.45;
}

.url-row.drop-above::before,
.url-row.drop-below::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--btn-primary-bg, #1e88e5);
  border-radius: 1px;
  z-index: 10;
  pointer-events: none;
}

.url-row.drop-above::before {
  top: -2px;
}

.url-row.drop-below::after {
  bottom: -2px;
}
```

### 5.2 Grip Handle Styling
```css
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: grab;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s ease, opacity 0.15s ease;
  user-select: none;
}

.drag-handle:hover {
  color: var(--text-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle[disabled] {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}
```

---

## 6. Performance & Latency Considerations
- **No Layout Reflow**: Using `::before` and `::after` with `position: absolute` ensures indicator rendering costs 0 layout recalculations.
- **Immediate Disk Save**: Because reordering is an explicit and discrete user action (unlike typing in an input field), debounce is omitted on drop to ensure instant persistence.
- **Render Latency**: Re-rendering link lists of typical length (1 to 20 links) takes < 2ms in Chromium.
