#!/usr/bin/env node
/*
 * Copy the game's MongoDB data to a new (cheaper / free-tier) cluster, keeping
 * everything that matters and only the *recent* slice of match history.
 *
 * Why: the `matches` collection is never pruned, so it grows forever and is what
 * pushes the database past the free tier. Users, app_state (missions, news config,
 * character overrides, winrate snapshots, ...), news posts, point purchases and
 * demo feedback are all small and are copied in full.
 *
 *   # 1) see what would be copied and whether it fits (reads source only)
 *   SOURCE_MONGODB_URI="mongodb+srv://..." node scripts/slim-mongo-migrate.js --dry-run
 *
 *   # 2) do the copy into an EMPTY target database
 *   SOURCE_MONGODB_URI="..." TARGET_MONGODB_URI="..." node scripts/slim-mongo-migrate.js
 *
 * Env (SOURCE_MONGODB_URI falls back to MONGODB_URI / .env):
 *   SOURCE_MONGODB_URI, SOURCE_MONGODB_DB   (db defaults to MONGODB_DB or "naruto-arena")
 *   TARGET_MONGODB_URI, TARGET_MONGODB_DB   (db defaults to the source db name)
 *   KEEP_MATCH_DAYS   keep ended matches newer than this (default 14); active matches always kept
 *   MONGODB_*_COLLECTION overrides are honoured, same names as server.js
 *
 * Flags:
 *   --dry-run   read-only: print counts/sizes, never touch the target
 *   --replace   allow a non-empty target (deletes the listed collections there first)
 *
 * Indexes are not copied: server.js creates them on startup against whichever
 * database MONGODB_URI points at.
 */
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient, BSON } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const REPLACE = args.has('--replace');

const sourceUri = process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI;
const targetUri = process.env.TARGET_MONGODB_URI;
const sourceDbName = process.env.SOURCE_MONGODB_DB || process.env.MONGODB_DB || 'naruto-arena';
const targetDbName = process.env.TARGET_MONGODB_DB || sourceDbName;
const keepMatchDays = Math.max(0, Number(process.env.KEEP_MATCH_DAYS ?? 14));
const BATCH_SIZE = 500;
const FREE_TIER_WARN_MB = 400; // M0 allows 512 MB total, indexes + overhead included

const matchesName = process.env.MONGODB_MATCHES_COLLECTION || 'matches';
const cutoff = new Date(Date.now() - keepMatchDays * 24 * 60 * 60 * 1000);

// [collection name, filter] -- everything is copied in full except matches.
const plan = [
    [process.env.MONGODB_USERS_COLLECTION || 'users', {}],
    [process.env.MONGODB_APP_STATE_COLLECTION || 'app_state', {}],
    [process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts', {}],
    [process.env.MONGODB_POINT_PURCHASES_COLLECTION || 'point_purchases', {}],
    [process.env.MONGODB_DEMO_FEEDBACK_COLLECTION || 'demo_feedback', {}],
    [matchesName, { $or: [{ status: { $ne: 'ended' } }, { endedAt: { $gte: cutoff } }] }],
];

const sizeOf = (doc) => {
    try {
        return BSON.calculateObjectSize(doc);
    } catch (error) {
        return Buffer.byteLength(JSON.stringify(doc));
    }
};
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

async function main() {
    if (!sourceUri) {
        throw new Error('Set SOURCE_MONGODB_URI (or MONGODB_URI) to the database you are copying FROM.');
    }
    if (!DRY_RUN) {
        if (!targetUri) {
            throw new Error('Set TARGET_MONGODB_URI to the new database, or pass --dry-run to only inspect the source.');
        }
        if (targetUri === sourceUri && targetDbName === sourceDbName) {
            throw new Error('Source and target are the same database. Refusing to continue.');
        }
    }

    const source = new MongoClient(sourceUri);
    const target = DRY_RUN ? null : new MongoClient(targetUri);
    try {
        await source.connect();
        const sourceDb = source.db(sourceDbName);
        let targetDb = null;
        if (target) {
            await target.connect();
            targetDb = target.db(targetDbName);
            if (!REPLACE) {
                // Fail before copying anything if the target already has data.
                for (const [name] of plan) {
                    const existing = await targetDb.collection(name).estimatedDocumentCount();
                    if (existing > 0) {
                        throw new Error(
                            `Target "${targetDbName}.${name}" already has ${existing} document(s). ` +
                                'Use an empty database, or pass --replace to overwrite those collections.'
                        );
                    }
                }
            }
        }

        console.log(
            `${DRY_RUN ? 'DRY RUN - ' : ''}source db "${sourceDbName}"` +
                (targetDb ? ` -> target db "${targetDbName}"` : '') +
                `; keeping ended matches since ${cutoff.toISOString()} (${keepMatchDays} days)\n`
        );

        let totalBytes = 0;
        for (const [name, filter] of plan) {
            const sourceCollection = sourceDb.collection(name);
            const totalDocs = await sourceCollection.estimatedDocumentCount();
            const targetCollection = targetDb ? targetDb.collection(name) : null;
            if (targetCollection && REPLACE) {
                await targetCollection.deleteMany({});
            }

            let kept = 0;
            let bytes = 0;
            let batch = [];
            const flush = async () => {
                if (!batch.length) return;
                if (targetCollection) {
                    await targetCollection.insertMany(batch, { ordered: false });
                }
                batch = [];
            };

            const cursor = sourceCollection.find(filter);
            for await (const doc of cursor) {
                kept += 1;
                bytes += sizeOf(doc);
                if (targetCollection) {
                    batch.push(doc);
                    if (batch.length >= BATCH_SIZE) {
                        await flush();
                    }
                }
                if (kept % 2000 === 0) {
                    process.stdout.write(`  ${name}: ${kept} docs...\r`);
                }
            }
            await flush();

            totalBytes += bytes;
            const droppedNote = totalDocs > kept ? `  (skipping ~${totalDocs - kept} older)` : '';
            console.log(`${name.padEnd(18)} ${String(kept).padStart(8)} docs  ${mb(bytes).padStart(8)} MB${droppedNote}`);
        }

        console.log(`\nTotal data copied: ${mb(totalBytes)} MB`);
        if (totalBytes / (1024 * 1024) > FREE_TIER_WARN_MB) {
            console.log(
                `WARNING: over ${FREE_TIER_WARN_MB} MB of data - too close to the 512 MB free-tier limit ` +
                    '(indexes count too). Re-run with a smaller KEEP_MATCH_DAYS (e.g. KEEP_MATCH_DAYS=3).'
            );
        } else {
            console.log('This should fit a free 512 MB cluster.');
        }
        if (DRY_RUN) {
            console.log('\nDry run only - nothing was written. Re-run without --dry-run and with TARGET_MONGODB_URI to copy.');
        } else {
            console.log(
                '\nCopy finished. Next: set MONGODB_URI (and MONGODB_DB if you changed it) on the web service ' +
                    'to the new database and redeploy. The server creates its indexes on startup.'
            );
        }
    } finally {
        await source.close().catch(() => {});
        if (target) await target.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error(`\nFailed: ${error.message}`);
    process.exit(1);
});
