# Technical Specifications: Title and URL Display Modes

This specification details the technical architecture, data model evolution, DOM structure, and IPC protocol changes required to support **Title and URL Display Modes** in the **Eagle Extra Links** plugin.

---

## 1. Data Model Evolution (Schema Version 2)

### 1.1 JSON Schema Specification
The sidecar file `<LibraryPath>/images/<itemId>.info/extra-links.json` advances from version `1` to version `2`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EagleExtraLinksV2",
  "type": "object",
  "required": ["version", "itemId", "links", "updatedAt"],
  "properties": {
    "version": {
      "type": "integer",
      "enum": [2]
    },
    "itemId": {
      "type": "string",
      "description": "The unique Eagle alphanumeric item ID"
    },
    "links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "url"],
        "properties": {
          "title": {
            "type": "string",
            "description": "User-facing human-readable title (can be empty string)"
          },
          "url": {
            "type": "string",
            "description": "Clickable target URL or deep URI (can be empty string for blank slots)"
          }
        }
      }
    },
    "updatedAt": {
      "type": "integer",
      "description": "Epoch timestamp in milliseconds"
    }
  }
}
```

### 1.2 Normalization Algorithm & Backwards Compatibility
To ensure that existing libraries created with version `1` load seamlessly without data loss or user intervention, `StorageManager` implements the following idempotent normalization algorithm:

```javascript
/**
 * Normalizes any link representation (string, partial object, or complete object)
 * into a standardized { title: string, url: string } format.
 * @param {string|object} entry 
 * @returns {{ title: string, url: string }}
 */
function normalizeLink(entry) {
    if (typeof entry === 'string') {
        return { title: '', url: entry };
    }
    if (entry && typeof entry === 'object') {
        return {
            title: typeof entry.title === 'string' ? entry.title : '',
            url: typeof entry.url === 'string' ? entry.url : ''
        };
    }
    return { title: '', url: '' };
}
```

- When `StorageManager.loadLinks(itemId)` reads `extra-links.json`:
  - If `links` contains raw strings (v1), each entry is mapped through `normalizeLink()`.
  - The return value is guaranteed to be an array of `{ title: string, url: string }`.
- When `StorageManager.saveLinks(itemId, links)` writes to disk:
  - All entries are mapped through `normalizeLink()`.
  - The payload explicitly sets `"version": 2`.
  - The write uses atomic file staging (`extra-links.json.tmp.<time>` -> rename).

---

## 2. Inspector UI & DOM Architecture

### 2.1 DOM Hierarchy per URL Row
Each `.url-row` element contains a segmented mode switch (`.mode-toggle`), the input field with inline action button (`.input-wrapper`), and the delete button (`.delete-btn`):

```html
<div class="url-row" data-index="0" data-mode="title">
    <!-- Segmented Mode Switch -->
    <div class="mode-toggle" role="group" aria-label="Display Mode">
        <button type="button" class="mode-btn mode-t active" title="Switch to Title Mode" aria-label="Title Mode">T</button>
        <button type="button" class="mode-btn mode-u" title="Switch to URL Mode" aria-label="URL Mode">U</button>
    </div>

    <!-- Input Field Wrapper -->
    <div class="input-wrapper">
        <input 
            type="text" 
            class="url-input" 
            placeholder="Title (optional)" 
            value="Concept Art Reference"
            title="https://artstation.com/artwork/example"
        >
        <button type="button" class="icon-btn link-btn" title="Open URL in default app">
            <svg class="icon-open" viewBox="0 0 24 24">...</svg>
        </button>
    </div>

    <!-- Delete Button -->
    <button type="button" class="icon-btn delete-btn" title="Delete URL">
        <svg class="icon-delete" viewBox="0 0 24 24">...</svg>
    </button>
</div>
```

### 2.2 CSS Metrics & Theming
- **Container**: `.mode-toggle`
  - Display: `inline-flex`
  - Height: `28px` (matches `.url-input` height)
  - Border: `1px solid var(--border-color)`
  - Border-radius: `var(--border-radius)` (`4px`)
  - Overflow: `hidden`
  - Margin-right: `2px`
- **Buttons**: `.mode-btn`
  - Width: `22px`
  - Height: `100%`
  - Border: `none`
  - Font-size: `10px`
  - Font-weight: `600`
  - Text-transform: `uppercase`
  - Background: `var(--bg-input)`
  - Color: `var(--text-secondary)`
  - Cursor: `pointer`
  - Transition: `var(--transition)`
- **Active State**: `.mode-btn.active`
  - Background: `var(--btn-primary-bg)` (Eagle theme accent color)
  - Color: `#ffffff`
  - Font-weight: `700`
- **Hover State**: `.mode-btn:not(.active):hover`
  - Background: `var(--btn-hover)`
  - Color: `var(--text-primary)`

---

## 3. UI State Management (`js/app.js`)

### 3.1 State Representation
The Inspector tracks the link data and active display mode per row:
```javascript
let currentLinks = [
    { title: "Design System", url: "https://figma.com/file/..." },
    { title: "", url: "obsidian://adv-uri?vault=Main&uid=123" }
];

let rowModes = ["title", "url"]; // 'title' | 'url' per index
```

### 3.2 Mode Resolution Logic
On load or asset selection:
```javascript
function resolveInitialMode(link) {
    return (link.title && link.title.trim().length > 0) ? 'title' : 'url';
}
```

### 3.3 Dynamic Mode Switching
When the user clicks `T` or `U`:
1. **Commit Pending Value**: Read current `input.value`. If row was in `'title'` mode, save to `link.title`. If in `'url'` mode, save to `link.url`.
2. **Toggle Mode**: Update `rowModes[index] = targetMode`.
3. **Update DOM Attributes**:
   - Update input value: `input.value = targetMode === 'title' ? link.title : link.url`.
   - Update placeholder: `targetMode === 'title' ? 'Title (optional)' : 'https://... or obsidian://...'`.
   - Update hover tooltip (`title` attribute):
     - In Title mode: `input.title = link.url || 'No URL set'`.
     - In URL mode: `input.title = link.title || link.url`.
   - Update button highlights: toggle `.active` class between `.mode-t` and `.mode-u`.
4. **Preserve Focus**: Keep cursor focus within the input field.

### 3.4 Open Action Execution
Clicking `.link-btn` or pressing `Enter`:
- Target URL is always `link.url` (trimmed).
- If `link.url` is non-empty, executes `eagle.shell.openExternal(targetUrl)`.
- If `link.url` is empty, triggers a 300ms CSS shake animation on `.input-wrapper`.

---

## 4. IPC REST Server Protocol (`js/ipc-server.js`)

### 4.1 Request Parsing
- **`POST /api/item/:id/links`**:
  - Accepts single object: `{ "url": "...", "title": "..." }`
  - Accepts single URL string: `{ "url": "..." }` (title defaults to `""`)
  - Accepts batch objects: `{ "links": [ { "url": "...", "title": "..." } ] }`
  - Accepts batch URLs: `{ "urls": [ "url1", "url2" ] }`
  - Supports optional `"allowDuplicates": true`

### 4.2 Deduplication with Title Enrichment
When `allowDuplicates` is `false`:
1. The server trims the incoming `url`.
2. The server searches existing links for a matching `link.url.trim()`.
3. **If duplicate found**:
   - If the existing link's `title` is empty and incoming request contains a non-empty `title`:
     - The existing link's `title` is updated in-place.
     - The changes are saved to `extra-links.json`.
     - Returns `{ status: "success", itemId, links, addedCount: 0, alreadyExists: true }`.
   - If existing link already has a title or incoming title is empty:
     - No disk write occurs.
     - Returns `{ status: "success", itemId, links, addedCount: 0, alreadyExists: true }`.
4. **If new URL**:
   - Appends `{ title: newTitle, url: newUrl }`.
   - Returns `{ status: "success", itemId, links, addedCount: 1, alreadyExists: false }`.

---

## 5. Security & Error Handling

1. **Protocol Validation**: External launching continues to enforce safe protocol schemes (`http:`, `https:`, `obsidian:`, `notion:`, `file:`).
2. **HTML Escaping**: Titles and URLs are escaped via `escapeHtml()` when rendered to prevent DOM injection.
3. **Atomic Writes**: Version 2 data writes use temporary swap files to prevent zero-byte corruption during power loss.
