const { MongoClient } = require('mongodb');
require('dotenv').config();

const wave = require('./pokemon-wave-2-live');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'naruto-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-wave-2-nine-character-launch';
const releaseVersion = 'pokemon-wave-2-nine-character-launch';

const launchIds = wave.map((character) => character.id);
const headlineReleases = ['dragonite', 'mewtwo', 'mew'];

const describeSkill = (skill) => {
    const cost = Array.isArray(skill?.energy) && skill.energy.length ? skill.energy.join(' + ') : 'No energy';
    return `${skill.name} — ${skill.skilldescription} Cost: ${cost}. Cooldown: ${Number(skill.cooldown) || 0}. Classes: ${(skill.classes || []).join(', ')}.`;
};

const changes = wave.flatMap((character) =>
    character.skills.map((skill) => ({
        groupKey: `pokemon-wave-2:${character.id}`,
        groupName: character.name,
        collapsible: true,
        characterId: character.id,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
        text: [
            describeSkill(skill),
            skill.evolvesTo ? ` Evolved version: ${describeSkill(skill.evolvesTo)}` : '',
        ].join(''),
    }))
);

const newsPost = {
    title: 'Nine New Pokemon Join Pokemon Arena!',
    arena: 'pokemon',
    blocks: [
        {
            type: 'paragraph',
            text: 'The new Pokemon Arena character wave is live: Clefairy, Jigglypuff, Beedrill, Articuno, Moltres, Zapdos, Mew, Mewtwo, and Dragonite have arrived with new unlock missions and complete skill art.',
        },
        {
            type: 'paragraph',
            text: 'This drop adds evolving supports, execution control, stacking affliction pressure, all three Legendary birds, permanent barrier and shield play, effect theft, and a durable taunt tank. Open Missions + Skins to begin their unlock paths.',
        },
        {
            type: 'paragraph',
            text: 'Every character and skill is shown below. Click a character group to inspect their portrait, skill pictures, costs, cooldowns, classes, and evolved upgrades.',
        },
    ],
    paragraphs: [
        'The new Pokemon Arena character wave is live: Clefairy, Jigglypuff, Beedrill, Articuno, Moltres, Zapdos, Mew, Mewtwo, and Dragonite have arrived with new unlock missions and complete skill art.',
        'This drop adds evolving supports, execution control, stacking affliction pressure, all three Legendary birds, permanent barrier and shield play, effect theft, and a durable taunt tank. Open Missions + Skins to begin their unlock paths.',
        'Every character and skill is shown below. Click a character group to inspect their portrait, skill pictures, costs, cooldowns, classes, and evolved upgrades.',
    ],
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
        state.releasesByArena?.comic || value.releasesByArena?.comic || state.comicReleases || value.comicReleases || []
    );
    const pokemon = headlineReleases.map((characterId) => ({ characterId }));
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        launchCharacterIds: launchIds,
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_wave_2_release',
    };
};

async function syncPokemonWave2Release(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = new Date();
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const newsUpdate = { ...newsPost, updatedAt: now };
    const update = { $set: newsUpdate, $setOnInsert: { createdAt: now } };
    if (options.refreshNewsCreatedAt) {
        update.$set.createdAt = now;
        delete update.$setOnInsert;
    }
    await newsPosts.updateOne({ title: newsPost.title }, update, { upsert: true });
    await newsPosts.deleteOne({ title: '12 New Pokemon Arrive Later Today!' });
    const existing = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne(
        { key: latestReleasesKey },
        { $set: buildLatestReleasesState(existing) },
        { upsert: true }
    );
    await appState.updateOne(
        { key: migrationKey },
        { $set: { key: migrationKey, completed: true, completedAt: now, updatedBy: 'sync_pokemon_wave_2_release' } },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true, launchCharacterIds: launchIds };
}

async function syncPokemonWave2News() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonWave2Release(client.db(dbName), { refreshNewsCreatedAt: true });
        console.log(`Published the ${result.launchCharacterIds.length}-character Pokemon Arena launch.`);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonWave2News().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = { buildLatestReleasesState, launchIds, newsPost, syncPokemonWave2News, syncPokemonWave2Release };
