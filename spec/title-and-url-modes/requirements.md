# Requirement Specifications: Title and URL Display Modes

This document specifies the requirements for the **Title and URL Display Modes** feature for the **Eagle Extra Links** plugin. This feature extends the foundational requirements defined in [`spec/eagle-extra-links/requirements.md`](../eagle-extra-links/requirements.md) (`REQ-1` through `REQ-9`).

Requirements are formulated using the **Easy Approach to Requirements Syntax (EARS)**:
- **Ubiquitous**: *The [system/plugin] shall [behavior].*
- **Event-driven**: *When [trigger], the [system/plugin] shall [behavior].*
- **State-driven**: *While [condition], the [system/plugin] shall [behavior].*
- **Unwanted Behavior**: *If [error/edge condition], then the [system/plugin] shall [behavior].*
- **Optional**: *Where [feature flag is enabled], the [system/plugin] shall [behavior].*

---

## REQ-10: Link Title Property & Data Model

**User Story:**
*As an Eagle user, I want each extra link entry to have an optional title property so that I can give my links human-readable labels instead of relying solely on raw, cryptic URLs.*

- **10.1 (Ubiquitous):** The plugin data model shall associate an optional `title` string with each link entry alongside its `url` string.
- **10.2 (Ubiquitous):** The `title` property may be an empty string `""` in both metadata storage and the REST API.
- **10.3 (Ubiquitous):** The sidecar file `extra-links.json` shall adopt schema version `2`, storing links as an array of objects: `[ { "title": string, "url": string } ]`.
- **10.4 (Ubiquitous):** The storage engine shall provide automatic backward compatibility by transparently normalizing legacy version `1` string arrays (`["https://..."]`) into `{ "title": "", "url": "https://..." }` upon loading.
- **10.5 (Ubiquitous):** Blank slots created by the user via `+ Add URL` shall be represented as `{ "title": "", "url": "" }` to preserve empty rows across sessions.

#### Acceptance Criteria
- **AC-10.1:** An item with existing v1 links (`["https://google.com"]`) loads without error and displays in the Inspector with title `""` and url `"https://google.com"`.
- **AC-10.2:** Saving changes to an item persists `version: 2` with array elements formatted as `{ "title": string, "url": string }`.
- **AC-10.3:** Empty string titles (`""`) and empty string URLs (`""`) are preserved in JSON formatting without being stripped.

---

## REQ-11: Row Display Modes (Title vs URL)

**User Story:**
*As an Eagle user, I want to easily toggle between viewing/editing a link's Title and its URL using dedicated T and U buttons, with the active mode clearly highlighted.*

- **11.1 (State-driven):** While rendering a link row, if the link has a non-empty `title` (`title.trim().length > 0`), the row shall display in **Title Mode** by default.
- **11.2 (State-driven):** While rendering a link row, if the link does not have a non-empty `title`, the row shall display in **URL Mode** by default.
- **11.3 (Ubiquitous):** Each link row shall include a segmented mode control containing two small buttons: `T` (Title Mode) and `U` (URL Mode).
- **11.4 (State-driven):** The button corresponding to the currently displayed mode (`T` or `U`) shall be visually highlighted with an active accent styling matching the current Eagle theme.
- **11.5 (Event-driven):** When the user clicks the `T` button, the row shall switch to Title Mode:
  - The input field value shall display the link's `title`.
  - The input field placeholder shall be `"Title (optional)"`.
  - The `T` button shall be highlighted as active, and `U` shall become inactive.
- **11.6 (Event-driven):** When the user clicks the `U` button, the row shall switch to URL Mode:
  - The input field value shall display the link's `url`.
  - The input field placeholder shall be `"https://... or obsidian://..."`.
  - The `U` button shall be highlighted as active, and `T` shall become inactive.
- **11.7 (Event-driven):** When switching between modes, any pending text entered into the active input shall be committed to the outgoing field before the mode switch occurs.
- **11.8 (Event-driven):** When the user types into the input field:
  - If in Title Mode, input modifications shall update `link.title`.
  - If in URL Mode, input modifications shall update `link.url`.
  - The debounced auto-save (300ms) shall persist both properties.

#### Acceptance Criteria
- **AC-11.1:** A link with title `"Concept Sheet"` and URL `"https://artstation.com"` renders with `T` highlighted and `"Concept Sheet"` in the input.
- **AC-11.2:** A link with title `""` and URL `"https://artstation.com"` renders with `U` highlighted and `"https://artstation.com"` in the input.
- **AC-11.3:** Clicking `U` on a row in Title Mode switches the input text to the URL and moves the highlight to `U` within 50ms without full DOM destruction.
- **AC-11.4:** Clicking `T` on a row in URL Mode switches the input text to the Title and moves the highlight to `T`.
- **AC-11.5:** Clicking `+ Add URL` appends a blank row `{ title: "", url: "" }` in URL Mode (`U` highlighted) and focuses the input.

---

## REQ-12: URL Hover Tooltips in Title Mode

**User Story:**
*As an Eagle user, I want to see the underlying URL when hovering over a link displayed in Title Mode, so that I can inspect where the link points without switching modes.*

- **12.1 (State-driven):** While a link row is in Title Mode, hovering the mouse cursor over the text input shall display the underlying URL as a tooltip.
- **12.2 (State-driven):** While a link row is in Title Mode and the URL is empty, hovering over the input shall display `"No URL set"` (or equivalent empty cue) as the tooltip.
- **12.3 (State-driven):** While a link row is in URL Mode, hovering over the text input shall display the link's `title` (if populated) as a tooltip.

#### Acceptance Criteria
- **AC-12.1:** Hovering over a row in Title Mode shows a native browser tooltip containing the full URL string.
- **AC-12.2:** When the URL is modified in URL Mode and toggled back to Title Mode, the tooltip dynamically reflects the updated URL.

---

## REQ-13: Link Launching from Title Mode

**User Story:**
*As an Eagle user, I want to click the open link button or press Enter even when viewing the link's Title, so that human-readable names don't hinder quick navigation.*

- **13.1 (Event-driven):** When the user clicks the open link icon (`.link-btn`) while in Title Mode, the plugin shall launch the underlying `link.url` in the default application via `eagle.shell.openExternal`.
- **13.2 (Event-driven):** When the user presses `Enter` while focused on the input field in Title Mode, the plugin shall launch the underlying `link.url`.
- **13.3 (Unwanted Behavior):** If the user attempts to launch a link whose `url` is empty or whitespace-only (whether in Title Mode or URL Mode), the plugin shall provide a subtle visual shake feedback and shall not execute an external command.

#### Acceptance Criteria
- **AC-13.1:** Pressing `Enter` or clicking the open icon on a row in Title Mode opens the underlying URL in the browser or target application.
- **AC-13.2:** If `url` is empty, pressing `Enter` triggers a border shake without crashing or opening an invalid URI.

---

## REQ-14: REST API Title Support

**User Story:**
*As an external developer or Obsidian user, I want the REST IPC API to accept and return link titles so that external tools can automatically assign meaningful names to links.*

- **14.1 (Event-driven):** When an external client sends `GET /api/item/:id/links`, the server shall return a JSON payload with `links` formatted as an array of `{ "title": string, "url": string }` objects.
- **14.2 (Event-driven):** When an external client sends `POST /api/item/:id/links`, the request body shall accept `{ "url": string, "title"?: string, "allowDuplicates"?: boolean }`.
- **14.3 (Ubiquitous):** If `title` is omitted in a `POST` request, it shall default to `""`.
- **14.4 (Event-driven):** When a `POST` request provides a URL that already exists on that item:
  - If the existing link has an empty title and the new request provides a non-empty `title`, the server shall update the title on the existing link.
  - The server shall return HTTP 200 with `{ "status": "success", "addedCount": 0, "alreadyExists": true, "links": [...] }`.
- **14.5 (Event-driven):** When an external client sends `PUT /api/item/:id/links`, the request body shall accept an array of `{ "title": string, "url": string }` objects (or legacy string URLs) to overwrite the item's links.

#### Acceptance Criteria
- **AC-14.1:** `GET /api/item/:id/links` returns HTTP 200 with objects containing both `title` and `url`.
- **AC-14.2:** `POST /api/item/:id/links` with `{"title": "Note Title", "url": "obsidian://..."}` persists both fields and updates the active Eagle Inspector in real time.
- **AC-14.3:** Posting a duplicate URL with an enriched title updates the title in-place without duplicating the row.
