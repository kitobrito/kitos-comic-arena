const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const eventStateKey = 'pokemon_primeape_annihilape_event_v1';
const migrationKey = 'release_migration:pokemon-primeape-annihilape-v1';
const releaseVersion = 'pokemon-primeape-annihilape-v1';
const newsTitle = 'We Are Back: Primeape Enters the Arena';
const EVENT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const primeape = characters.find((character) => character?.id === 'primeape');

const paragraphs = [
    'We are sorry that Comic Arena was unavailable during the past week. Thank you for your patience while we restored the game and its database. We know the shutdown interrupted matches, missions, and time with your accounts, and we appreciate everyone who waited for the Arena to return.',
    'Primeape is joining Pokemon Arena with no character-unlock mission. Rock Smash tears down Barrier and Shield, Knock Off removes helpful effects, Rage Fist grows stronger as Primeape loses HP, and Close Combat delivers heavy Piercing damage. Anger Point gives Primeape 20 additional damage after a Super Effective skill or Critical Hit lands on him.',
    'For the first seven days of the release, win 20 Quick or Ladder games with Primeape to unlock his Annihilape evolution skin. The mission accepts wins against players or bots. When the seven-day event ends, Annihilape moves to the Skin Shop for 750 unlock points.',
];

const changes = (primeape?.skills || []).map((skill) => ({
    groupKey: 'pokemon-release:primeape',
    groupName: 'Primeape',
    collapsible: true,
    changeType: 'new',
    characterId: 'primeape',
    characterName: 'Primeape',
    facePicture: primeape?.facePicture || '',
    skillId: skill.id,
    skillName: skill.name,
    skillimage: skill.skillimage,
    text: skill.skilldescription,
}));

changes.push({
    groupKey: 'pokemon-release:primeape',
    groupName: 'Primeape',
    collapsible: true,
    changeType: 'new',
    characterId: 'primeape',
    characterName: 'Primeape',
    facePicture: primeape?.facePicture || '',
    skillName: 'Annihilape Evolution Mission',
    text: 'For seven days, win 20 Quick or Ladder games with Primeape to unlock Annihilape. After the event, the skin costs 750 unlock points.',
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
        { characterId: 'primeape' },
        { characterId: 'nincada' },
        { characterId: 'dragapult' },
        ...previousPokemon.filter(
            (entry) => !['primeape', 'nincada', 'dragapult'].includes(entry.characterId)
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
        updatedBy: 'sync_pokemon_primeape_release',
    };
};

const normalizeEventWindow = (source = {}, now = new Date()) => {
    const fallbackStart = now instanceof Date ? now : new Date(now);
    const parsedStart = new Date(source?.startsAt || fallbackStart);
    const startsAt = Number.isNaN(parsedStart.getTime()) ? fallbackStart : parsedStart;
    const parsedEnd = new Date(source?.endsAt || startsAt.getTime() + EVENT_DURATION_MS);
    const endsAt =
        Number.isNaN(parsedEnd.getTime()) || parsedEnd.getTime() <= startsAt.getTime()
            ? new Date(startsAt.getTime() + EVENT_DURATION_MS)
            : parsedEnd;
    return { startsAt, endsAt };
};

async function syncPokemonPrimeapeRelease(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const storedWindow = await appState.findOne({ key: eventStateKey });
    const eventWindow = normalizeEventWindow(storedWindow || {}, now);
    await appState.updateOne(
        { key: eventStateKey },
        {
            $set: {
                key: eventStateKey,
                startsAt: eventWindow.startsAt,
                endsAt: eventWindow.endsAt,
                updatedAt: now,
                updatedBy: 'sync_pokemon_primeape_release',
            },
            $setOnInsert: { createdAt: now },
        },
        { upsert: true }
    );

    const newsUpdate = {
        $set: { ...newsPost, eventWindow, updatedAt: now },
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
    if (completed?.completed) {
        return { migrated: false, newsSynced: true, eventWindow };
    }
    await appState.updateOne(
        { key: migrationKey },
        {
            $set: {
                key: migrationKey,
                completed: true,
                completedAt: now,
                updatedBy: 'sync_pokemon_primeape_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true, eventWindow };
}

async function syncPokemonPrimeapeNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonPrimeapeRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(
            result.migrated
                ? 'Published the Primeape and Annihilape release.'
                : 'Refreshed the Primeape and Annihilape release.'
        );
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonPrimeapeNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    EVENT_DURATION_MS,
    buildLatestReleasesState,
    newsPost,
    normalizeEventWindow,
    syncPokemonPrimeapeNews,
    syncPokemonPrimeapeRelease,
};
