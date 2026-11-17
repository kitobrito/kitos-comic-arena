const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

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

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.2',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.2 expands the profile page so Pokemon Arena now has its own ladder panel, recent ladder match list, and Pokemon-only top player leaderboards right alongside the Comic Arena stats.',
        },
        {
            type: 'paragraph',
            text: 'Evolved Pokemon also now project character-specific portrait auras during battle. Kadabra channels psychic rings, Ivysaur swirls leaves, Blissey blooms healing marks, Charmeleon burns with fire, Haunter drifts with ghosts, Weezing leaks poison gas, Pidgeotto spins tornados, Wartortle floats bubbles, and Golbat circles with bats.',
        },
        {
            type: 'paragraph',
            text: 'This patch also starts the first custom skill-animation batch for Pokemon Arena. The opening ten include Solar Beam, Thunder, Flamethrower, Water Gun, Leech Seed, Supersonic, Future Sight, X-Cutter, Pokemon Center Healing, and Smog.',
        },
        {
            type: 'paragraph',
            text: 'These effects were built to stay portrait-focused, respect the existing skill-animation toggles, and turn off cleanly for reduced-motion players.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.2 expands the profile page so Pokemon Arena now has its own ladder panel, recent ladder match list, and Pokemon-only top player leaderboards right alongside the Comic Arena stats.',
        'Evolved Pokemon also now project character-specific portrait auras during battle. Kadabra channels psychic rings, Ivysaur swirls leaves, Blissey blooms healing marks, Charmeleon burns with fire, Haunter drifts with ghosts, Weezing leaks poison gas, Pidgeotto spins tornados, Wartortle floats bubbles, and Golbat circles with bats.',
        'This patch also starts the first custom skill-animation batch for Pokemon Arena. The opening ten include Solar Beam, Thunder, Flamethrower, Water Gun, Leech Seed, Supersonic, Future Sight, X-Cutter, Pokemon Center Healing, and Smog.',
        'These effects were built to stay portrait-focused, respect the existing skill-animation toggles, and turn off cleanly for reduced-motion players.',
    ],
    changes: [
        skillShowcase('bulbasaur', 'ivysaur-solar-beam', 'Solar Beam now charges on Ivysaur, fires a bright beam across the field, and detonates in a clean impact flash on the target.'),
        skillShowcase('pikachu', 'pikachu-thunder', 'Thunder now crashes down as a vertical lightning strike with electric bolts and a ground-ring impact.'),
        skillShowcase('charmander', 'charmander-charmeleon-flamethrower', 'Flamethrower now pours a moving fire stream into a burning impact aura on the enemy portrait.'),
        skillShowcase('squirtle', 'wartortle-hydro-pump', 'Hydro Pump now blasts a water stream forward and bursts into splashing droplets on contact.'),
        skillShowcase('zubat', 'golbat-supersonic', 'Supersonic now ripples outward in layered sound rings to sell the confusion pressure.'),
        skillShowcase('chansey', 'blissey-pokemon-center-healing', 'Pokemon Center Healing now radiates healing waves, floating plus signs, and a heart pulse over the healed portrait.'),
        skillShowcase('koffing', 'koffing-weezing-smog', 'Smog now fills the target portrait area with drifting poison clouds instead of a generic hit flash.'),
        skillShowcase('scyther', 'scyther-x-cutter', 'X-Cutter now carves a glowing green X slash across the enemy portrait with a sharp center spark.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaProfileAnimationNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.2 profile and animation news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaProfileAnimationNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
