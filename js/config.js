/**
 * Configuration Manager for Eagle Extra Links Plugin
 * Manages plugin-level settings for the IPC server and access control restrictions.
 */

const DEFAULT_CONFIG = {
    serverEnabled: true,
    host: '127.0.0.1',
    port: 41598,
    accessRestrictionEnabled: false,
    allowedClients: ['self']
};

const STORAGE_KEY = 'eagle_extra_links_config';

const ConfigManager = {
    _listeners: [],
    _currentConfig: null,

    /**
     * Retrieves current configuration merged with defaults.
     * @returns {typeof DEFAULT_CONFIG}
     */
    getConfig() {
        if (this._currentConfig) {
            return { ...this._currentConfig };
        }

        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this._currentConfig = {
                        ...DEFAULT_CONFIG,
                        ...parsed,
                        allowedClients: Array.isArray(parsed.allowedClients) ? parsed.allowedClients : DEFAULT_CONFIG.allowedClients
                    };
                    return { ...this._currentConfig };
                }
            }
        } catch (err) {
            console.error('[ConfigManager] Error loading config from localStorage:', err);
        }

        this._currentConfig = { ...DEFAULT_CONFIG };
        return { ...this._currentConfig };
    },

    /**
     * Saves configuration to localStorage and notifies listeners.
     * @param {Partial<typeof DEFAULT_CONFIG>} newConfig 
     * @returns {typeof DEFAULT_CONFIG}
     */
    saveConfig(newConfig) {
        const current = this.getConfig();
        const updated = {
            ...current,
            ...newConfig
        };

        // Validation & sanitization
        updated.serverEnabled = Boolean(updated.serverEnabled);
        
        // Host validation
        updated.host = (typeof updated.host === 'string' && updated.host.trim()) 
            ? updated.host.trim() 
            : DEFAULT_CONFIG.host;

        // Port validation (1024 - 65535)
        let portNum = parseInt(updated.port, 10);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
            portNum = DEFAULT_CONFIG.port;
        }
        updated.port = portNum;

        updated.accessRestrictionEnabled = Boolean(updated.accessRestrictionEnabled);

        // Allowed clients sanitization
        if (Array.isArray(updated.allowedClients)) {
            updated.allowedClients = updated.allowedClients
                .map(c => typeof c === 'string' ? c.trim() : '')
                .filter(Boolean);
        } else if (typeof updated.allowedClients === 'string') {
            updated.allowedClients = updated.allowedClients
                .split(',')
                .map(c => c.trim())
                .filter(Boolean);
        } else {
            updated.allowedClients = [...DEFAULT_CONFIG.allowedClients];
        }

        if (updated.allowedClients.length === 0) {
            updated.allowedClients = ['self'];
        }

        this._currentConfig = updated;

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
        } catch (err) {
            console.error('[ConfigManager] Error writing config to localStorage:', err);
        }

        // Notify listeners of configuration change
        for (const listener of this._listeners) {
            try {
                listener(updated);
            } catch (err) {
                console.error('[ConfigManager] Listener error:', err);
            }
        }

        return updated;
    },

    /**
     * Register a callback when configuration updates.
     * @param {(config: typeof DEFAULT_CONFIG) => void} callback 
     */
    onConfigChanged(callback) {
        if (typeof callback === 'function') {
            this._listeners.push(callback);
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}
if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
}
