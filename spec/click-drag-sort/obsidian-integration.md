# Obsidian Integration Guide: Ordered Links & Sorting

## 1. Overview

This guide details how Obsidian plugins and external automation interact with manually ordered links in the **Eagle Extra Links** plugin.

When users manually sort links using the clickable drag handler, Obsidian integrations can safely read the sorted list, append new backlinks without disrupting existing order, or programmatically re-sort links.

---

## 2. Interaction Patterns

### 2.1 Reading Sorted Links in Obsidian
When Obsidian renders an Eagle item card or embeds backlinks, it can fetch the links via `GET /api/links?id={eagleItemId}`.

```typescript
async function getSortedLinks(eagleItemId: string): Promise<Array<{ title: string; url: string }>> {
  const response = await requestUrl({
    url: `http://127.0.0.1:41596/api/links?id=${eagleItemId}`,
    method: 'GET',
  });
  return response.json.links; // Preserves exact drag-and-drop order
}
```

The returned order matches the exact top-to-bottom layout in the Eagle Inspector UI.

---

### 2.2 Appending Backlinks Without Disrupting Manual Order
When an Eagle asset is pasted into an Obsidian note:
1. The Obsidian plugin extracts note metadata (title, UID).
2. It sends a `POST /api/links` with the backlink URI.
3. Because `POST` appends to the end of the array, any links the user previously organized at the top remain untouched.
4. Idempotency guarantees: if the note backlink already exists (e.g. pasted into the same note a second time), its existing position is preserved.

```typescript
async function addBacklink(eagleItemId: string, noteTitle: string, noteUid: string) {
  const backlinkUrl = `obsidian://adv-uri?vault=MyVault&uid=${noteUid}`;
  
  await requestUrl({
    url: 'http://127.0.0.1:41596/api/links',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: eagleItemId,
      links: [
        { title: noteTitle, url: backlinkUrl }
      ]
    })
  });
}
```

---

### 2.3 Programmatic Link Sorting from Obsidian
An advanced Obsidian plugin (e.g., a batch management modal) can sort links alphabetically or by date added and push the new order back to Eagle via `PUT /api/links`:

```typescript
async function sortLinksAlphabetically(eagleItemId: string) {
  const links = await getSortedLinks(eagleItemId);
  
  // Sort by title (or url if title is empty)
  links.sort((a, b) => {
    const nameA = a.title || a.url;
    const nameB = b.title || b.url;
    return nameA.localeCompare(nameB);
  });

  await requestUrl({
    url: 'http://127.0.0.1:41596/api/links',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: eagleItemId,
      links
    })
  });
}
```

When Eagle's Inspector is focused, the UI immediately displays the updated order on next item load.
