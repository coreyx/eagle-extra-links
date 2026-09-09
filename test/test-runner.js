const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const IpFilter = require('../js/ip-filter.js');
const ConfigManager = require('../js/config.js');
const StorageManager = require('../js/storage.js');

async function runTests() {
    console.log('--- Running Eagle Extra Links Tests ---');

    // 1. Test IpFilter
    console.log('1. Testing IpFilter...');
    assert.strictEqual(IpFilter.normalizeIp('127.0.0.1'), '127.0.0.1');
    assert.strictEqual(IpFilter.normalizeIp('::ffff:127.0.0.1'), '127.0.0.1');
    assert.strictEqual(IpFilter.isLoopback('127.0.0.1'), true);
    assert.strictEqual(IpFilter.isLoopback('::1'), true);
    assert.strictEqual(IpFilter.isLoopback('::ffff:127.0.0.1'), true);
    assert.strictEqual(IpFilter.isLoopback('192.168.1.5'), false);

    // Wildcard matching
    assert.strictEqual(IpFilter.matchWildcard('192.168.1.10', '192.168.1.x'), true);
    assert.strictEqual(IpFilter.matchWildcard('192.168.1.10', '192.168.1.*'), true);
    assert.strictEqual(IpFilter.matchWildcard('192.168.2.10', '192.168.1.x'), false);

    // Authorization checks
    const unrestrictedConfig = { accessRestrictionEnabled: false };
    assert.strictEqual(IpFilter.isAuthorized('10.0.0.1', unrestrictedConfig), true);

    const restrictedConfig = {
        accessRestrictionEnabled: true,
        allowedClients: ['self', '192.168.1.x']
    };
    assert.strictEqual(IpFilter.isAuthorized('127.0.0.1', restrictedConfig), true);
    assert.strictEqual(IpFilter.isAuthorized('::ffff:127.0.0.1', restrictedConfig), true);
    assert.strictEqual(IpFilter.isAuthorized('192.168.1.42', restrictedConfig), true);
    assert.strictEqual(IpFilter.isAuthorized('10.0.0.1', restrictedConfig), false);
    console.log('   ✓ IpFilter tests passed.');

    // 2. Test ConfigManager
    console.log('2. Testing ConfigManager...');
    const defaults = ConfigManager.getConfig();
    assert.strictEqual(defaults.serverEnabled, true);
    assert.strictEqual(defaults.host, '127.0.0.1');
    assert.strictEqual(defaults.port, 41596);
    assert.strictEqual(defaults.accessRestrictionEnabled, false);
    assert.deepStrictEqual(defaults.allowedClients, ['self']);

    // Test port boundary validation
    const saved = ConfigManager.saveConfig({ port: 99999 });
    assert.strictEqual(saved.port, 41596, 'Out of bounds port should fall back to default');

    const validPort = ConfigManager.saveConfig({ port: 41597 });
    assert.strictEqual(validPort.port, 41597);

    // Restore default port
    ConfigManager.saveConfig({ port: 41596 });
    console.log('   ✓ ConfigManager tests passed.');

    // 3. Test StorageManager
    console.log('3. Testing StorageManager...');
    const sampleDir = 'I:\\My Drive\\Eagle\\Main.library\\images\\MTSPUNN17LBUG.info';
    if (fs.existsSync(sampleDir)) {
        // Mock Eagle environment
        global.eagle = {
            library: { path: 'I:\\My Drive\\Eagle\\Main.library' }
        };

        const resolvedDir = StorageManager.resolveItemDir('MTSPUNN17LBUG');
        assert.strictEqual(resolvedDir, sampleDir);

        // Test save and load with empty fields preserved
        const testLinks = [
            'https://example.com/test',
            'obsidian://adv-uri?vault=Main&filepath=Note.md',
            ''
        ];

        const saveOk = await StorageManager.saveLinks('MTSPUNN17LBUG', testLinks);
        assert.strictEqual(saveOk, true, 'Save should succeed');

        const loadedLinks = await StorageManager.loadLinks('MTSPUNN17LBUG');
        assert.deepStrictEqual(loadedLinks, testLinks, 'Loaded links must match saved links including empty string');

        // Test append with deduplication
        const appendRes1 = await StorageManager.appendLink('MTSPUNN17LBUG', 'https://second-url.com');
        assert.strictEqual(appendRes1.links.length, 4);
        assert.strictEqual(appendRes1.addedCount, 1);
        assert.strictEqual(appendRes1.alreadyExists, false);
        assert.strictEqual(appendRes1.links[3], 'https://second-url.com');

        // Test duplicate append (should NOT duplicate)
        const appendResDuplicate = await StorageManager.appendLink('MTSPUNN17LBUG', '  https://second-url.com  ');
        assert.strictEqual(appendResDuplicate.links.length, 4, 'Duplicate URL must not increase links length');
        assert.strictEqual(appendResDuplicate.addedCount, 0, 'Duplicate append must report addedCount 0');
        assert.strictEqual(appendResDuplicate.alreadyExists, true, 'Duplicate append must report alreadyExists true');

        // Test remove by index
        const removed = await StorageManager.removeLinkByIndex('MTSPUNN17LBUG', 3);
        assert.strictEqual(removed.length, 3);
        assert.deepStrictEqual(removed, testLinks);

        console.log('   ✓ StorageManager tests passed.');
    } else {
        console.log('   ⚠ Skipping physical library test (sample dir not found)');
    }

    // 4. Test IpcServer
    console.log('4. Testing IpcServer HTTP Endpoints...');
    const IpcServer = require('../js/ipc-server.js');
    ConfigManager.saveConfig({
        serverEnabled: true,
        host: '127.0.0.1',
        port: 41605, // test port
        accessRestrictionEnabled: false
    });

    const started = await IpcServer.start();
    assert.strictEqual(started, true, 'IPC Server should start on port 41605');

    // Test GET /health
    const healthRes = await makeRequest('http://127.0.0.1:41605/health', 'GET');
    assert.strictEqual(healthRes.statusCode, 200);
    const healthJson = JSON.parse(healthRes.body);
    assert.strictEqual(healthJson.status, 'ok');
    assert.strictEqual(healthJson.port, 41605);

    // Test GET /api/item/:id/links
    if (fs.existsSync(sampleDir)) {
        const getLinksRes = await makeRequest('http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links', 'GET');
        assert.strictEqual(getLinksRes.statusCode, 200);
        const getJson = JSON.parse(getLinksRes.body);
        assert.strictEqual(getJson.status, 'success');
        assert.strictEqual(Array.isArray(getJson.links), true);

        // Test POST /api/item/:id/links (initial append)
        const testUrl = 'obsidian://adv-uri?vault=Main&filepath=IpcTest.md';
        const postRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ url: testUrl })
        );
        assert.strictEqual(postRes.statusCode, 200);
        const postJson = JSON.parse(postRes.body);
        assert.strictEqual(postJson.status, 'success');
        assert.strictEqual(postJson.addedCount, 1);
        assert.strictEqual(postJson.alreadyExists, false);
        assert.strictEqual(postJson.links.includes(testUrl), true);
        const initialCount = postJson.links.length;

        // Test POST duplicate link (idempotent; should NOT duplicate)
        const duplicatePostRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ url: `  ${testUrl}  ` })
        );
        assert.strictEqual(duplicatePostRes.statusCode, 200);
        const duplicateJson = JSON.parse(duplicatePostRes.body);
        assert.strictEqual(duplicateJson.status, 'success');
        assert.strictEqual(duplicateJson.addedCount, 0, 'Duplicate POST must have addedCount: 0');
        assert.strictEqual(duplicateJson.alreadyExists, true, 'Duplicate POST must have alreadyExists: true');
        // Test POST duplicate with allowDuplicates: true (explicit override)
        const allowedDupRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ url: testUrl, allowDuplicates: true })
        );
        assert.strictEqual(allowedDupRes.statusCode, 200);
        const allowedDupJson = JSON.parse(allowedDupRes.body);
        assert.strictEqual(allowedDupJson.addedCount, 1);
        assert.strictEqual(allowedDupJson.links.length, initialCount + 1);

        // Cleanup: remove the added test links
        postJson.links.pop();
        await StorageManager.setLinks('MTSPUNN17LBUG', postJson.links);
    }

    // Test Access Control Rejection (403)
    ConfigManager.saveConfig({
        accessRestrictionEnabled: true,
        allowedClients: ['10.255.255.255'] // loopback should be rejected
    });

    const forbiddenRes = await makeRequest('http://127.0.0.1:41605/health', 'GET');
    assert.strictEqual(forbiddenRes.statusCode, 403, 'Should be 403 Forbidden when client IP is not in whitelist');

    // Reset access restriction
    ConfigManager.saveConfig({
        accessRestrictionEnabled: false,
        port: 41605
    });

    await IpcServer.stop();
    console.log('   ✓ IpcServer tests passed.');

    console.log('\nALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
}

function makeRequest(urlStr, method = 'GET', postData = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + (parsed.search || ''),
            method: method,
            headers: postData ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            } : {}
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', err => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

runTests().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
