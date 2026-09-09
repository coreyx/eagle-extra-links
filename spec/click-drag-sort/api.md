# REST API Specification: Link Ordering & Reordering

## 1. Overview

The embedded REST API (running on port `41598`) exposes endpoints for reading and mutating extra links. This document specifies how link ordering is handled across all HTTP methods.

---

## 2. Ordering Guarantees

1. **Deterministic Index Ordering**:
   - The array order stored in `extra-links.json` under `items[itemId].links` is deterministic.
   - Any API response containing `links` preserves the exact storage order (index `0` corresponds to the top row in the UI).
2. **Reordering via Bulk Replacement (`PUT`)**:
   - Calling `PUT /api/links` replaces the entire links array for an item, setting the new order directly.
3. **Appending via Incremental Addition (`POST`)**:
   - Calling `POST /api/links` appends new links to the end of the array without shifting or reordering existing links.
   - If an appended link already exists (deduplication check), its position is preserved at its existing index.

---

## 3. Endpoint Specifications

### 3.1 `GET /api/links`
Retrieves links for an item in current list order.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Eagle item ID |

#### Response (`200 OK`)
```json
{
  "itemId": "L5XABC123",
  "links": [
    { "title": "Top Priority Document", "url": "https://example.com/doc1" },
    { "title": "Secondary Reference", "url": "https://example.com/doc2" },
    { "title": "", "url": "https://example.com/doc3" }
  ],
  "count": 3
}
```

---

### 3.2 `PUT /api/links`
Replaces the entire links array for an item, defining a new explicit order.

#### Request Body
```json
{
  "itemId": "L5XABC123",
  "links": [
    { "title": "Secondary Reference", "url": "https://example.com/doc2" },
    { "title": "Top Priority Document", "url": "https://example.com/doc1" }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "itemId": "L5XABC123",
  "links": [
    { "title": "Secondary Reference", "url": "https://example.com/doc2" },
    { "title": "Top Priority Document", "url": "https://example.com/doc1" }
  ],
  "count": 2,
  "message": "Links replaced successfully"
}
```

---

### 3.3 `POST /api/links`
Appends links to an item. Preserves the position of already existing links.

#### Request Body
```json
{
  "itemId": "L5XABC123",
  "links": [
    { "title": "Appended Backlink", "url": "obsidian://open?vault=Vault&file=Note" }
  ]
}
```

#### Deduplication & Ordering Behavior
If `"obsidian://open?vault=Vault&file=Note"` is already at index `1`, `POST` will:
1. Detect duplicate URL.
2. Maintain its position at index `1` (does not re-append or move to bottom).
3. Return `added: 0`.

---

## 4. Error Responses

| Status Code | Reason |
| :--- | :--- |
| `400 Bad Request` | Missing `itemId` or invalid payload format. |
| `403 Forbidden` | Request from non-whitelisted IP (allowed: `127.0.0.1`, `::1`). |
| `500 Internal Server Error` | File system read/write failure. |
