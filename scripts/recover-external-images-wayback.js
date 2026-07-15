#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'assets', 'images', 'external-mirror');
const manifestPath = path.join(outputRoot, 'manifest.json');
const reportPath = path.join(outputRoot, 'download-report.json');

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function extensionFromUrl(url) {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(extension)
        ? (extension === '.jpeg' ? '.jpg' : extension)
        : '.img';
}

async function fetchJson(url) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'Comic-Arena-Asset-Recovery/1.0' },
    });
    if (!response.ok) throw new Error(`CDX HTTP ${response.status}`);
    return response.json();
}

async function findSnapshot(url) {
    const endpoint = new URL('https://web.archive.org/cdx/search/cdx');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('output', 'json');
    endpoint.searchParams.set('fl', 'timestamp,original,mimetype,statuscode');
    endpoint.searchParams.append('filter', 'statuscode:200');
    endpoint.searchParams.append('filter', 'mimetype:image/.*');
    endpoint.searchParams.set('filter', 'statuscode:200');
    endpoint.searchParams.append('filter', 'mimetype:image/.*');
    endpoint.searchParams.set('limit', '1');
    endpoint.searchParams.set('from', '2018');
    const rows = await fetchJson(endpoint);
    if (!Array.isArray(rows) || rows.length < 2) return null;
    const [headers, values] = rows;
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

async function downloadSnapshot(snapshot) {
    const archiveUrl = `https://web.archive.org/web/${snapshot.timestamp}id_/${snapshot.original}`;
    const response = await fetch(archiveUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
        headers: { 'User-Agent': 'Comic-Arena-Asset-Recovery/1.0' },
    });
    if (!response.ok) throw new Error(`Archive HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error('Empty archive response');
    return { archiveUrl, bytes, contentType: response.headers.get('content-type') || snapshot.mimetype || '' };
}

async function main() {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const unresolved = [];
    let recovered = 0;

    for (let index = 0; index < report.failures.length; index += 1) {
        const failure = report.failures[index];
        try {
            const snapshot = await findSnapshot(failure.url);
            if (!snapshot) throw new Error('No archived image snapshot');
            const result = await downloadSnapshot(snapshot);
            const host = new URL(failure.url).hostname.toLowerCase();
            const relative = path.posix.join(
                'assets', 'images', 'external-mirror', host,
                `${sha256(failure.url).slice(0, 20)}${extensionFromUrl(failure.url)}`,
            );
            const absolute = path.join(root, ...relative.split('/'));
            fs.mkdirSync(path.dirname(absolute), { recursive: true });
            fs.writeFileSync(absolute, result.bytes);
            manifest[failure.url] = {
                localPath: relative,
                finalUrl: result.archiveUrl,
                recoveredFromArchive: true,
                contentType: result.contentType,
                bytes: result.bytes.length,
                sha256: sha256(result.bytes),
                references: failure.references,
            };
            fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
            recovered += 1;
        } catch (error) {
            unresolved.push({ ...failure, archiveError: String(error && error.message || error) });
        }

        if ((index + 1) % 10 === 0 || index + 1 === report.failures.length) {
            console.log(`Archive checked ${index + 1}/${report.failures.length}; recovered: ${recovered}`);
        }
        await sleep(250);
    }

    report.downloaded = Object.keys(manifest).length;
    report.failed = unresolved.length;
    report.archiveRecovered = recovered;
    report.failures = unresolved;
    report.archiveRecoveryCompletedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Recovered ${recovered}; unresolved ${unresolved.length}.`);
    if (unresolved.length) process.exitCode = 2;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
