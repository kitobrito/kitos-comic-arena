const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-community-nincada-v1';
const releaseVersion = 'pokemon-community-nincada-v1';
const newsTitle = 'Nincada, Ninjask, and Shedinja Complete the Community Roster';
const nincada = characters.find((character) => character?.id === 'nincada');
const battleForms = Array.isArray(nincada?.battleForms) ? nincada.battleForms : [];

const paragraphs = [
    'Nincada, the final character in this Pokemon Arena community-character series, joins the roster as a design by 2ndstatus. This Bug- and Ground-type evolution specialist can create two entirely different battle forms from a single Evolve skill.',
    'After dealing 50 total damage, Nincada can use Evolve once. At 50 HP or more, it becomes Ninjask. If an ally has fainted, the lowest-position fainted ally also returns as Shedinja with exactly 1 maximum HP. Both transformations can happen during the same cast. Pokemon Trainer can force the Ninjask evolution with Rare Candy, including when Ditto has copied Nincada.',
    'Ninjask is an evasive Bug- and Flying-type assassin. Double Team unlocks alternate effects for its attacks, while Speed Boost permanently adds 5% evasion after each Ninjask turn, stacking up to five times.',
    'Shedinja is a 1-HP Bug- and Ghost-type specialist. Wonder Guard can completely stop three eligible enemy skills, no more than once per turn, while Bug Buzz, Feint Attack, Solar Beam, and Hex reward careful timing and team pressure.',
    'This release completes the planned community-character batch. Thank you to 2ndstatus, Moses, Cheshire, KiruKasai, fghop, and everyone who contributed designs and feedback.',
];

const buildChangeEntries = (character, groupName) =>
    (Array.isArray(character?.skills) ? character.skills : []).map((skill) => ({
        groupKey: `pokemon-community:${String(groupName || '').toLowerCase()}`,
        groupName,
        collapsible: true,
        changeType: 'new',
        characterId: character?.id || 'nincada',
        characterName: groupName,
        facePicture: character?.facePicture || nincada?.facePicture || '',
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
        text: skill.skilldescription,
    }));

const changes = [
    ...buildChangeEntries(nincada, 'Nincada'),
    ...battleForms.flatMap((form) => buildChangeEntries(form, form.name || form.id)),
];

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
        { characterId: 'nincada' },
        { characterId: 'dragapult' },
        { characterId: 'scraggy' },
        ...previousPokemon.filter(
            (entry) => !['nincada', 'dragapult', 'scraggy'].includes(entry.characterId)
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
        updatedBy: 'sync_pokemon_nincada_release',
    };
};

async function syncPokemonNincadaRelease(db, options = {}) {
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
                updatedBy: 'sync_pokemon_nincada_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonNincadaNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonNincadaRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(
            result.migrated
                ? 'Published the Nincada community-character release.'
                : 'Refreshed the Nincada community-character release.'
        );
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonNincadaNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    syncPokemonNincadaNews,
    syncPokemonNincadaRelease,
};
