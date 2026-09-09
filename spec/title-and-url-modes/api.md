# REST API Reference: Title and URL Display Modes

This reference documents the REST IPC endpoints supported by the **Eagle Extra Links** plugin with **Title and URL Display Modes** (Schema Version 2).

The embedded HTTP server runs inside Eagle and listens on `http://127.0.0.1:41598` by default (configurable via Settings).

---

## 1. Summary of Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check and active Eagle library path |
| `GET` | `/api/item/:id/links` | Retrieve all extra links with titles for an asset |
| `POST` | `/api/item/:id/links` | Append one or more links (with optional titles) |
| `PUT` | `/api/item/:id/links` | Replace all links for an asset |
| `DELETE` | `/api/item/:id/links` | Delete a specific link by URL or index |

---

## 2. Endpoints

### 2.1 Health Check

Verifies server responsiveness and returns current host, port, and library information.

- **Method**: `GET`
- **Path**: `/health`
- **Success Response** (200 OK):
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "host": "127.0.0.1",
    "port": 41598,
    "library": "I:\\My Drive\\Eagle\\Main.library"
  }
  ```

---

### 2.2 Retrieve Item Extra Links

Retrieves all stored links with their associated titles for an Eagle item.

- **Method**: `GET`
- **Path**: `/api/item/:id/links`
- **Path Parameters**:
  - `id` *(string, required)*: The unique Eagle Item ID (e.g. `MTSPUNN17LBUG`).

#### Success Response
- **Status Code**: `200 OK`
- **Content-Type**: `application/json; charset=utf-8`
- **Payload**:
  ```json
  {
    "status": "success",
    "itemId": "MTSPUNN17LBUG",
    "links": [
      {
        "title": "Character Turnaround Sheet",
        "url": "https://artstation.com/artwork/ref123"
      },
      {
        "title": "Obsidian Project Note",
        "url": "obsidian://adv-uri?vault=Main&uid=db4d22f3-52cb-4de0-965c"
      },
      {
        "title": "",
        "url": "https://google.com"
      }
    ]
  }
  ```

#### Error Responses
- `404 Not Found`: Item directory `<itemId>.info` does not exist in the active library.
  ```json
  {
    "status": "error",
    "message": "Item directory not found for ID: NONEXISTENT_ID"
  }
  ```
- `403 Forbidden`: Client IP not authorized.

#### Examples
**cURL**:
```bash
curl -s http://127.0.0.1:41598/api/item/MTSPUNN17LBUG/links
```

---

### 2.3 Append Extra Link(s)

Appends one or more links to an item. Supports automatic deduplication on `url` and updates the active Eagle Inspector in real time.

- **Method**: `POST`
- **Path**: `/api/item/:id/links`
- **Path Parameters**:
  - `id` *(string, required)*: The unique Eagle Item ID.
- **Headers**:
  - `Content-Type: application/json`

#### Request Body
Accepts a structured link object with optional `title`, or a legacy URL string:

**Single Link with Title (Recommended)**:
```json
{
  "title": "Concept Art Reference",
  "url": "https://artstation.com/artwork/example",
  "allowDuplicates": false
}
```

**Single Link without Title (Title defaults to `""`)**:
```json
{
  "url": "https://artstation.com/artwork/example"
}
```

**Batch Links**:
```json
{
  "links": [
    { "title": "Reference 1", "url": "https://artstation.com/ref1" },
    { "title": "Obsidian Backlink", "url": "obsidian://adv-uri?vault=Test&uid=123" }
  ],
  "allowDuplicates": false
}
```

#### Success Response (New Link Added)
- **Status Code**: `200 OK`
- **Payload**:
  ```json
  {
    "status": "success",
    "itemId": "MTSPUNN17LBUG",
    "links": [
      {
        "title": "Concept Art Reference",
        "url": "https://artstation.com/artwork/example"
      }
    ],
    "addedCount": 1,
    "alreadyExists": false
  }
  ```

#### Success Response (Duplicate URL Detected)
- **Status Code**: `200 OK`
- **Payload**:
  ```json
  {
    "status": "success",
    "itemId": "MTSPUNN17LBUG",
    "links": [
      {
        "title": "Concept Art Reference",
        "url": "https://artstation.com/artwork/example"
      }
    ],
    "addedCount": 0,
    "alreadyExists": true
  }
  ```
  *(Note: If the existing link had an empty title and the duplicate request provides a non-empty title, the title is automatically updated).*

#### Error Responses
- `400 Bad Request`: Missing `"url"`, `"urls"`, or `"links"` in request body.
- `404 Not Found`: Item directory not found.
- `403 Forbidden`: Client IP not authorized.

#### Examples
**cURL**:
```bash
curl -X POST http://127.0.0.1:41598/api/item/MTSPUNN17LBUG/links \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Cyberpunk Reference\",\"url\":\"https://artstation.com/ref\"}"
```

---

### 2.4 Replace All Extra Links

Overwrites the entire links list for an item.

- **Method**: `PUT`
- **Path**: `/api/item/:id/links`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "links": [
      { "title": "Primary Source", "url": "https://example.com/source" },
      { "title": "Backup", "url": "https://mirror.example.com" }
    ]
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "itemId": "MTSPUNN17LBUG",
    "links": [
      { "title": "Primary Source", "url": "https://example.com/source" },
      { "title": "Backup", "url": "https://mirror.example.com" }
    ]
  }
  ```

---

### 2.5 Delete Extra Link

Removes a specific link entry by index or matching URL.

- **Method**: `DELETE`
- **Path**: `/api/item/:id/links`
- **Request Body**:
  ```json
  {
    "url": "https://mirror.example.com"
  }
  ```
  *(Or by index: `{ "index": 1 }`)*
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "itemId": "MTSPUNN17LBUG",
    "links": [
      { "title": "Primary Source", "url": "https://example.com/source" }
    ]
  }
  ```
