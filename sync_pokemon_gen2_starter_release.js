const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-gen2-starter-launch';
const releaseVersion = 'pokemon-gen2-starter-launch';
const starterIds = ['cyndaquil', 'chikorita', 'totodile'];

const starterCharacters = starterIds
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean);

const changes = starterCharacters.flatMap((character) =>
    // actorCondition-gated skills are evolved-form variants swapped in later via
    // skillReplacements (see buildInitialBoard) - they weren't part of this
    // original starter-launch changelog, so they're excluded here.
    (character.skills || []).filter((skill) => !skill.actorCondition).map((skill) => ({
        groupKey: `pokemon-gen2-starter:${character.id}`,
        groupName: character.name,
        collapsible: true,
        characterId: character.id,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
        text: skill.skilldescription,
    }))
);

const paragraphs = [
    'Welcome to Generation 2 and beyond! Cyndaquil, Chikorita, and Totodile are now fully playable in Pokemon Arena. Open the starter case on the homepage and choose one for free; the other two remain available for 500 unlock points each.',
    'Your partner grows with you. Win 16 ranked matches with your chosen starter to permanently evolve it into Quilava, Bayleaf, or Croconaw. Then win 36 additional ranked matches to reach Typhlosion, Meganium, or Feraligatr. Each evolution upgrades its portrait, selection render, and complete skill artwork.',
    'Pokemon Arena music has also been upgraded for Generation 2 with Johto and Gold, Silver, and Crystal battle themes joining the in-game playlist.',
    'The next character releases will be community characters. Post your first community character in the Discord and it will be put into the game!',
];

const newsPost = {
    title: 'Welcome to Generation 2 and Beyond!',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes,
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
        state.releasesByArena?.comic || value.releasesByArena?.comic || state.comicReleases || value.comicReleases || state.releases || []
    );
    const pokemon = starterIds.map((characterId) => ({ characterId }));
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_gen2_starter_release',
    };
};

async function syncPokemonGen2StarterRelease(db, options = {}) {
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
        { $set: { key: migrationKey, completed: true, completedAt: now, updatedBy: 'sync_pokemon_gen2_starter_release' } },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonGen2StarterNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonGen2StarterRelease(client.db(dbName), { refreshNewsCreatedAt: true });
        console.log(result.migrated ? 'Published the Generation 2 starter launch.' : 'Refreshed the Generation 2 starter news.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonGen2StarterNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    starterIds,
    syncPokemonGen2StarterNews,
    syncPokemonGen2StarterRelease,
};
