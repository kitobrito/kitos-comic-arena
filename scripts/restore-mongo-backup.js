#!/usr/bin/env node
/*
 * Restore a backup made by work/mongodb-backup.js (a folder of <collection>.ejsonl
 * files plus manifest.json) into ANY MongoDB - a new free Atlas cluster, a local
 * mongod, whatever. Nothing here talks to the old cluster.
 *
 *   # 1) check the backup is readable and see what would be restored (no database needed)
 *   node scripts/restore-mongo-backup.js "C:\path\to\mongodb-backup-2026-08-11" --dry-run
 *
 *   # 2) restore into an EMPTY database
 *   $env:TARGET_MONGODB_URI="<connection string of the new database>"      (PowerShell)
 *   node scripts/restore-mongo-backup.js "C:\path\to\mongodb-backup-2026-08-11"
 *
 * Env:  TARGET_MONGODB_URI (required unless --dry-run), TARGET_MONGODB_DB (default "naruto-arena")
 * Flags:
 *   --dry-run               read + validate the backup only
 *   --replace               allow a non-empty target (deletes the restored collections there first)
 *   --keep-active-matches   also restore matches that were still in progress when the backup ran.
 *                           Off by default: those are long-dead, and only finished matches are
 *                           useful (admin win-rate / pick statistics).
 *
 * Deliberately never reads .env or MONGODB_URI, so it can't write to the wrong database.
 * Indexes are not restored: server.js creates what it needs on startup.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');

let EJSON;
try {
    ({ EJSON } = require('bson'));
} catch (error) {
    ({ EJSON } = require('mongodb').BSON);
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
const backupDir = argv.find((arg) => !arg.startsWith('--'));
const DRY_RUN = flags.has('--dry-run');
const REPLACE = flags.has('--replace');
const KEEP_ACTIVE_MATCHES = flags.has('--keep-active-matches');
const targetUri = process.env.TARGET_MONGODB_URI;
const targetDbName = process.env.TARGET_MONGODB_DB || 'naruto-arena';
const BATCH_SIZE = 500;
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

async function* readEjsonLines(file) {
    const lines = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of lines) {
        lineNumber += 1;
        if (!line.trim()) continue;
        try {
            yield EJSON.parse(line, { relaxed: false });
        } catch (error) {
            throw new Error(`${path.basename(file)} line ${lineNumber} is not valid EJSON: ${error.message}`);
        }
    }
}

async function main() {
    if (!backupDir) throw new Error('Usage: node scripts/restore-mongo-backup.js <backup folder> [--dry-run] [--replace]');
    const manifestPath = path.join(backupDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error(`No manifest.json in "${backupDir}" - is that a backup folder?`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!DRY_RUN && !targetUri) {
        throw new Error('Set TARGET_MONGODB_URI to the new database, or pass --dry-run to only check the backup.');
    }

    console.log(
        `${DRY_RUN ? 'DRY RUN - ' : ''}backup of "${manifest.database}" taken ${manifest.createdAt}` +
            (DRY_RUN ? '' : ` -> restoring into db "${targetDbName}"`) + '\n'
    );

    const client = DRY_RUN ? null : new MongoClient(targetUri);
    try {
        let targetDb = null;
        if (client) {
            await client.connect();
            targetDb = client.db(targetDbName);
            if (!REPLACE) {
                for (const entry of manifest.collections) {
                    const existing = await targetDb.collection(entry.name).estimatedDocumentCount();
                    if (existing > 0) {
                        throw new Error(
                            `Target "${targetDbName}.${entry.name}" already has ${existing} document(s). ` +
                                'Use an empty database, or pass --replace to overwrite.'
                        );
                    }
                }
            }
        }

        let totalBytes = 0;
        for (const entry of manifest.collections) {
            const file = path.join(backupDir, entry.dataFile);
            if (!fs.existsSync(file)) throw new Error(`Missing data file ${entry.dataFile}`);
            const target = targetDb ? targetDb.collection(entry.name) : null;
            if (target && REPLACE) await target.deleteMany({});

            let read = 0;
            let restored = 0;
            let skipped = 0;
            let batch = [];
            const flush = async () => {
                if (batch.length && target) await target.insertMany(batch, { ordered: false });
                batch = [];
            };
            for await (const doc of readEjsonLines(file)) {
                read += 1;
                if (entry.name === 'matches' && !KEEP_ACTIVE_MATCHES && doc.status !== 'ended') {
                    skipped += 1;
                    continue;
                }
                restored += 1;
                batch.push(doc);
                if (batch.length >= BATCH_SIZE) await flush();
            }
            await flush();

            const bytes = fs.statSync(file).size;
            totalBytes += bytes;
            const countNote = read === entry.count ? '' : `  !! manifest says ${entry.count}, file has ${read}`;
            const skipNote = skipped ? `  (left out ${skipped} unfinished)` : '';
            console.log(`${entry.name.padEnd(18)} ${String(restored).padStart(7)} docs  ${mb(bytes).padStart(6)} MB${skipNote}${countNote}`);
        }

        console.log(`\nBackup size: ${mb(totalBytes)} MB.`);
        if (DRY_RUN) {
            console.log('Backup is readable. Nothing was written (dry run).');
        } else {
            console.log(
                'Restore finished. Next: on Render, set the web service\'s MONGODB_URI to this same connection string ' +
                    `(and MONGODB_DB=${targetDbName}), then redeploy. The server creates its indexes on startup.`
            );
        }
    } finally {
        if (client) await client.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error(`\nFailed: ${error.message}`);
    process.exit(1);
});
