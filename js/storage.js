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
     * Loads the extra links array for a given item.
     * @param {string} itemId 
     * @param {object} [itemInstance]
     * @returns {Promise<string[]>}
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
                return data.links;
            }
            return [];
        } catch (err) {
            console.error(`[StorageManager] Error reading extra-links.json for ${itemId}:`, err);
            return [];
        }
    },

    /**
     * Persists the extra links array for an item.
     * Empty strings are intentionally preserved to keep blank input slots.
     * @param {string} itemId 
     * @param {string[]} links 
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

        const payload = {
            version: 1,
            itemId: itemId,
            links: Array.isArray(links) ? links : [],
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
     * Appends a new link (or links) to an item's extra links.
     * Prevents duplicate URLs by default (comparing trimmed strings for non-empty values).
     * Empty strings are preserved if explicitly provided.
     * @param {string} itemId 
     * @param {string|string[]} newUrl 
     * @param {boolean} [allowDuplicates=false]
     * @returns {Promise<{ links: string[], addedCount: number, alreadyExists: boolean }>}
     */
    async appendLink(itemId, newUrl, allowDuplicates = false) {
        const currentLinks = await this.loadLinks(itemId);
        const urlsToAdd = Array.isArray(newUrl) ? newUrl : [newUrl];
        
        let addedCount = 0;
        let anyAlreadyExisted = false;

        const existingTrimmed = new Set(
            currentLinks
                .map(l => (typeof l === 'string' ? l.trim() : ''))
                .filter(l => l.length > 0)
        );

        for (const u of urlsToAdd) {
            const raw = typeof u === 'string' ? u : String(u || '');
            const trimmed = raw.trim();

            if (!allowDuplicates && trimmed.length > 0 && existingTrimmed.has(trimmed)) {
                anyAlreadyExisted = true;
                continue;
            }

            currentLinks.push(raw);
            if (trimmed.length > 0) {
                existingTrimmed.add(trimmed);
            }
            addedCount++;
        }

        if (addedCount > 0) {
            await this.saveLinks(itemId, currentLinks);
        }

        return {
            links: currentLinks,
            addedCount,
            alreadyExists: anyAlreadyExisted
        };
    },

    /**
     * Replaces the entire links array for an item.
     * @param {string} itemId 
     * @param {string[]} newLinks 
     * @returns {Promise<string[]>}
     */
    async setLinks(itemId, newLinks) {
        const links = Array.isArray(newLinks) ? newLinks : [];
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
