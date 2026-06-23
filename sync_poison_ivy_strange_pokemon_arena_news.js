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
        changeType: 'new',
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();
const existingLatestPokemon = ['koffing', 'butterfree', 'squirtle'];

const newsPost = {
    title: 'Comic Arena Update V.3.1.4',
    blocks: [
        {
            type: 'paragraph',
            text: 'Comic Arena Update V.3.1.4 adds Koffing to Pokemon Arena, bringing a full gas-based control kit that spreads poison pressure, blocks enemy setup, and explodes into Weezing once every move has been used.',
        },
        {
            type: 'paragraph',
            text: 'Doctor Strange remains fully rebuilt around the new redesign template, with a mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        },
        {
            type: 'paragraph',
            text: 'On top of the character work, Pokemon Arena keeps growing as a full second arena with its own flow, selection screens, and battle presentation.',
        },
        {
            type: 'paragraph',
            text: 'The latest Pokemon releases panel now features Koffing alongside Butterfree and Squirtle, so the roster announcement section stays aligned with the arena\'s newest additions.',
        },
        {
            type: 'paragraph',
            text: 'Below is a full skill-by-skill rundown for Koffing and Weezing, including the improved evolution form and the exact way Poison Gas changes the pace of a fight.',
        },
    ],
    paragraphs: [
        'Comic Arena Update V.3.1.4 adds Koffing to Pokemon Arena, bringing a full gas-based control kit that spreads poison pressure, blocks enemy setup, and explodes into Weezing once every move has been used.',
        'Doctor Strange remains fully rebuilt around the new redesign template, with a mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        'On top of the character work, Pokemon Arena keeps growing as a full second arena with its own flow, selection screens, and battle presentation.',
        'The latest Pokemon releases panel now features Koffing alongside Butterfree and Squirtle, so the roster announcement section stays aligned with the arena\'s newest additions.',
        'Below is a full skill-by-skill rundown for Koffing and Weezing, including the improved evolution form and the exact way Poison Gas changes the pace of a fight.',
    ],
    changes: [
        skillShowcase(
            'koffing',
            'koffing-smog',
            'Smog costs 1 Bloodline and deals 5 affliction damage to all enemies each turn for 4 turns. The effect stacks, so Koffing can keep layering the cloud as long as the fight goes on.'
        ),
        skillShowcase(
            'koffing',
            'koffing-haze',
            'Haze costs 1 Genjutsu and lets Koffing\'s team ignore all new enemy non-damaging effects for 1 turn, which is the clean anti-setup button in his kit.'
        ),
        skillShowcase(
            'koffing',
            'koffing-self-destruct',
            'Self-Destruct costs 1 Random, deals 20 affliction damage to all enemies, and costs Koffing 20 HP. If it defeats him, the enemy team takes 5 extra affliction damage on top of the blast.'
        ),
        skillShowcase(
            'koffing',
            'koffing-smokescreen',
            'Smokescreen costs 1 Random and gives Koffing\'s team 20% evasion for 2 turns, helping the squad slip past incoming attacks while the gas keeps spreading.'
        ),
        skillShowcase(
            'koffing',
            'koffing-passive-poison-gas',
            'Passive: Poison Gas gives Koffing a 20% chance to add a random Gas Effect for 1 turn whenever he damages an enemy: cooldown paralysis, helpful-skill lock, 50% damage reduction, or a delay until their next turn.'
        ),
        skillShowcase(
            'koffing',
            'koffing-passive-evolution-weezing',
            'Evolution - Weezing triggers after Koffing has used each of his skills at least once, then swaps him into Weezing and upgrades the whole kit.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-passive-poison-gas',
            'Weezing\'s Passive: Poison Gas jumps to a 40% chance and keeps the same four Gas Effects, making every hit much more oppressive once the evolution lands.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-smog',
            'Weezing\'s Smog keeps the 5 affliction damage cloud but swaps to 1 Random cost, letting the evolved form keep pressure up more easily.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-haze',
            'Weezing\'s Haze extends the anti-setup shield to 2 turns, so the evolved form can stall enemy plans for longer.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-self-destruct',
            'Weezing\'s Self-Destruct costs 2 Random, deals 30 affliction damage to all enemies, and still punishes a self-KO with the extra 5 affliction damage burst.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-smokescreen',
            'Weezing\'s Smokescreen increases the team evasion to 25% for 3 turns, turning the evolved form into a much slipperier support piece.'
        ),
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
    const nextPokemon = [
        ...existingLatestPokemon,
        ...currentPokemon
            .map((entry) => (entry && typeof entry.characterId === 'string' ? entry.characterId : ''))
            .filter((characterId) => characterId && !existingLatestPokemon.includes(characterId)),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: 'update-v3-1-4-koffing',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemon.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemon.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_poison_ivy_strange_pokemon_arena_news',
    };
};

async function syncPoisonIvyAndStrangeNews() {
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

        console.log('Synced Comic Arena Update V.3.1.4 news and Pokemon latest releases.');
    } finally {
        await client.close();
    }
}

syncPoisonIvyAndStrangeNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
