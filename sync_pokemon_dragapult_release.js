const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-community-dragapult-v1';
const releaseVersion = 'pokemon-community-dragapult-v1';
const newsTitle = 'Dragapult Launches into the Community Roster';
const dragapult = characters.find((character) => character?.id === 'dragapult');

const paragraphs = [
    'Dragapult, a new Pokemon Arena community character designed by Moses, has launched into the roster. This Dragon- and Ghost-type controller uses Dreepy to build permanent Dragon Darts marks before punishing stunned or inactive enemies.',
    'Dragon Darts can stack, but Dragapult can keep only 2 total stacks active. Each stack damages its marked enemy every turn and deals additional piercing damage when that enemy ends a turn without using a new skill; both amounts double while the marked enemy is stunned. Applying a third stack removes Dragapult\'s oldest active stack.',
    '10,000 Volt Thunderbolt deals piercing damage and stuns Physical skills, while Dragon Tail deals heavier damage and stuns Special skills. Dragon Rush makes Dragapult invulnerable, deals damage, and fully stuns its target for 1 turn per Dragon Darts stack on that target.',
    'Complete the Dragapult Dragon Darts Trial by winning 8 Quick or Ladder matches and earning a 4-match streak with Dragonite and Gastly on the same team. Dragapult can also be unlocked for 400 points.',
];

const changes = (dragapult?.skills || []).map((skill) => ({
    groupKey: 'pokemon-community:dragapult',
    groupName: 'Dragapult',
    collapsible: true,
    changeType: 'new',
    characterId: 'dragapult',
    characterName: 'Dragapult',
    facePicture: dragapult?.facePicture || '',
    skillId: skill.id,
    skillName: skill.name,
    skillimage: skill.skillimage,
    text: skill.skilldescription,
}));

changes.push({
    groupKey: 'pokemon-community:dragapult',
    groupName: 'Dragapult',
    collapsible: true,
    changeType: 'new',
    characterId: 'dragapult',
    characterName: 'Dragapult',
    facePicture: dragapult?.facePicture || '',
    skillName: 'Dragapult Dragon Darts Trial',
    text: 'Win 8 Quick or Ladder matches and earn a 4-match streak with Dragonite and Gastly, or unlock Dragapult for 400 points.',
});

const newsPost = {
    title: newsTitle,
    arena: 'pokemon',
    releaseVersion,
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes,
    author: 'kito',
};

const normalizeReleaseEntries = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            characterId: typeof entry?.characterId === 'string' ? entry.characterId.trim() : '',
        }))
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
            value.releases ||
            []
    );
    const previousPokemon = normalizeReleaseEntries(
        state.releasesByArena?.pokemon ||
            value.releasesByArena?.pokemon ||
            state.pokemonReleases ||
            value.pokemonReleases ||
            []
    );
    const pokemon = [
        { characterId: 'dragapult' },
        { characterId: 'scraggy' },
        { characterId: 'ditto' },
        ...previousPokemon.filter(
            (entry) => !['dragapult', 'scraggy', 'ditto'].includes(entry.characterId)
        ),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        value: {
            version: releaseVersion,
            releases: comic,
            comicReleases: comic,
            pokemonReleases: pokemon,
            releasesByArena: { comic, pokemon },
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_dragapult_release',
    };
};

async function syncPokemonDragapultRelease(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const now = new Date();
    const newsUpdate = {
        $set: { ...newsPost, updatedAt: now },
        $setOnInsert: { createdAt: now },
    };
    if (options.refreshNewsCreatedAt) {
        newsUpdate.$set.createdAt = now;
        delete newsUpdate.$setOnInsert;
    }
    await newsPosts.updateOne(
        { $or: [{ releaseVersion }, { title: newsTitle }] },
        newsUpdate,
        { upsert: true }
    );

    const existingLatestReleases = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne(
        { key: latestReleasesKey },
        { $set: buildLatestReleasesState(existingLatestReleases) },
        { upsert: true }
    );
    const completed = await appState.findOne({ key: migrationKey });
    if (completed?.completed) return { migrated: false, newsSynced: true };

    await appState.updateOne(
        { key: migrationKey },
        {
            $set: {
                key: migrationKey,
                completed: true,
                completedAt: now,
                updatedBy: 'sync_pokemon_dragapult_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonDragapultNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonDragapultRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(
            result.migrated
                ? 'Published the Dragapult community-character release.'
                : 'Refreshed the Dragapult community-character release.'
        );
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonDragapultNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    syncPokemonDragapultNews,
    syncPokemonDragapultRelease,
};
