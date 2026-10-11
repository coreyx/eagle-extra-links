#!/usr/bin/env node

/**
 * Release Build Script for Eagle Extra Links
 *
 * 1. Stages only the runtime files into dist/eagle-extra-links/ and turns off
 *    devTools in the staged manifest.
 * 2. Packs the staged folder into dist/eagle-extra-links-<version>.eagleplugin.
 *
 * An .eagleplugin file is a plain zip of the plugin folder's contents (files at
 * the archive root, deflate-compressed), which is what Eagle's own "Pack Plugin"
 * action produces. The zip is written with Node's built-in zlib so the project
 * stays dependency-free.
 *
 * Usage:
 *   pnpm build
 */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_DIR = path.join(DIST_DIR, 'eagle-extra-links');

// Everything the plugin needs at runtime, relative to the repo root
const RUNTIME_FILES = [
    'manifest.json',
    'index.html',
    'logo.png',
    'LICENSE',
    'css',
    'js'
];

// OS / editor leftovers that must never ship
const JUNK = /^(\.DS_Store|Thumbs\.db|desktop\.ini)$|\.(log|tmp|swp|swo)$/i;

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

function listFiles(dir, base = dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory()
            ? listFiles(full, base)
            : [path.relative(base, full).replace(/\\/g, '/')];
    });
}

// The plugin currently has no runtime dependencies, so node_modules is never staged.
// When the first one is added, this script must also copy the production
// dependencies into the staged folder (nodeLinker is already "hoisted" in
// pnpm-workspace.yaml so they install without symlinks, which Eagle's review rejects).
// Until that is done, fail loudly instead of shipping a package that cannot load them.
function checkNoRuntimeDependencies() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    if (deps.length) {
        fail(`package.json declares runtime dependencies (${deps.join(', ')}) but this script does not stage node_modules yet. Update scripts/build-release.js to copy production dependencies into dist/.`);
    }
}

function stageFiles() {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const name of RUNTIME_FILES) {
        const src = path.join(ROOT, name);
        if (!fs.existsSync(src)) fail(`Missing runtime file: ${name}`);
        fs.cpSync(src, path.join(OUT_DIR, name), {
            recursive: true,
            filter: source => !JUNK.test(path.basename(source))
        });
    }
}

function writeReleaseManifest() {
    const manifestPath = path.join(OUT_DIR, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (typeof manifest.id !== 'string' || !manifest.id.trim()) fail('manifest.json has no "id"');
    if (typeof manifest.name !== 'string' || !manifest.name.trim()) fail('manifest.json has no "name"');
    if (typeof manifest.version !== 'string' || !manifest.version.trim()) fail('manifest.json has no "version"');

    manifest.devTools = false;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
    return manifest;
}

// Every local file the manifest and index.html point at must exist in the staged copy
function verifyReferences(manifest) {
    const refs = [];
    if (manifest.logo) refs.push(manifest.logo);
    for (const target of Object.values(manifest.preview || {})) {
        for (const view of Object.values(target)) {
            if (view && view.path) refs.push(view.path);
        }
    }

    const html = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(match[1])) refs.push(match[1]);
    }

    const missing = refs.filter(ref => !fs.existsSync(path.join(OUT_DIR, ref.replace(/^\//, ''))));
    if (missing.length) fail(`Staged copy is missing referenced files: ${missing.join(', ')}`);
}

// --- Zip writer -----------------------------------------------------------
// Mirrors the archive Eagle's "Pack Plugin" writes: forward-slash paths at the
// archive root, explicit directory entries, deflate, Unix attributes, UTC times.

function dosDateTime(date) {
    const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
    const day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
    return { time, day };
}

function zipEntries(dir, files) {
    const dirs = new Set();
    for (const file of files) {
        const parts = file.split('/');
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/');
    }

    return [...dirs, ...files].sort().map(name => {
        const full = path.join(dir, name);
        const isDir = name.endsWith('/');
        return {
            name,
            isDir,
            mtime: fs.statSync(full).mtime,
            data: isDir ? Buffer.alloc(0) : fs.readFileSync(full)
        };
    });
}

function buildZip(entries) {
    const UTF8_NAMES = 0x0800;
    const MADE_BY_UNIX = (3 << 8) | 45;
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const name = Buffer.from(entry.name, 'utf8');
        const method = entry.isDir ? 0 : 8;
        const body = entry.isDir ? entry.data : zlib.deflateRawSync(entry.data, { level: 9 });
        const crc = entry.isDir ? 0 : zlib.crc32(entry.data);
        const { time, day } = dosDateTime(entry.mtime);
        const versionNeeded = entry.isDir ? 10 : 20;
        // Unix mode in the high word, DOS attribute (directory / archive) in the low byte
        const attrs = entry.isDir ? ((0o040755 << 16) | 0x10) >>> 0 : ((0o100666 << 16) | 0x20) >>> 0;

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(versionNeeded, 4);
        local.writeUInt16LE(UTF8_NAMES, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(day, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(body.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(name.length, 26);
        localParts.push(local, name, body);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(MADE_BY_UNIX, 4);
        central.writeUInt16LE(versionNeeded, 6);
        central.writeUInt16LE(UTF8_NAMES, 8);
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(time, 12);
        central.writeUInt16LE(day, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(body.length, 20);
        central.writeUInt32LE(entry.data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(attrs, 38);
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, name);

        offset += local.length + name.length + body.length;
    }

    const centralDir = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDir.length, 12);
    end.writeUInt32LE(offset, 16);

    return Buffer.concat([...localParts, centralDir, end]);
}

function packPlugin(manifest, files) {
    if (typeof zlib.crc32 !== 'function') fail('Packing needs Node.js 20.15+ or 22.2+ (zlib.crc32).');

    const packagePath = path.join(DIST_DIR, `eagle-extra-links-${manifest.version}.eagleplugin`);
    fs.writeFileSync(packagePath, buildZip(zipEntries(OUT_DIR, files)));
    return packagePath;
}

checkNoRuntimeDependencies();
stageFiles();
const manifest = writeReleaseManifest();
verifyReferences(manifest);

const files = listFiles(OUT_DIR).sort();
const packagePath = packPlugin(manifest, files);

console.log(`✓ Built ${manifest.name} v${manifest.version} (${files.length} files, devTools off)`);
for (const file of files) console.log(`   ${file}`);
console.log(`\nStaged:  ${OUT_DIR}`);
console.log(`Package: ${packagePath} (${fs.statSync(packagePath).size} bytes)`);
