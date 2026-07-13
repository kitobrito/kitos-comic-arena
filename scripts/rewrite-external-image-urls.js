#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mirrorRoot = path.join(root, 'assets', 'images', 'external-mirror');
const manifest = JSON.parse(fs.readFileSync(path.join(mirrorRoot, 'manifest.json'), 'utf8'));
const reportPath = path.join(mirrorRoot, 'rewrite-report.json');
const dryRun = process.argv.includes('--dry-run');

const replacementsByFile = new Map();
for (const [externalUrl, entry] of Object.entries(manifest)) {
    const localUrl = `/${entry.localPath.replaceAll('\\', '/')}`;
    for (const reference of entry.references || []) {
        if (!replacementsByFile.has(reference.file)) replacementsByFile.set(reference.file, new Map());
        replacementsByFile.get(reference.file).set(externalUrl, localUrl);
    }
}

const changedFiles = [];
const missingReferences = [];
let totalReplacements = 0;

for (const [relativeFile, replacements] of [...replacementsByFile].sort(([a], [b]) => a.localeCompare(b))) {
    const absoluteFile = path.join(root, ...relativeFile.split('/'));
    if (!fs.existsSync(absoluteFile)) {
        missingReferences.push({ file: relativeFile, reason: 'source file no longer exists' });
        continue;
    }

    const original = fs.readFileSync(absoluteFile, 'utf8');
    let updated = original;
    let fileReplacementCount = 0;

    for (const [externalUrl, localUrl] of replacements) {
        const pieces = updated.split(externalUrl);
        const occurrences = pieces.length - 1;
        if (!occurrences) continue;
        updated = pieces.join(localUrl);
        fileReplacementCount += occurrences;
    }

    if (!fileReplacementCount) {
        missingReferences.push({ file: relativeFile, reason: 'manifest URLs were not present' });
        continue;
    }

    totalReplacements += fileReplacementCount;
    changedFiles.push({ file: relativeFile, replacements: fileReplacementCount });
    if (!dryRun) fs.writeFileSync(absoluteFile, updated, 'utf8');
}

const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    manifestUrls: Object.keys(manifest).length,
    changedFileCount: changedFiles.length,
    totalReplacements,
    changedFiles,
    missingReferences,
};

if (!dryRun) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (missingReferences.length) process.exitCode = 2;
