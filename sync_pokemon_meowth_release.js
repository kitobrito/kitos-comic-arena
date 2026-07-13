const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const releaseMigrationKey = 'release_migration:pokemon-meowth-and-wave-2-preview';
const releaseVersion = 'pokemon-release-meowth';

const upcomingCharacters = [
    'Clefairy',
    'Jigglypuff',
    'Mew',
    'Mewtwo',
    'Cyndaquil',
    'Chikorita',
    'Totodile',
    'Dragonite',
    'Beedrill',
    'Articuno',
    'Moltres',
    'Zapdos',
];

const newsPost = {
    title: '12 New Pokemon Arrive Later Today!',
    arena: 'pokemon',
    blocks: [
        {
            type: 'paragraph',
            text: 'A massive 12-character Pokemon Arena drop is coming later today. This will be the biggest single roster expansion Pokemon Arena has received so far.',
        },
        {
            type: 'paragraph',
            text: `The incoming lineup is ${upcomingCharacters.slice(0, -1).join(', ')}, and ${upcomingCharacters.at(-1)}.`,
        },
        {
            type: 'paragraph',
            text: 'The batch brings new supports, specialists, controllers, evolving Pokemon, Legendary birds, and new team-building options across the roster. Full skills and release details will be posted when the update goes live later today.',
        },
        {
            type: 'paragraph',
            text: 'Meowth is available now. Build around Fury Swipes, steal enemy energy with Pay Day, and complete three successful extensions to evolve into Persian during battle.',
        },
    ],
    paragraphs: [
        'A massive 12-character Pokemon Arena drop is coming later today. This will be the biggest single roster expansion Pokemon Arena has received so far.',
        `The incoming lineup is ${upcomingCharacters.slice(0, -1).join(', ')}, and ${upcomingCharacters.at(-1)}.`,
        'The batch brings new supports, specialists, controllers, evolving Pokemon, Legendary birds, and new team-building options across the roster. Full skills and release details will be posted when the update goes live later today.',
        'Meowth is available now. Build around Fury Swipes, steal enemy energy with Pay Day, and complete three successful extensions to evolve into Persian during battle.',
    ],
    changes: [],
    author: 'kito',
};

const normalizeReleaseEntries = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({ characterId: typeof entry?.characterId === 'string' ? entry.characterId : '' }))
        .filter((entry) => entry.characterId);

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const stateValue = state.value && typeof state.value === 'object' ? state.value : {};
    const currentComic = normalizeReleaseEntries(
        state.releasesByArena?.comic ||
            stateValue.releasesByArena?.comic ||
            state.comicReleases ||
            stateValue.comicReleases ||
            state.releases ||
            stateValue.releases ||
            []
    );
    const pokemonReleases = ['meowth', 'onix', 'aerodactyl'].map((characterId) => ({ characterId }));
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: currentComic,
        comicReleases: currentComic,
        pokemonReleases,
        releasesByArena: {
            comic: currentComic,
            pokemon: pokemonReleases,
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_meowth_release',
    };
};

async function syncPokemonMeowthRelease(db, options = {}) {
    if (!db) {
        throw new Error('A MongoDB database connection is required.');
    }
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const now = new Date();
    const newsPostUpdate = {
        ...newsPost,
        updatedAt: now,
    };
    const newsUpdateOperation = {
        $set: newsPostUpdate,
        $setOnInsert: { createdAt: now },
    };
    if (options.refreshNewsCreatedAt) {
        newsUpdateOperation.$set.createdAt = now;
        delete newsUpdateOperation.$setOnInsert;
    }
    await newsPosts.updateOne(
        { title: newsPost.title },
        newsUpdateOperation,
        { upsert: true }
    );

    const completedMigration = await appState.findOne({ key: releaseMigrationKey });
    if (completedMigration?.completed) {
        return { migrated: false, newsSynced: true };
    }

    const existingLatestReleases = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne(
        { key: latestReleasesKey },
        { $set: buildLatestReleasesState(existingLatestReleases) },
        { upsert: true }
    );
    await appState.updateOne(
        { key: releaseMigrationKey },
        {
            $set: {
                key: releaseMigrationKey,
                completed: true,
                completedAt: now,
                updatedBy: 'sync_pokemon_meowth_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonMeowthNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonMeowthRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(result.migrated
            ? 'Published Meowth latest releases and the 12-character Pokemon preview.'
            : 'Refreshed the 12-character Pokemon preview.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonMeowthNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    syncPokemonMeowthNews,
    syncPokemonMeowthRelease,
    upcomingCharacters,
};
