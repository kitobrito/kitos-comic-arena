const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const usersCollectionName = process.env.MONGODB_USERS_COLLECTION || 'users';

const TARGET_USERNAME_LOWER = 'kirukasai';
const GRANT_AMOUNT = 1000000;
const GRANT_MARKER_PATH = 'grants.kirukasaiOneMillionBonus20260820';

// Comic Arena's points live at the top level of the profile (it predates the arenas.* nesting
// added for Pokemon Arena); Pokemon Arena's live under profile.arenas.pokemon. Both arenas keep
// a separate missions pool and ladder pool, so all four get incremented independently.
const buildIncrementUpdate = (grantedAt) => ({
    $inc: {
        'profile.missions.unlockPoints': GRANT_AMOUNT,
        'profile.ladder.unlockPoints': GRANT_AMOUNT,
        'profile.arenas.pokemon.missions.unlockPoints': GRANT_AMOUNT,
        'profile.arenas.pokemon.ladder.unlockPoints': GRANT_AMOUNT,
    },
    $set: {
        [`profile.${GRANT_MARKER_PATH}`]: { amount: GRANT_AMOUNT, grantedAt },
    },
});

async function syncKirukasaiPointsGrant(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const users = db.collection(usersCollectionName);

    const existing = await users.findOne({ usernameLower: TARGET_USERNAME_LOWER });
    if (!existing) {
        return { granted: false, reason: 'no user found with that username' };
    }
    if (existing?.profile?.[GRANT_MARKER_PATH]) {
        return { granted: false, reason: 'already granted', markerRecord: existing.profile[GRANT_MARKER_PATH] };
    }

    const result = await users.updateOne(
        { usernameLower: TARGET_USERNAME_LOWER },
        buildIncrementUpdate(now)
    );

    return { granted: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
}

async function run() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncKirukasaiPointsGrant(client.db(dbName));
        if (result.granted) {
            console.log(`Granted ${GRANT_AMOUNT} points in each arena to ${TARGET_USERNAME_LOWER}.`);
        } else {
            console.log(`Skipped: ${result.reason}.`);
        }
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    run().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    GRANT_AMOUNT,
    TARGET_USERNAME_LOWER,
    syncKirukasaiPointsGrant,
};
