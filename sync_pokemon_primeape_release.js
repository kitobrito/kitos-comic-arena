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
    'Five more Kanto evolution skins are now joining the Skin Shop for 750 unlock points each: Mega Venusaur, Gigantamax Venusaur, Mega Blastoise, Gigantamax Blastoise, and Gigantamax Charizard. Each begins battle with its normal Venusaur, Blastoise, or Charizard artwork, then changes to the selected Mega or Gigantamax portrait and skill art when the Pokemon evolves. The Mega Charizard X and Y skin remains the special 1,350-point skin.',
    'As an apology for the shutdown, database recovery, and repeated disruptions, every player account that existed when this update went live has received 250 Pokemon Arena unlock points. We also tightened database and stale-match recovery so an interrupted battle cannot keep an account stuck outside bot matchmaking.',
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

const primeapeSkinPreview = [
    {
        skillName: 'Primeape New-UI Render',
        skillimage: 'assets/images/selection-featured/PokemonArena/BIB/primeape.jpg.webp?v=transparent-renders-v1',
        text: 'Primeape enters the new selection UI with a clean transparent render.',
    },
    {
        skillName: 'Annihilape Evolution Render',
        skillimage: 'assets/images/selection-featured/PokemonArena/BIB/annihilape.jpg.webp?v=transparent-renders-v1',
        text: 'This is the Annihilape evolution render awarded by the seven-day Primeape mission.',
    },
    {
        skillName: 'Annihilape Portrait',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Annihilape-FP.jpg',
        text: 'Annihilape replaces Primeape\'s portrait after the evolution skin is equipped.',
    },
    {
        skillName: 'Annihilape Rock Smash',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Rock-Smash.jpg',
        text: 'The Annihilape skin includes custom Rock Smash artwork.',
    },
    {
        skillName: 'Annihilape Knock Off',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Knock-Off.jpg',
        text: 'The Annihilape skin includes custom Knock Off artwork.',
    },
    {
        skillName: 'Annihilape Rage Fist',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Rage-Fist.jpg',
        text: 'The Annihilape skin includes custom Rage Fist artwork.',
    },
    {
        skillName: 'Annihilape Close Combat',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Close-Combat.jpg',
        text: 'The Annihilape skin includes custom Close Combat artwork.',
    },
    {
        skillName: 'Annihilape Anger Point',
        skillimage: 'assets/images/PokemonArena/Primeape/skins/annihilape/Anger-Point.jpg',
        text: 'The Annihilape skin includes custom Anger Point artwork.',
    },
];

primeapeSkinPreview.forEach((preview) => {
    changes.push({
        groupKey: 'pokemon-skin-preview:annihilape',
        groupName: 'Primeape and Annihilape Skin Preview',
        collapsible: true,
        changeType: 'new',
        characterId: 'primeape',
        characterName: 'Primeape / Annihilape',
        facePicture: 'assets/images/PokemonArena/Primeape/skins/annihilape/Annihilape-FP.jpg',
        ...preview,
    });
});

[
    {
        characterId: 'bulbasaur',
        characterName: 'Mega Venusaur',
        skillimage: 'assets/images/PokemonArena/Bulbasaur/skins/mega/megafp.png',
        text: 'Starts as Venusaur, then changes to Mega Venusaur after evolving. Costs 750 unlock points.',
    },
    {
        characterId: 'bulbasaur',
        characterName: 'Gigantamax Venusaur',
        skillimage: 'assets/images/PokemonArena/Bulbasaur/skins/gigantamax/fp.png',
        text: 'Starts as Venusaur, then changes to Gigantamax Venusaur after evolving. Costs 750 unlock points.',
    },
    {
        characterId: 'squirtle',
        characterName: 'Mega Blastoise',
        skillimage: 'assets/images/PokemonArena/squirtle/skins/mega/megafp.png',
        text: 'Starts as Blastoise, then changes to Mega Blastoise after evolving. Costs 750 unlock points.',
    },
    {
        characterId: 'squirtle',
        characterName: 'Gigantamax Blastoise',
        skillimage: 'assets/images/PokemonArena/squirtle/skins/gigantamax/fp.png',
        text: 'Starts as Blastoise, then changes to Gigantamax Blastoise after evolving. Costs 750 unlock points.',
    },
    {
        characterId: 'charmander',
        characterName: 'Gigantamax Charizard',
        skillimage: 'assets/images/PokemonArena/Charmander/skins/gigantamax/fp.png',
        text: 'Starts as Charizard, then changes to Gigantamax Charizard after evolving. Costs 750 unlock points.',
    },
].forEach((preview) => {
    changes.push({
        groupKey: 'pokemon-skin-release:kanto-evolutions',
        groupName: 'Kanto Mega and Gigantamax Skins',
        collapsible: true,
        changeType: 'new',
        facePicture: preview.skillimage,
        skillName: '750-Point Evolution Skin',
        ...preview,
    });
});

changes.push({
    groupKey: 'pokemon-compensation:service-apology-2026-08-10',
    groupName: 'Player Compensation and Matchmaking Recovery',
    collapsible: true,
    changeType: 'new',
    characterName: 'Pokemon Arena',
    skillName: '250 Unlock Points Granted',
    text: 'Every existing player account received 250 Pokemon Arena unlock points. Stalled saved battles are also retired promptly so they cannot keep players out of bot matchmaking.',
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
