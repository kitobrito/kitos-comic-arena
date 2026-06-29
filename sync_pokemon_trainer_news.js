const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';

const getCharacter = (characterId) => {
    const character = characters.find(
        (entry) => entry && (entry.characterId === characterId || entry.id === characterId)
    );
    if (!character) {
        throw new Error(`Missing character: ${characterId}`);
    }
    return character;
};

const getSkill = (character, skillId) => {
    const skill = Array.isArray(character.skills)
        ? character.skills.find((entry) => entry && entry.id === skillId)
        : null;
    if (!skill) {
        throw new Error(`Missing skill ${skillId} for ${character.name}`);
    }
    return skill;
};

const skillShowcase = (characterId, skillId, text) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType: 'update',
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.4',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.4 adds Pokemon Trainer as a new tactical hybrid character built around capture pressure, item support, and instant evolution setups.',
        },
        {
            type: 'paragraph',
            text: 'Pokeball, Great Ball, Ultra Ball, and Master Ball let Pokemon Trainer lock enemies down, escalate catch pressure, and permanently steal a target\'s skill set for the rest of the match once a capture succeeds.',
        },
        {
            type: 'paragraph',
            text: 'Potion and X-Stats keep the team stable with direct healing, permanent damage boosts, and flat damage reduction, giving Pokemon Trainer a real support floor even before a capture lands.',
        },
        {
            type: 'paragraph',
            text: 'Rare Candy can also skip the usual battle-evolution grind for eligible Pokemon and then turns into Revive, which makes Pokemon Trainer a strong partner for evolution-focused teams that want tempo without waiting on normal conditions.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.4 adds Pokemon Trainer as a new tactical hybrid character built around capture pressure, item support, and instant evolution setups.',
        'Pokeball, Great Ball, Ultra Ball, and Master Ball let Pokemon Trainer lock enemies down, escalate catch pressure, and permanently steal a target\'s skill set for the rest of the match once a capture succeeds.',
        'Potion and X-Stats keep the team stable with direct healing, permanent damage boosts, and flat damage reduction, giving Pokemon Trainer a real support floor even before a capture lands.',
        'Rare Candy can also skip the usual battle-evolution grind for eligible Pokemon and then turns into Revive, which makes Pokemon Trainer a strong partner for evolution-focused teams that want tempo without waiting on normal conditions.',
    ],
    changes: [
        skillShowcase('pokemon-trainer', 'pokemon-trainer-pokeball', 'Pokeball starts the capture ladder by stunning and sealing an enemy for 1 turn, then fully catches them if they are already low enough.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-great-ball', 'Great Ball raises the capture threshold and extends the lockdown window, making mid-fight catches much more realistic.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-ultra-ball', 'Ultra Ball pushes the catch range even higher and can freeze a target out of the fight for 3 turns when it does not secure the capture.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-master-ball', 'Master Ball is the guaranteed endgame capture option: it cannot be countered or reflected and permanently steals one enemy out of the battle.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-x-stats', 'X-Stats permanently stacks +5 non-affliction damage and 5 damage reduction onto an ally, letting Pokemon Trainer scale a carry over time.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-rare-candy', 'Rare Candy force-evolves eligible Pokemon immediately, adds permanent destructible defense, and then upgrades into Revive for extra team recovery.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = Array.isArray(state.releasesByArena?.comic)
        ? state.releasesByArena.comic
        : Array.isArray(state.comicReleases)
            ? state.comicReleases
            : Array.isArray(state.releases)
                ? state.releases
                : [];
    const currentPokemon = Array.isArray(state.releasesByArena?.pokemon)
        ? state.releasesByArena.pokemon
        : Array.isArray(state.pokemonReleases)
            ? state.pokemonReleases
            : [];
    const nextPokemonIds = [
        'pokemon-trainer',
        ...currentPokemon
            .map((entry) => (typeof entry?.characterId === 'string' ? entry.characterId : ''))
            .filter((characterId) => characterId && characterId !== 'pokemon-trainer'),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-4-trainer',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_trainer_news',
    };
};

async function syncPokemonTrainerNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const appState = db.collection(appStateCollectionName);

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        const latestState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            { $set: buildLatestReleasesState(latestState) },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.4 trainer news and latest releases.');
    } finally {
        await client.close();
    }
}

syncPokemonTrainerNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
