/**
 * Embedded HTTP REST Server for Eagle Extra Links Plugin
 * Provides cross-platform IPC for Obsidian and external applications.
 */

const http = require('http');
const url = require('url');

// Reference dependencies (compatible with CommonJS and browser globals)
const Storage = typeof StorageManager !== 'undefined' ? StorageManager : require('./storage.js');
const Config = typeof ConfigManager !== 'undefined' ? ConfigManager : require('./config.js');
const Filter = typeof IpFilter !== 'undefined' ? IpFilter : require('./ip-filter.js');

const IpcServer = {
    serverInstance: null,
    isRunning: false,
    activeHost: '127.0.0.1',
    activePort: 41598,
    _uiUpdateListeners: [],
    _startPromise: null,

    /**
     * Registers a listener for when an item is updated via IPC.
     * @param {(itemId: string, links: string[]) => void} callback 
     */
    onItemUpdated(callback) {
        if (typeof callback === 'function') {
            this._uiUpdateListeners.push(callback);
        }
    },

    /**
     * Broadcasts an item update to registered UI listeners.
     * @param {string} itemId 
     * @param {string[]} links 
     */
    _broadcastUpdate(itemId, links) {
        for (const listener of this._uiUpdateListeners) {
            try {
                listener(itemId, links);
            } catch (err) {
                console.error('[IpcServer] Error notifying UI listener:', err);
            }
        }
    },

    /**
     * Helper to read JSON body from request.
     * @param {http.IncomingMessage} req 
     * @returns {Promise<any>}
     */
    _readJsonBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk;
                if (body.length > 1e6) { // 1MB limit
                    req.destroy();
                    reject(new Error('Payload too large'));
                }
            });
            req.on('end', () => {
                if (!body.trim()) {
                    resolve({});
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', err => reject(err));
        });
    },

    /**
     * Sends a JSON response with CORS headers.
     * @param {http.ServerResponse} res 
     * @param {number} statusCode 
     * @param {object} data 
     */
    _sendJson(res, statusCode, data) {
        const payload = JSON.stringify(data);
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(payload),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(payload);
    },

    /**
     * Starts the embedded HTTP server according to current configuration.
     * @returns {Promise<boolean>}
     */
    start() {
        if (this._startPromise) {
            return this._startPromise;
        }

        if (this.serverInstance) {
            console.log('[IpcServer] Server is already running.');
            return Promise.resolve(true);
        }

        this._startPromise = new Promise((resolve) => {
            const config = Config.getConfig();

            if (!config.serverEnabled) {
                console.log('[IpcServer] Server is disabled in configuration.');
                this.isRunning = false;
                resolve(false);
                return;
            }

            this.activeHost = config.host || '127.0.0.1';
            this.activePort = config.port || 41598;

            const server = http.createServer(async (req, res) => {
                // 1. IP Access Control Validation
                const currentConfig = Config.getConfig();
                const remoteAddress = req.socket.remoteAddress;
                if (!Filter.isAuthorized(remoteAddress, currentConfig)) {
                    console.warn(`[IpcServer] Blocked unauthorized request from: ${remoteAddress}`);
                    return this._sendJson(res, 403, {
                        status: 'error',
                        message: `Forbidden: Client IP ${remoteAddress} is not authorized.`
                    });
                }

                // 2. Handle CORS Preflight
                if (req.method === 'OPTIONS') {
                    res.writeHead(204, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    });
                    res.end();
                    return;
                }

                const parsedUrl = url.parse(req.url, true);
                const pathname = parsedUrl.pathname || '';

                // Route: GET /health
                if (pathname === '/health' && req.method === 'GET') {
                    return this._sendJson(res, 200, {
                        status: 'ok',
                        version: '1.0.0',
                        host: this.activeHost,
                        port: this.activePort,
                        library: (typeof eagle !== 'undefined' && eagle.library) ? eagle.library.path : null
                    });
                }

                // Route: /api/item/:id/links
                const itemLinksMatch = pathname.match(/^\/api\/item\/([^\/]+)\/links\/?$/);
                if (itemLinksMatch) {
                    const itemId = decodeURIComponent(itemLinksMatch[1]);
                    const itemDir = Storage.resolveItemDir(itemId);

                    if (!itemDir) {
                        return this._sendJson(res, 404, {
                            status: 'error',
                            message: `Item directory not found for ID: ${itemId}`
                        });
                    }

                    try {
                        // GET: Retrieve links
                        if (req.method === 'GET') {
                            const links = await Storage.loadLinks(itemId);
                            return this._sendJson(res, 200, {
                                status: 'success',
                                itemId,
                                links
                            });
                        }

                        // POST: Append link(s)
                        if (req.method === 'POST') {
                            const body = await this._readJsonBody(req);
                            let entriesToAppend = [];

                            if (Array.isArray(body.links)) {
                                entriesToAppend = body.links;
                            } else if (Array.isArray(body.urls)) {
                                entriesToAppend = body.urls.map(u => ({ title: '', url: u }));
                            } else if (body.url !== undefined) {
                                entriesToAppend = [{
                                    title: typeof body.title === 'string' ? body.title : '',
                                    url: body.url
                                }];
                            }

                            // Normalize and filter out empty URLs
                            entriesToAppend = entriesToAppend
                                .map(e => Storage.normalizeLink(e))
                                .filter(e => e.url.trim().length > 0);
                            
                            if (entriesToAppend.length === 0) {
                                return this._sendJson(res, 400, {
                                    status: 'error',
                                    message: 'Missing "url", "urls", or "links" in request body.'
                                });
                            }

                            const allowDuplicates = body.allowDuplicates === true;
                            const result = await Storage.appendLink(itemId, entriesToAppend, allowDuplicates);

                            if (result.changed) {
                                this._broadcastUpdate(itemId, result.links);
                            }

                            return this._sendJson(res, 200, {
                                status: 'success',
                                itemId,
                                links: result.links,
                                addedCount: result.addedCount,
                                alreadyExists: result.alreadyExists
                            });
                        }

                        // PUT: Overwrite entire links list
                        if (req.method === 'PUT') {
                            const body = await this._readJsonBody(req);
                            if (!Array.isArray(body.links)) {
                                return this._sendJson(res, 400, {
                                    status: 'error',
                                    message: 'Missing or invalid "links" array in request body.'
                                });
                            }

                            const normalized = body.links.map(l => Storage.normalizeLink(l));
                            const updatedLinks = await Storage.setLinks(itemId, normalized);
                            this._broadcastUpdate(itemId, updatedLinks);
                            return this._sendJson(res, 200, {
                                status: 'success',
                                itemId,
                                links: updatedLinks
                            });
                        }

                        // DELETE: Remove specific link or index
                        if (req.method === 'DELETE') {
                            const body = await this._readJsonBody(req);
                            let currentLinks = await Storage.loadLinks(itemId);

                            if (typeof body.index === 'number') {
                                currentLinks = await Storage.removeLinkByIndex(itemId, body.index);
                            } else if (typeof body.url === 'string') {
                                const targetUrl = body.url.trim();
                                currentLinks = currentLinks.filter(l => l.url.trim() !== targetUrl);
                                await Storage.saveLinks(itemId, currentLinks);
                            } else {
                                // If neither index nor url specified, clear all links
                                currentLinks = await Storage.setLinks(itemId, []);
                            }

                            this._broadcastUpdate(itemId, currentLinks);
                            return this._sendJson(res, 200, {
                                status: 'success',
                                itemId,
                                links: currentLinks
                            });
                        }

                        return this._sendJson(res, 405, {
                            status: 'error',
                            message: `Method ${req.method} not allowed.`
                        });
                    } catch (err) {
                        console.error('[IpcServer] Route error:', err);
                        return this._sendJson(res, 500, {
                            status: 'error',
                            message: err.message || 'Internal server error'
                        });
                    }
                }

                // 404 fallback for unknown paths
                return this._sendJson(res, 404, {
                    status: 'error',
                    message: 'Endpoint not found.'
                });
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`[IpcServer] Port ${this.activePort} is already in use by another application. You can change the port in Extra Links Settings.`);
                } else {
                    console.error(`[IpcServer] Server error on ${this.activeHost}:${this.activePort}:`, err);
                }
                this.isRunning = false;
                this.serverInstance = null;
                resolve(false);
            });

            server.listen(this.activePort, this.activeHost, () => {
                console.log(`[IpcServer] Listening on http://${this.activeHost}:${this.activePort}`);
                this.serverInstance = server;
                this.isRunning = true;
                resolve(true);
            });
        }).finally(() => {
            this._startPromise = null;
        });

        return this._startPromise;
    },

    /**
     * Stops the HTTP server.
     * @returns {Promise<void>}
     */
    stop() {
        return new Promise((resolve) => {
            if (this.serverInstance) {
                if (typeof this.serverInstance.closeAllConnections === 'function') {
                    this.serverInstance.closeAllConnections();
                }
                this.serverInstance.close(() => {
                    console.log('[IpcServer] Server stopped.');
                    this.serverInstance = null;
                    this.isRunning = false;
                    resolve();
                });
            } else {
                this.isRunning = false;
                resolve();
            }
        });
    },

    /**
     * Restarts the HTTP server with updated settings.
     * @returns {Promise<boolean>}
     */
    async restart() {
        await this.stop();
        return await this.start();
    }
};

// Listen for config changes and restart server selectively when host, port, or enabled state changes
Config.onConfigChanged((newConfig) => {
    // Only restart if the server is currently running or actively starting
    if (!IpcServer.isRunning && !IpcServer.serverInstance && !IpcServer._startPromise) {
        return;
    }
    const hostChanged = newConfig.host !== IpcServer.activeHost;
    const portChanged = newConfig.port !== IpcServer.activePort;
    const stateChanged = Boolean(newConfig.serverEnabled) !== IpcServer.isRunning;
    if (hostChanged || portChanged || stateChanged) {
        IpcServer.restart();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IpcServer;
}
if (typeof window !== 'undefined') {
    window.IpcServer = IpcServer;
}
