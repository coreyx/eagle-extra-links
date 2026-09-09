# Obsidian Integration Guide: Title & URL Modes

This guide provides drop-in TypeScript and JavaScript integration code for Obsidian (`obsidian.md`) plugins to interact with the **Eagle Extra Links** plugin using **Title and URL Display Modes**.

By passing the Obsidian note title or frontmatter alias as the `title` parameter, Eagle assets can display human-readable note names directly in Eagle's Inspector!

---

## 1. TypeScript Client Helper Class

```typescript
import { requestUrl } from 'obsidian';

export interface EagleExtraLinkItem {
    title: string;
    url: string;
}

export interface EagleExtraLinksResponse {
    status: 'success' | 'error';
    itemId?: string;
    links?: EagleExtraLinkItem[];
    addedCount?: number;
    alreadyExists?: boolean;
    message?: string;
}

export class EagleExtraLinksClient {
    private baseUrl: string;

    constructor(host: string = '127.0.0.1', port: number = 41596) {
        this.baseUrl = `http://${host}:${port}`;
    }

    /**
     * Check if the Eagle Extra Links IPC server is responsive.
     */
    async isHealthy(): Promise<boolean> {
        try {
            const res = await requestUrl({
                url: `${this.baseUrl}/health`,
                method: 'GET'
            });
            return res.status === 200 && res.json?.status === 'ok';
        } catch {
            return false;
        }
    }

    /**
     * Get all extra links currently associated with an Eagle item.
     */
    async getLinks(itemId: string): Promise<EagleExtraLinkItem[]> {
        try {
            const res = await requestUrl({
                url: `${this.baseUrl}/api/item/${encodeURIComponent(itemId)}/links`,
                method: 'GET'
            });
            if (res.status === 200 && Array.isArray(res.json?.links)) {
                return res.json.links;
            }
            return [];
        } catch (err) {
            console.error(`[EagleExtraLinks] Failed to fetch links for ${itemId}:`, err);
            return [];
        }
    }

    /**
     * Append a URL or Obsidian URI with an optional human-readable title to an Eagle item.
     * Automatically deduplicates on the Eagle side unless allowDuplicates is true.
     * If the link already exists without a title, updates the title in-place.
     * Triggers real-time UI refresh in Eagle if the item is currently open.
     */
    async addLink(
        itemId: string,
        url: string,
        title: string = '',
        allowDuplicates: boolean = false
    ): Promise<EagleExtraLinksResponse> {
        try {
            const res = await requestUrl({
                url: `${this.baseUrl}/api/item/${encodeURIComponent(itemId)}/links`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title, allowDuplicates })
            });
            return res.json as EagleExtraLinksResponse;
        } catch (err) {
            console.error(`[EagleExtraLinks] Failed to add link to ${itemId}:`, err);
            return { status: 'error', message: String(err) };
        }
    }

    /**
     * Replace all extra links for an Eagle item.
     */
    async setLinks(itemId: string, links: EagleExtraLinkItem[]): Promise<boolean> {
        try {
            const res = await requestUrl({
                url: `${this.baseUrl}/api/item/${encodeURIComponent(itemId)}/links`,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links })
            });
            return res.status === 200;
        } catch (err) {
            console.error(`[EagleExtraLinks] Failed to set links for ${itemId}:`, err);
            return false;
        }
    }
}
```

---

## 2. Automated Backlinks on Note Paste (with Human-Readable Note Title)

When an Eagle asset is pasted into an Obsidian note, an Obsidian plugin can intercept the paste event and register the note as a titled backlink in Eagle:

```typescript
import { App, Editor, MarkdownView, Notice, Plugin } from 'obsidian';

export default class EagleSyncPlugin extends Plugin {
    eagleClient = new EagleExtraLinksClient();

    async onload() {
        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor, view: MarkdownView) => {
                const activeFile = view.file;
                if (!activeFile) return;

                // 1. Extract note title and frontmatter UID
                const cache = this.app.metadataCache.getFileCache(activeFile);
                const noteUid = cache?.frontmatter?.uid;
                const noteTitle = cache?.frontmatter?.title || activeFile.basename;
                const vaultName = encodeURIComponent(this.app.vault.getName());

                // 2. Extract Eagle Item ID from clipboard (e.g. from eagle://item/ID or file path)
                const eagleItemId = this.extractEagleItemId(evt.clipboardData);
                if (!eagleItemId || !noteUid) return;

                // 3. Construct deep URI using UID
                const backlinkUri = `obsidian://adv-uri?vault=${vaultName}&uid=${noteUid}`;

                // 4. Naively send POST with noteTitle:
                // Eagle automatically deduplicates links, sets the title, and displays
                // the human-readable note name in Eagle's Inspector!
                const result = await this.eagleClient.addLink(eagleItemId, backlinkUri, noteTitle);

                if (result.status === 'success') {
                    if (result.alreadyExists) {
                        console.log(`[Eagle] Backlink already exists for ${eagleItemId}, skipped duplicate.`);
                    } else {
                        new Notice(`Attached backlink "${noteTitle}" to Eagle asset`);
                    }
                }
            })
        );
    }

    private extractEagleItemId(clipboardData: DataTransfer | null): string | null {
        if (!clipboardData) return null;
        const text = clipboardData.getData('text/plain');
        // Match eagle://item/MTSPUNN17LBUG or raw ID format
        const match = text.match(/eagle:\/\/item\/([A-Za-z0-9]+)/) || text.match(/^([A-Za-z0-9]{13})$/);
        return match ? match[1] : null;
    }
}
```

---

## 3. Offline Direct Filesystem Fallback (Schema Version 2)

If Eagle is closed, Obsidian plugins have Node.js runtime access and can update `<LibraryPath>/images/<itemId>.info/extra-links.json` directly:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

export async function addLinkDirectlyToFile(
    libraryPath: string,
    itemId: string,
    url: string,
    title: string = ''
): Promise<boolean> {
    try {
        const itemInfoDir = path.join(libraryPath, 'images', `${itemId}.info`);
        const sidecarPath = path.join(itemInfoDir, 'extra-links.json');

        let links: { title: string; url: string }[] = [];
        try {
            const raw = await fs.readFile(sidecarPath, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.links)) {
                links = data.links.map((l: any) => {
                    if (typeof l === 'string') return { title: '', url: l };
                    return { title: l.title || '', url: l.url || '' };
                });
            }
        } catch {
            // File doesn't exist yet
        }

        const trimmedUrl = url.trim();
        const existing = links.find(l => l.url.trim() === trimmedUrl);

        if (!existing) {
            links.push({ title, url: trimmedUrl });
        } else if (!existing.title && title) {
            existing.title = title;
        } else {
            return true; // Already exists
        }

        const payload = {
            version: 2,
            itemId,
            links,
            updatedAt: Date.now()
        };

        await fs.writeFile(sidecarPath, JSON.stringify(payload, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`[EagleSync] Direct file write failed for ${itemId}:`, err);
        return false;
    }
}
```
