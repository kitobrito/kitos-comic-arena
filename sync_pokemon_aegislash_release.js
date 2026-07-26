const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-aegislash-class-audio';
const releaseVersion = 'pokemon-aegislash-class-audio';
const aegislash = characters.find((character) => character?.id === 'aegislash');

const paragraphs = [
    'Aegislash has joined Pokemon Arena as the first release from the next wave of community characters. This design comes from my old Anime Arena game and was originally designed by fghop. Its Stance Change passive swaps between an attacking portrait and a defensive Shield Stance that refreshes destructible defense.',
    'I intend to add the other community characters to the game next. Thank you to everyone preserving, sharing, and improving the character designs that made the original community special.',
    'Pokemon Arena damage classes have been overhauled. Physical and Special are now the only primary damage classes, with Special replacing Energy and offensive Mental classifications. Affliction remains as a secondary class shown immediately after Physical or Special. Obsolete non-Mental stuns have been rebalanced into harmful, Physical, or Special stuns.',
    'Chikorita Sweet Scent now alternates only between Physical and Special damage, reducing the active class by 5 each turn.',
    'iPhone sound controls have been repaired. Music, sound-effect mute buttons, and the volume slider now use the shared Web Audio output controls on iOS while keeping the existing sound settings and desktop fallback behavior.',
];

const characterChanges = (aegislash?.skills || []).map((skill) => ({
    groupKey: 'pokemon-community:aegislash',
    groupName: 'Aegislash',
    collapsible: true,
    characterId: 'aegislash',
    characterName: 'Aegislash',
    facePicture: aegislash?.facePicture,
    skillId: skill.id,
    skillName: skill.name,
    skillimage: skill.skillimage,
    text: skill.skilldescription,
    changeType: 'new',
}));

const newsPost = {
    title: 'Aegislash, Battle Classes & iPhone Audio',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [
        ...characterChanges,
        {
            changeType: 'balance',
            skillName: 'Pokemon Arena Damage Classes',
            text: 'Energy is now Special, offensive Mental moves are now Special, and Affliction is a secondary class after Physical or Special.',
        },
        {
            changeType: 'balance',
            characterId: 'chikorita',
            characterName: 'Chikorita',
            skillId: 'chikorita-sweet-scent',
            skillName: 'Passive: Sweet Scent',
            text: 'Now alternates between Physical and Special, reducing the active damage class by 5 each turn.',
        },
        {
            changeType: 'fix',
            skillName: 'iPhone Sound Controls',
            text: 'The volume slider and music/SFX mute controls now work through iOS-compatible Web Audio gain controls.',
        },
    ],
    author: 'kito',
};

const normalizeReleaseEntries = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({ characterId: typeof entry?.characterId === 'string' ? entry.characterId : '' }))
        .filter((entry) => entry.characterId);

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const value = state.value && typeof state.value === 'object' ? state.value : {};
    const comic = normalizeReleaseEntries(
        state.releasesByArena?.comic ||
        value.releasesByArena?.comic ||
        state.comicReleases ||
        value.comicReleases ||
        state.releases ||
        []
    );
    const pokemon = [{ characterId: 'aegislash' }];
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_aegislash_release',
    };
};

async function syncPokemonAegislashRelease(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const now = new Date();
    const newsUpdate = { $set: { ...newsPost, updatedAt: now }, $setOnInsert: { createdAt: now } };
    if (options.refreshNewsCreatedAt) {
        newsUpdate.$set.createdAt = now;
        delete newsUpdate.$setOnInsert;
    }
    await newsPosts.updateOne({ title: newsPost.title }, newsUpdate, { upsert: true });

    const completed = await appState.findOne({ key: migrationKey });
    if (completed?.completed) return { migrated: false, newsSynced: true };

    const existingLatestReleases = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne(
        { key: latestReleasesKey },
        { $set: buildLatestReleasesState(existingLatestReleases) },
        { upsert: true }
    );
    await appState.updateOne(
        { key: migrationKey },
        {
            $set: {
                key: migrationKey,
                completed: true,
                completedAt: now,
                updatedBy: 'sync_pokemon_aegislash_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonAegislashNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonAegislashRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(result.migrated
            ? 'Published Aegislash, the Pokemon class overhaul, and iPhone audio news.'
            : 'Refreshed the Aegislash release news.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonAegislashNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    syncPokemonAegislashNews,
    syncPokemonAegislashRelease,
};
