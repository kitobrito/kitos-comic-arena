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
    title: 'Comic Arena Update V.3.1.3',
    blocks: [
        {
            type: 'paragraph',
            text: 'Comic Arena Update V.3.1.3 adds Poison Ivy to the roster with her plant-heavy control kit, her new mission art, and the kind of battlefield pressure that keeps teams rooted in place.',
        },
        {
            type: 'paragraph',
            text: 'Doctor Strange has also been rebuilt from the ground up around the new redesign template, with a fresh mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        },
        {
            type: 'paragraph',
            text: 'On top of the character work, Pokemon Arena is now part of the game too, with its own arena flow, selection screens, and battle presentation.',
        },
    ],
    paragraphs: [
        'Comic Arena Update V.3.1.3 adds Poison Ivy to the roster with her plant-heavy control kit, her new mission art, and the kind of battlefield pressure that keeps teams rooted in place.',
        'Doctor Strange has also been rebuilt from the ground up around the new redesign template, with a fresh mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        'On top of the character work, Pokemon Arena is now part of the game too, with its own arena flow, selection screens, and battle presentation.',
    ],
    changes: [
        skillShowcase(
            'poison-ivy',
            'poison-ivy-vine-forest-growth',
            'Vine Forest Growth now opens Ivy\'s control loop, granting destructible defense to her team, dealing damage over time to enemies, and swapping her other plant skills into stronger forms.'
        ),
        skillShowcase(
            'poison-ivy',
            'poison-ivy-carnivorous-plant',
            'Carnivorous Plant now steals energy while Vine Forest Growth is active, turning Ivy into a nasty control and resource-drain threat.'
        ),
        skillShowcase(
            'doctor-strange',
            'doctor-strange-eldritch-manifestation',
            'Eldritch Manifestation now scales off the damage the target dealt this turn, stuns them, and sets Doctor Strange up for the Book of the Vishanti.'
        ),
        skillShowcase(
            'doctor-strange',
            'doctor-strange-channel-zom',
            'Book of the Vishanti now builds toward Astral Form and eventually swaps into Zom\'s Wrath after enough uses.'
        ),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
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

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        console.log('Synced Comic Arena Update V.3.1.3 news.');
    } finally {
        await client.close();
    }
}

syncPoisonIvyAndStrangeNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
