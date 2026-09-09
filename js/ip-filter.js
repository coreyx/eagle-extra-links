/**
 * IP Filter & Access Control Module for Eagle Extra Links IPC Server
 * Validates incoming client connections against a user-defined whitelist.
 */

const IpFilter = {
    /**
     * Normalizes an IP address (handling IPv4-mapped IPv6 addresses).
     * @param {string} ip 
     * @returns {string}
     */
    normalizeIp(ip) {
        if (!ip) return '';
        let cleaned = ip.trim();
        if (cleaned.startsWith('::ffff:')) {
            cleaned = cleaned.substring(7);
        }
        return cleaned;
    },

    /**
     * Checks if an IP is a loopback / local address ('self').
     * @param {string} ip 
     * @returns {boolean}
     */
    isLoopback(ip) {
        const norm = this.normalizeIp(ip);
        return norm === '127.0.0.1' || norm === '::1' || norm === 'localhost';
    },

    /**
     * Matches an IP against a wildcard pattern like '192.168.1.x' or '192.168.1.*'.
     * @param {string} ip 
     * @param {string} pattern 
     * @returns {boolean}
     */
    matchWildcard(ip, pattern) {
        // e.g. 192.168.1.x -> 192.168.1.*
        const sanitizedPattern = pattern.replace(/\.x$/i, '.*').replace(/\.x\./gi, '.*.');
        
        // Escape dots for regex
        const regexStr = '^' + sanitizedPattern
            .split('.')
            .map(part => {
                if (part === '*' || part.toLowerCase() === 'x') {
                    return '\\d+';
                }
                return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            })
            .join('\\.') + '$';

        try {
            const regex = new RegExp(regexStr);
            return regex.test(ip);
        } catch {
            return false;
        }
    },

    /**
     * Checks if a remote client is authorized under current config.
     * @param {string} remoteAddress - The incoming socket remoteAddress.
     * @param {object} config - Configuration object.
     * @returns {boolean}
     */
    isAuthorized(remoteAddress, config) {
        if (!config || !config.accessRestrictionEnabled) {
            return true;
        }

        if (!remoteAddress) {
            return false;
        }

        const normIp = this.normalizeIp(remoteAddress);
        const allowedList = Array.isArray(config.allowedClients) ? config.allowedClients : ['self'];

        for (const rule of allowedList) {
            const trimmedRule = rule.trim().toLowerCase();

            // 1. 'self' keyword check
            if (trimmedRule === 'self') {
                if (this.isLoopback(normIp)) {
                    return true;
                }
                continue;
            }

            // 2. Exact IP match
            if (normIp.toLowerCase() === trimmedRule) {
                return true;
            }

            // 3. Raw match (e.g. ::1 or exact IPv6)
            if (remoteAddress.toLowerCase() === trimmedRule) {
                return true;
            }

            // 4. Wildcard matching (e.g. 192.168.1.x or 192.168.1.*)
            if (trimmedRule.includes('*') || trimmedRule.includes('.x')) {
                if (this.matchWildcard(normIp, trimmedRule)) {
                    return true;
                }
            }
        }

        return false;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IpFilter;
}
if (typeof window !== 'undefined') {
    window.IpFilter = IpFilter;
}
