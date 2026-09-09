/**
 * Storage Manager for Eagle Extra Links Plugin
 * Manages atomic reading and writing of extra-links.json sidecar files in Eagle item directories.
 */

const fs = require('fs');
const path = require('path');

const StorageManager = {
    /**
     * Resolves the directory path for an item's .info folder.
     * @param {string} itemId - The Eagle item ID.
     * @param {object} [itemInstance] - Optional Eagle item object.
     * @returns {string|null} - The absolute directory path, or null if not found.
     */
    resolveItemDir(itemId, itemInstance = null) {
        // 1. If itemInstance has metadataFilePath, use its directory
        if (itemInstance && itemInstance.metadataFilePath) {
            return path.dirname(itemInstance.metadataFilePath);
        }

        // 2. Fallback using eagle.library.path if available
        if (typeof eagle !== 'undefined' && eagle.library && eagle.library.path) {
            const candidateDir = path.join(eagle.library.path, 'images', `${itemId}.info`);
            if (fs.existsSync(candidateDir)) {
                return candidateDir;
            }
        }

        return null;
    },

    /**
     * Returns the sidecar file path for an item.
     * @param {string} itemId 
     * @param {object} [itemInstance]
     * @returns {string|null}
     */
    getSidecarPath(itemId, itemInstance = null) {
        const itemDir = this.resolveItemDir(itemId, itemInstance);
        if (!itemDir) return null;
        return path.join(itemDir, 'extra-links.json');
    },

    /**
     * Normalizes a link entry (string or object) into { title: string, url: string }.
     * @param {string|object} entry 
     * @returns {{ title: string, url: string }}
     */
    normalizeLink(entry) {
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
    },

    /**
     * Loads the extra links array for a given item.
     * Automatically normalizes legacy v1 string arrays into { title, url } objects.
     * @param {string} itemId 
     * @param {object} [itemInstance]
     * @returns {Promise<Array<{ title: string, url: string }>>}
     */
    async loadLinks(itemId, itemInstance = null) {
        const filePath = this.getSidecarPath(itemId, itemInstance);
        if (!filePath) {
            return [];
        }

        try {
            if (!fs.existsSync(filePath)) {
                return [];
            }
            const raw = await fs.promises.readFile(filePath, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.links)) {
                return data.links.map(l => this.normalizeLink(l));
            }
            return [];
        } catch (err) {
            console.error(`[StorageManager] Error reading extra-links.json for ${itemId}:`, err);
            return [];
        }
    },

    /**
     * Persists the extra links array for an item using Schema Version 2.
     * Empty strings for title and url are intentionally preserved.
     * @param {string} itemId 
     * @param {Array<{ title: string, url: string }|string>} links 
     * @param {object} [itemInstance]
     * @returns {Promise<boolean>}
     */
    async saveLinks(itemId, links, itemInstance = null) {
        const itemDir = this.resolveItemDir(itemId, itemInstance);
        if (!itemDir) {
            console.error(`[StorageManager] Cannot resolve item directory for ${itemId}`);
            return false;
        }

        const filePath = path.join(itemDir, 'extra-links.json');
        const tempPath = path.join(itemDir, `extra-links.json.tmp.${Date.now()}`);

        const normalizedLinks = Array.isArray(links) 
            ? links.map(l => this.normalizeLink(l)) 
            : [];

        const payload = {
            version: 2,
            itemId: itemId,
            links: normalizedLinks,
            updatedAt: Date.now()
        };

        try {
            const content = JSON.stringify(payload, null, 2);
            // Write to temporary file first for atomic safety
            await fs.promises.writeFile(tempPath, content, 'utf8');
            // Rename to target file
            await fs.promises.rename(tempPath, filePath);
            return true;
        } catch (err) {
            console.error(`[StorageManager] Error saving extra-links.json for ${itemId}:`, err);
            // Cleanup temp file if it exists
            try {
                if (fs.existsSync(tempPath)) {
                    await fs.promises.unlink(tempPath);
                }
            } catch (_) {}
            return false;
        }
    },

    /**
     * Appends new link(s) to an item's extra links.
     * Prevents duplicate URLs by default (comparing trimmed strings for non-empty values).
     * If a duplicate URL is supplied with a title and the existing entry lacks one, updates title.
     * @param {string} itemId 
     * @param {string|object|Array<string|object>} newEntries 
     * @param {boolean} [allowDuplicates=false]
     * @returns {Promise<{ links: Array<{ title: string, url: string }>, addedCount: number, alreadyExists: boolean }>}
     */
    async appendLink(itemId, newEntries, allowDuplicates = false) {
        let currentLinks = await this.loadLinks(itemId);
        const entriesToAdd = (Array.isArray(newEntries) ? newEntries : [newEntries])
            .map(e => this.normalizeLink(e))
            .filter(e => e.url.trim().length > 0 || e.title.trim().length > 0);

        // Filter out completely empty placeholder links (!url && !title) so unpopulated slots don't linger
        currentLinks = currentLinks.filter(l => l.url.trim().length > 0 || l.title.trim().length > 0);
        
        let addedCount = 0;
        let anyAlreadyExisted = false;
        let titleUpdated = false;

        for (const entry of entriesToAdd) {
            const trimmedUrl = entry.url.trim();

            if (!allowDuplicates && trimmedUrl.length > 0) {
                const existing = currentLinks.find(l => l.url.trim() === trimmedUrl);
                if (existing) {
                    anyAlreadyExisted = true;
                    // Enrich existing title if currently empty and incoming title is non-empty
                    if (!existing.title && entry.title && entry.title.trim().length > 0) {
                        existing.title = entry.title.trim();
                        titleUpdated = true;
                    }
                    continue;
                }
            }

            currentLinks.push(entry);
            addedCount++;
        }

        if (addedCount > 0 || titleUpdated) {
            await this.saveLinks(itemId, currentLinks);
        }

        return {
            links: currentLinks,
            addedCount,
            alreadyExists: anyAlreadyExisted,
            changed: (addedCount > 0 || titleUpdated)
        };
    },

    /**
     * Replaces the entire links array for an item.
     * @param {string} itemId 
     * @param {Array<{ title: string, url: string }|string>} newLinks 
     * @returns {Promise<Array<{ title: string, url: string }>>}
     */
    async setLinks(itemId, newLinks) {
        const links = Array.isArray(newLinks) ? newLinks.map(l => this.normalizeLink(l)) : [];
        await this.saveLinks(itemId, links);
        return links;
    },

    /**
     * Removes a link by its index.
     * @param {string} itemId 
     * @param {number} index 
     * @returns {Promise<string[]>}
     */
    async removeLinkByIndex(itemId, index) {
        const currentLinks = await this.loadLinks(itemId);
        if (index >= 0 && index < currentLinks.length) {
            currentLinks.splice(index, 1);
            await this.saveLinks(itemId, currentLinks);
        }
        return currentLinks;
    },

    /**
     * Debounced save wrapper for UI input typing.
     */
    createDebouncedSaver(delay = 300) {
        let timer = null;
        let pendingItemId = null;
        let pendingLinks = null;
        let pendingItemInstance = null;

        return {
            save(itemId, links, itemInstance, callbacks = {}) {
                pendingItemId = itemId;
                pendingLinks = links;
                pendingItemInstance = itemInstance;

                if (callbacks.onSaving) callbacks.onSaving();

                if (timer) clearTimeout(timer);
                timer = setTimeout(async () => {
                    timer = null;
                    const success = await StorageManager.saveLinks(pendingItemId, pendingLinks, pendingItemInstance);
                    if (success && callbacks.onSaved) {
                        callbacks.onSaved();
                    } else if (!success && callbacks.onError) {
                        callbacks.onError();
                    }
                }, delay);
            },

            async flush(callbacks = {}) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                    if (pendingItemId) {
                        const success = await StorageManager.saveLinks(pendingItemId, pendingLinks, pendingItemInstance);
                        if (success && callbacks.onSaved) callbacks.onSaved();
                        else if (!success && callbacks.onError) callbacks.onError();
                    }
                }
            }
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
