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
    assert.strictEqual(defaults.port, 41598);
    assert.strictEqual(defaults.accessRestrictionEnabled, false);
    assert.deepStrictEqual(defaults.allowedClients, ['self']);

    // Test port boundary validation
    const saved = ConfigManager.saveConfig({ port: 99999 });
    assert.strictEqual(saved.port, 41598, 'Out of bounds port should fall back to default');

    const validPort = ConfigManager.saveConfig({ port: 41599 });
    assert.strictEqual(validPort.port, 41599);

    // Restore default port
    ConfigManager.saveConfig({ port: 41598 });
    console.log('   ✓ ConfigManager tests passed.');

    // 2b. Test Drag & Drop Reorder Index Logic
    console.log('2b. Testing DnD Reorder Index Logic...');
    function computeDropTarget(fromIdx, targetIdx, isAbove) {
        let newIdx = targetIdx;
        if (!isAbove) {
            newIdx += 1;
        }
        if (fromIdx < newIdx) {
            newIdx -= 1;
        }
        return newIdx;
    }

    // Moving item 0 below item 2 (isAbove: false) -> target 2
    assert.strictEqual(computeDropTarget(0, 2, false), 2);
    // Moving item 0 above item 2 (isAbove: true) -> target 1
    assert.strictEqual(computeDropTarget(0, 2, true), 1);
    // Moving item 3 above item 1 (isAbove: true) -> target 1
    assert.strictEqual(computeDropTarget(3, 1, true), 1);
    // Moving item 3 below item 1 (isAbove: false) -> target 2
    assert.strictEqual(computeDropTarget(3, 1, false), 2);
    // Dropping onto self above/below results in no net movement
    assert.strictEqual(computeDropTarget(1, 1, true), 1);
    assert.strictEqual(computeDropTarget(1, 1, false), 1);
    console.log('   ✓ DnD Reorder Index Logic tests passed.');

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

        // Test backward compatibility: load legacy v1 string format
        const v1FilePath = path.join(sampleDir, 'extra-links.json');
        await fs.promises.writeFile(v1FilePath, JSON.stringify({
            version: 1,
            itemId: 'MTSPUNN17LBUG',
            links: ['https://legacy-url.com', '']
        }), 'utf8');

        const normalizedFromV1 = await StorageManager.loadLinks('MTSPUNN17LBUG');
        assert.deepStrictEqual(normalizedFromV1, [
            { title: '', url: 'https://legacy-url.com' },
            { title: '', url: '' }
        ], 'Legacy v1 string links must be normalized to { title, url }');

        // Test save and load with Schema v2
        const testLinks = [
            { title: 'Test Example', url: 'https://example.com/test' },
            { title: 'Obsidian Note', url: 'obsidian://adv-uri?vault=Main&filepath=Note.md' },
            { title: '', url: '' }
        ];

        const saveOk = await StorageManager.saveLinks('MTSPUNN17LBUG', testLinks);
        assert.strictEqual(saveOk, true, 'Save should succeed');

        const loadedLinks = await StorageManager.loadLinks('MTSPUNN17LBUG');
        assert.deepStrictEqual(loadedLinks, testLinks, 'Loaded links must match saved links including empty fields');

        // Test append with title
        const appendRes1 = await StorageManager.appendLink('MTSPUNN17LBUG', {
            title: 'Second Site',
            url: 'https://second-url.com'
        });
        assert.strictEqual(appendRes1.links.length, 4);
        assert.strictEqual(appendRes1.addedCount, 1);
        assert.strictEqual(appendRes1.alreadyExists, false);
        assert.strictEqual(appendRes1.links[3].title, 'Second Site');
        assert.strictEqual(appendRes1.links[3].url, 'https://second-url.com');

        // Test duplicate append (should NOT duplicate)
        const appendResDuplicate = await StorageManager.appendLink('MTSPUNN17LBUG', {
            title: 'Duplicate Title',
            url: '  https://second-url.com  '
        });
        assert.strictEqual(appendResDuplicate.links.length, 4, 'Duplicate URL must not increase links length');
        assert.strictEqual(appendResDuplicate.addedCount, 0, 'Duplicate append must report addedCount 0');
        assert.strictEqual(appendResDuplicate.alreadyExists, true, 'Duplicate append must report alreadyExists true');

        // Test duplicate with title enrichment on an entry that had empty title
        // In testLinks, index 2 was empty url, but index 3 (second-url.com) currently has title 'Second Site'.
        // Let's enrich a link with an empty title:
        await StorageManager.saveLinks('MTSPUNN17LBUG', [
            { title: 'Test Example', url: 'https://example.com/test' },
            { title: '', url: 'https://needs-title.com' }
        ]);

        const appendResEnrich = await StorageManager.appendLink('MTSPUNN17LBUG', {
            title: 'Now Has Title',
            url: 'https://needs-title.com'
        });
        assert.strictEqual(appendResEnrich.links.length, 2, 'Title enrichment must not create a duplicate row');
        assert.strictEqual(appendResEnrich.addedCount, 0);
        assert.strictEqual(appendResEnrich.alreadyExists, true);
        assert.strictEqual(appendResEnrich.links[1].title, 'Now Has Title', 'Existing empty title must be enriched');

        // Test remove by index
        const removed = await StorageManager.removeLinkByIndex('MTSPUNN17LBUG', 1);
        assert.strictEqual(removed.length, 1);
        assert.strictEqual(removed[0].url, 'https://example.com/test');

        // Test Link Reordering & Persistence (Click & Drag Sort)
        const reorderSource = [
            { title: 'Item 0', url: 'https://0.com' },
            { title: 'Item 1', url: 'https://1.com' },
            { title: 'Item 2', url: 'https://2.com' }
        ];
        await StorageManager.saveLinks('MTSPUNN17LBUG', reorderSource);

        // Move Item 2 to index 0: [Item 2, Item 0, Item 1]
        const reordered = [...reorderSource];
        const [moved] = reordered.splice(2, 1);
        reordered.splice(0, 0, moved);

        const reorderSaveOk = await StorageManager.saveLinks('MTSPUNN17LBUG', reordered);
        assert.strictEqual(reorderSaveOk, true, 'Reordered save should succeed');

        const reorderedLoaded = await StorageManager.loadLinks('MTSPUNN17LBUG');
        assert.deepStrictEqual(reorderedLoaded, reordered, 'Loaded links must match newly sorted order exactly');
        assert.strictEqual(reorderedLoaded[0].title, 'Item 2');
        assert.strictEqual(reorderedLoaded[1].title, 'Item 0');
        assert.strictEqual(reorderedLoaded[2].title, 'Item 1');

        console.log('   ✓ StorageManager tests passed (including reordering).');
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
        assert.strictEqual(typeof getJson.links[0].title, 'string');
        assert.strictEqual(typeof getJson.links[0].url, 'string');

        // Test POST /api/item/:id/links (with title)
        const testUrl = 'obsidian://adv-uri?vault=Main&filepath=IpcTest.md';
        const testTitle = 'IPC Backlink Note';
        const postRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ title: testTitle, url: testUrl })
        );
        assert.strictEqual(postRes.statusCode, 200);
        const postJson = JSON.parse(postRes.body);
        assert.strictEqual(postJson.status, 'success');
        assert.strictEqual(postJson.addedCount, 1);
        assert.strictEqual(postJson.alreadyExists, false);
        const createdLink = postJson.links.find(l => l.url === testUrl);
        assert.ok(createdLink, 'Added link must be present in response');
        assert.strictEqual(createdLink.title, testTitle);
        const initialCount = postJson.links.length;

        // Test POST duplicate link (idempotent; should NOT duplicate)
        const duplicatePostRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ title: 'Ignored Title', url: `  ${testUrl}  ` })
        );
        assert.strictEqual(duplicatePostRes.statusCode, 200);
        const duplicateJson = JSON.parse(duplicatePostRes.body);
        assert.strictEqual(duplicateJson.status, 'success');
        assert.strictEqual(duplicateJson.addedCount, 0, 'Duplicate POST must have addedCount: 0');
        assert.strictEqual(duplicateJson.alreadyExists, true, 'Duplicate POST must have alreadyExists: true');
        assert.strictEqual(duplicateJson.links.length, initialCount, 'Duplicate POST must not increase links array');

        // Test POST duplicate with allowDuplicates: true (explicit override)
        const allowedDupRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ title: 'Duplicate Allowed', url: testUrl, allowDuplicates: true })
        );
        assert.strictEqual(allowedDupRes.statusCode, 200);
        const allowedDupJson = JSON.parse(allowedDupRes.body);
        assert.strictEqual(allowedDupJson.addedCount, 1);
        assert.strictEqual(allowedDupJson.links.length, initialCount + 1);

        // Test DELETE /api/item/:id/links by url
        const deleteRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'DELETE',
            JSON.stringify({ url: testUrl })
        );
        assert.strictEqual(deleteRes.statusCode, 200);
        const deleteJson = JSON.parse(deleteRes.body);
        assert.ok(!deleteJson.links.some(l => l.url === testUrl), 'Deleted url must no longer be present');

        // Test POST with legacy url-only format (should default title to "")
        const legacyPostRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'POST',
            JSON.stringify({ url: 'https://legacy-post.com' })
        );
        assert.strictEqual(legacyPostRes.statusCode, 200);
        const legacyPostJson = JSON.parse(legacyPostRes.body);
        const legacyLink = legacyPostJson.links.find(l => l.url === 'https://legacy-post.com');
        assert.ok(legacyLink);
        assert.strictEqual(legacyLink.title, '', 'Omitted title must default to empty string');

        // Test PUT /api/item/:id/links with structured links array
        const putRes = await makeRequest(
            'http://127.0.0.1:41605/api/item/MTSPUNN17LBUG/links',
            'PUT',
            JSON.stringify({
                links: [
                    { title: 'Replaced Title', url: 'https://replaced.com' }
                ]
            })
        );
        assert.strictEqual(putRes.statusCode, 200);
        const putJson = JSON.parse(putRes.body);
        assert.strictEqual(putJson.links.length, 1);
        assert.strictEqual(putJson.links[0].title, 'Replaced Title');
        assert.strictEqual(putJson.links[0].url, 'https://replaced.com');

        // Cleanup: clear test links
        await StorageManager.setLinks('MTSPUNN17LBUG', []);
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
