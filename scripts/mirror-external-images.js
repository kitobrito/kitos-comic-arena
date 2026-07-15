#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'assets', 'images', 'external-mirror');
const manifestPath = path.join(outputRoot, 'manifest.json');
const reportPath = path.join(outputRoot, 'download-report.json');
const dryRun = process.argv.includes('--dry-run');

const textExtensions = new Set(['.js', '.html', '.css', '.json']);
const ignoredDirectories = new Set([
    '.git', 'node_modules', 'external-mirror', 'coverage', 'dist', 'build', '.cache',
]);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp']);
const knownImageHosts = new Set([
    'i.imgur.com', 'i.postimg.cc', 'images.unsplash.com', 'res.cloudinary.com',
    'cdn.discordapp.com', 'media.discordapp.net',
]);

function walk(directory, files = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute, files);
        else if (textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
    }
    return files;
}

function normalizeCandidate(value) {
    return value.replace(/[),.;]+$/g, '');
}

function isImageUrl(value) {
    try {
        const parsed = new URL(value);
        const extension = path.extname(parsed.pathname).toLowerCase();
        return knownImageHosts.has(parsed.hostname.toLowerCase()) || imageExtensions.has(extension);
    } catch {
        return false;
    }
}

function inventory() {
    const references = new Map();
    const urlPattern = /https?:\/\/[^\s"'`<>\\]+/g;
    for (const file of walk(root)) {
        const relative = path.relative(root, file).replaceAll('\\', '/');
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(urlPattern)) {
            const url = normalizeCandidate(match[0]);
            if (!isImageUrl(url)) continue;
            const line = source.slice(0, match.index).split('\n').length;
            if (!references.has(url)) references.set(url, []);
            references.get(url).push({ file: relative, line });
        }
    }
    return references;
}

function extensionFrom(url, contentType) {
    const pathnameExtension = path.extname(new URL(url).pathname).toLowerCase();
    if (imageExtensions.has(pathnameExtension)) return pathnameExtension === '.jpeg' ? '.jpg' : pathnameExtension;
    const type = String(contentType || '').split(';')[0].trim().toLowerCase();
    return {
        'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
        'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'image/bmp': '.bmp',
    }[type] || '.img';
}

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

async function fetchWithRetries(url, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                signal: AbortSignal.timeout(30000),
                headers: { 'User-Agent': 'Comic-Arena-Asset-Mirror/1.0' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.toLowerCase().startsWith('image/')) {
                throw new Error(`Unexpected content type: ${contentType || 'missing'}`);
            }
            const bytes = Buffer.from(await response.arrayBuffer());
            if (!bytes.length) throw new Error('Empty response');
            return { bytes, contentType, finalUrl: response.url };
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
    }
    throw lastError;
}

async function runPool(items, concurrency, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            await worker(items[index], index);
        }
    });
    await Promise.all(runners);
}

async function main() {
    const references = inventory();
    const urls = [...references.keys()].sort();
    const hostCounts = {};
    for (const url of urls) {
        const host = new URL(url).hostname.toLowerCase();
        hostCounts[host] = (hostCounts[host] || 0) + 1;
    }

    if (dryRun) {
        console.log(JSON.stringify({ uniqueImages: urls.length, hostCounts }, null, 2));
        return;
    }

    fs.mkdirSync(outputRoot, { recursive: true });
    const manifest = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        : {};
    const failures = [];
    let completed = 0;

    await runPool(urls, 8, async url => {
        const host = new URL(url).hostname.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
        try {
            const existing = manifest[url];
            if (existing && fs.existsSync(path.join(root, ...existing.localPath.split('/')))) return;
            const result = await fetchWithRetries(url);
            const extension = extensionFrom(url, result.contentType);
            const urlHash = sha256(url).slice(0, 20);
            const relative = path.posix.join('assets', 'images', 'external-mirror', host, `${urlHash}${extension}`);
            const absolute = path.join(root, ...relative.split('/'));
            fs.mkdirSync(path.dirname(absolute), { recursive: true });
            fs.writeFileSync(absolute, result.bytes);
            manifest[url] = {
                localPath: relative,
                finalUrl: result.finalUrl,
                contentType: result.contentType,
                bytes: result.bytes.length,
                sha256: sha256(result.bytes),
                references: references.get(url),
            };
        } catch (error) {
            failures.push({ url, error: String(error && error.message || error), references: references.get(url) });
        } finally {
            completed += 1;
            if (completed % 25 === 0 || completed === urls.length) {
                console.log(`Processed ${completed}/${urls.length}; failures: ${failures.length}`);
            }
        }
    });

    const duplicateGroups = Object.entries(manifest).reduce((groups, [url, item]) => {
        if (!groups[item.sha256]) groups[item.sha256] = [];
        groups[item.sha256].push(url);
        return groups;
    }, {});

    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(reportPath, `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        discovered: urls.length,
        downloaded: Object.keys(manifest).length,
        failed: failures.length,
        hostCounts,
        duplicateContentGroups: Object.values(duplicateGroups).filter(group => group.length > 1),
        failures,
    }, null, 2)}\n`);

    console.log(`Downloaded ${Object.keys(manifest).length}/${urls.length} unique external images.`);
    if (failures.length) process.exitCode = 2;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
