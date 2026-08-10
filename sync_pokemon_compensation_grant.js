const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const usersCollectionName = process.env.MONGODB_USERS_COLLECTION || 'users';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';

const COMPENSATION_AMOUNT = 250;
const COMPENSATION_STATE_KEY = 'pokemon_compensation:service-apology-2026-08-10-v1';
const COMPENSATION_MARKER_PATH = 'profile.arenas.pokemon.compensations.serviceApology20260810';
const releaseVersion = 'pokemon-service-apology-compensation-2026-08-10-v1';

const pointValue = (path) => ({
    $convert: {
        input: path,
        to: 'long',
        onError: 0,
        onNull: 0,
    },
});

const buildCompensationUpdatePipeline = (grantedAt) => {
    const nextBalance = {
        $add: [
            {
                $max: [
                    pointValue('$profile.arenas.pokemon.missions.unlockPoints'),
                    pointValue('$profile.arenas.pokemon.ladder.unlockPoints'),
                ],
            },
            COMPENSATION_AMOUNT,
        ],
    };
    return [{
        $set: {
            'profile.arenas.pokemon.missions.unlockPoints': nextBalance,
            'profile.arenas.pokemon.ladder.unlockPoints': nextBalance,
            [COMPENSATION_MARKER_PATH]: {
                amount: COMPENSATION_AMOUNT,
                grantedAt,
                releaseVersion,
            },
        },
    }];
};

async function syncPokemonCompensationGrant(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const users = db.collection(usersCollectionName);
    const appState = db.collection(appStateCollectionName);
    const existingState = await appState.findOne({ key: COMPENSATION_STATE_KEY });

    let grantResult = { matchedCount: 0, modifiedCount: 0 };
    if (!existingState?.completedAt) {
        grantResult = await users.updateMany(
            { [COMPENSATION_MARKER_PATH]: { $exists: false } },
            buildCompensationUpdatePipeline(now)
        );
        await appState.updateOne(
            { key: COMPENSATION_STATE_KEY },
            {
                $set: {
                    key: COMPENSATION_STATE_KEY,
                    releaseVersion,
                    amount: COMPENSATION_AMOUNT,
                    completedAt: now,
                    updatedAt: now,
                    grantedAccountCount: Number(grantResult.modifiedCount) || 0,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );
    }

    return {
        migrated: !existingState?.completedAt,
        matchedCount: Number(grantResult.matchedCount) || 0,
        modifiedCount: Number(grantResult.modifiedCount) || 0,
    };
}

async function run() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonCompensationGrant(client.db(dbName));
        console.log(
            result.migrated
                ? `Granted ${COMPENSATION_AMOUNT} Pokemon Arena points to ${result.modifiedCount} player accounts.`
                : 'The compensation grant was already complete.'
        );
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
    COMPENSATION_AMOUNT,
    COMPENSATION_MARKER_PATH,
    COMPENSATION_STATE_KEY,
    buildCompensationUpdatePipeline,
    syncPokemonCompensationGrant,
};
