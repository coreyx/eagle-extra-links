# System Design & UI/UX Specifications: Title and URL Display Modes

This document details the visual layouts, UI interaction patterns, sequence diagrams, and state machines for the **Title and URL Display Modes** feature in the **Eagle Extra Links** plugin.

---

## 1. UI Layout & Wireframe Specifications

### 1.1 Inspector Panel Overview
The Inspector panel renders each link as an interactive row equipped with a segmented mode control `[T|U]`, the text input field, an inline open button, and an outer delete button:

```
+-------------------------------------------------------------+
| EXTRA LINKS                                       Saved [⚙] |
|                                                             |
| +----+ +-------------------------------------+--+   +-------+ |
| |*T*|U| | Concept Art Reference               |[]|   |   X   | |
| +----+ +-------------------------------------+--+   +-------+ |
|   ^      ^ Input in Title Mode                 ^         ^    |
| Mode     (URL preview on hover)             Launch    Delete  |
| Toggle                                                        |
|                                                               |
| +----+ +-------------------------------------+--+   +-------+ |
| | T|*U*| | obsidian://adv-uri?vault=Main...    |[]|   |   X   | |
| +----+ +-------------------------------------+--+   +-------+ |
|   ^      ^ Input in URL Mode                                  |
|   U active (Title empty or user viewing URL)                  |
|                                                               |
| [+ Add URL]                                                 |
+-------------------------------------------------------------+
```

### 1.2 Title Mode vs URL Mode Comparison

#### Mode A: Title Mode (`T` Active)
- **Active Toggle**: `[T]` highlighted with theme primary accent (`--btn-primary-bg`), `[U]` subdued.
- **Input Content**: Displays human-readable label, e.g. `"Character Turnaround"`.
- **Placeholder**: `"Title (optional)"`
- **Hover State**: Hovering the cursor over the input reveals the native tooltip displaying the underlying URL:
  ```
  +----+ +-------------------------------------+--+
  |*T*|U| | Character Turnaround                |[]|
  +----+ +-------------------------------------+--+
         | https://artstation.com/artwork/ref  |  <-- Hover Tooltip
         +-------------------------------------+
  ```
- **Action**: Clicking `[]` or pressing `Enter` opens `https://artstation.com/artwork/ref`.

#### Mode B: URL Mode (`U` Active)
- **Active Toggle**: `[U]` highlighted with theme primary accent, `[T]` subdued.
- **Input Content**: Displays the actual target URL/URI, e.g. `"https://artstation.com/artwork/ref"`.
- **Placeholder**: `"https://... or obsidian://..."`
- **Hover State**: Hovering reveals the title (if one exists).
- **Action**: Clicking `[]` or pressing `Enter` opens the URL.

---

## 2. Row Mode State Machine

Each row operates on a local state machine that controls the active representation:

```mermaid
stateDiagram-v2
    [*] --> InitialState: Load links for Item

    state InitialState <<choice>>
    InitialState --> TitleMode: hasTitle == true
    InitialState --> UrlMode: hasTitle == false

    state TitleMode {
        [*] --> DisplayTitle
        DisplayTitle: input.value = link.title
        DisplayTitle: input.placeholder = "Title (optional)"
        DisplayTitle: input.title = link.url || "No URL set"
        DisplayTitle: T button active, U button inactive
    }

    state UrlMode {
        [*] --> DisplayUrl
        DisplayUrl: input.value = link.url
        DisplayUrl: input.placeholder = "https://... or obsidian://..."
        DisplayUrl: input.title = link.title || link.url
        DisplayUrl: U button active, T button inactive
    }

    TitleMode --> UrlMode: Click 'U' button
    UrlMode --> TitleMode: Click 'T' button

    TitleMode --> TitleMode: User types (updates link.title)
    UrlMode --> UrlMode: User types (updates link.url)
```

---

## 3. Sequence Diagrams

### 3.1 Toggling Display Mode Between Title and URL
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant RowUI as Row DOM
    participant App as app.js
    participant Storage as StorageManager
    participant FS as extra-links.json

    Note over User,RowUI: Row currently in Title Mode showing "Character Art"
    User->>RowUI: Clicks 'U' button
    RowUI->>App: handleModeToggle(index, 'url')
    App->>App: Commit any pending input text to link.title
    App->>RowUI: Set input.value = link.url ("https://...")
    App->>RowUI: Set input.placeholder = "https://..."
    App->>RowUI: Set input.title = link.title
    App->>RowUI: Set 'U' button active, 'T' button inactive
    App->>RowUI: Keep cursor focused on input
    Note over User,RowUI: User sees full URL and can edit it directly
    User->>RowUI: Modifies URL text
    RowUI->>App: input event -> updates link.url
    App->>Storage: Debounced save (300ms)
    Storage->>FS: Atomic write version 2 schema
```

### 3.2 Launching URL from Title Mode
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Input as URL Input (in Title Mode)
    participant OpenBtn as .link-btn
    participant App as app.js
    participant Shell as eagle.shell

    alt User presses Enter in Input
        User->>Input: Presses 'Enter' key
        Input->>App: keydown event (key == 'Enter')
    else User clicks Open icon
        User->>OpenBtn: Clicks .link-btn
        OpenBtn->>App: click event
    end

    App->>App: Retrieve link.url for this row
    alt link.url is populated
        App->>Shell: openExternal(link.url)
        Shell->>User: Opens URL in default browser or Obsidian
    else link.url is empty
        App->>Input: Add .shake CSS animation class
        Note over Input: Visual feedback indicates no URL to launch
    end
```

### 3.3 Obsidian Plugin Adding Backlink with Note Title
```mermaid
sequenceDiagram
    autonumber
    actor ObsidianUser as Obsidian User
    participant Obsidian as Obsidian Plugin
    participant IPC as Eagle IPC Server (:41596)
    participant Storage as StorageManager
    participant FS as extra-links.json
    participant Inspector as Eagle Inspector UI

    ObsidianUser->>Obsidian: Paste Eagle item into Note ("Cyberpunk City")
    Obsidian->>IPC: POST /api/item/{id}/links\n{ "title": "Cyberpunk City", "url": "obsidian://adv-uri?..." }
    IPC->>Storage: appendLink(itemId, { title: "Cyberpunk City", url: "obsidian://..." })
    Storage->>Storage: Check if URL already exists
    alt URL is new
        Storage->>FS: Write version 2 sidecar
        Storage-->>IPC: Return { addedCount: 1, alreadyExists: false }
        IPC-->>Obsidian: 200 OK
    else URL exists and existing title is empty
        Storage->>FS: Update title on existing link
        Storage-->>IPC: Return { addedCount: 0, alreadyExists: true }
        IPC-->>Obsidian: 200 OK
    end

    opt If item is open in Eagle Inspector
        IPC->>Inspector: Trigger live UI refresh
        Inspector->>Inspector: Re-renders row with 'T' active showing "Cyberpunk City"
    end
```

---

## 4. Visual Styles & Theme Tokens

### 4.1 Button Group Metric Tokens
| Property | Value | Notes |
| :--- | :--- | :--- |
| Height | `28px` | Matches input height exactly |
| Button Width | `22px` each | Total width `44px` |
| Font Size | `10px` | Bold uppercase `T` and `U` |
| Gap / Divider | `1px` border | Separator between `T` and `U` |
| Border Radius | `4px` | Aligns with Eagle standard widget radius |

### 4.2 Theme Color Mapping
| Theme | Inactive Button Bg | Inactive Button Text | Active Button Bg | Active Button Text |
| :--- | :--- | :--- | :--- | :--- |
| `DARK` | `#2a2a2a` | `#888888` | `#3370ff` (Eagle Blue) | `#ffffff` |
| `GRAY` | `#333333` | `#999999` | `#3370ff` | `#ffffff` |
| `LIGHT` | `#f0f0f0` | `#777777` | `#2d8cf0` | `#ffffff` |
| `LIGHTGRAY` | `#e4e4e4` | `#666666` | `#2d8cf0` | `#ffffff` |
| `BLUE` | `#15202e` | `#7b97b8` | `#3f83d0` | `#ffffff` |
| `PURPLE` | `#1a1522` | `#9a84b3` | `#8952cc` | `#ffffff` |
