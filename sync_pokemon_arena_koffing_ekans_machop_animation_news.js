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

const skillShowcase = (characterId, skillId, text, changeType = 'new') => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType,
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const sectionNote = (sectionName, text, changeType = 'quality') => ({
    text,
    changeType,
    characterName: sectionName,
    facePicture: '',
    skillId: '',
    skillName: '',
    skillimage: '',
});

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.6',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.6 is a full portrait-animation rollout for Koffing, Weezing, Ekans, Arbok, Machop, and Machoke.',
        },
        {
            type: 'paragraph',
            text: 'Koffing and Weezing now feel much closer to their status-control identity in battle. Smog spreads a purple poison fog across the enemy team that thickens when more Smog stacks are already active, Smokescreen blankets allies in defensive grey smoke, Haze clears allies with pale white mist, and Self-Destruct now lands as a full-screen explosion with an even bigger blast once Koffing has evolved into Weezing.',
        },
        {
            type: 'paragraph',
            text: 'Ekans and Arbok now have a full venom-and-bite animation language. Poison Fang slams down with oversized purple fangs, Crunch bites harder with giant white jaws and now gets a custom CRUNCH portrait-shatter finisher on kill, Toxic hurls poison goo into bubbling affliction on the target portrait, and Shed Skin now visibly peels away the old layer while healing marks rise out of the portrait.',
        },
        {
            type: 'paragraph',
            text: 'Machop and Machoke also now read much more clearly in battle. Brick Break drops a dark karate chop onto the target portrait, Counter plants a heavy black hand straight into the middle of the target, Bulk Up now radiates a scaling power aura that intensifies with each stored stack, and Taunt literally calls enemies in with a white wagging finger.',
        },
        {
            type: 'paragraph',
            text: 'These new effects continue the Pokemon Arena portrait-FX pipeline, respect the reduced-motion and skill-animation toggles, and reuse live status state where possible so stack-based moves actually look stronger when their in-game pressure rises.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.6 is a full portrait-animation rollout for Koffing, Weezing, Ekans, Arbok, Machop, and Machoke.',
        'Koffing and Weezing now feel much closer to their status-control identity in battle. Smog spreads a purple poison fog across the enemy team that thickens when more Smog stacks are already active, Smokescreen blankets allies in defensive grey smoke, Haze clears allies with pale white mist, and Self-Destruct now lands as a full-screen explosion with an even bigger blast once Koffing has evolved into Weezing.',
        'Ekans and Arbok now have a full venom-and-bite animation language. Poison Fang slams down with oversized purple fangs, Crunch bites harder with giant white jaws and now gets a custom CRUNCH portrait-shatter finisher on kill, Toxic hurls poison goo into bubbling affliction on the target portrait, and Shed Skin now visibly peels away the old layer while healing marks rise out of the portrait.',
        'Machop and Machoke also now read much more clearly in battle. Brick Break drops a dark karate chop onto the target portrait, Counter plants a heavy black hand straight into the middle of the target, Bulk Up now radiates a scaling power aura that intensifies with each stored stack, and Taunt literally calls enemies in with a white wagging finger.',
        'These new effects continue the Pokemon Arena portrait-FX pipeline, respect the reduced-motion and skill-animation toggles, and reuse live status state where possible so stack-based moves actually look stronger when their in-game pressure rises.',
    ],
    changes: [
        skillShowcase('koffing', 'koffing-weezing-smog', 'Smog now spreads a full enemy-team poison fog and increases the cloud density when more Smog stacks are already active on the target portrait.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-smokescreen', 'Smokescreen now covers allies in drifting grey smoke instead of reading like a generic invisible buff.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-haze', 'Haze now rolls a pale clearing mist across Weezing\'s team so the cleanse and non-damaging protection read immediately.', 'update'),
        skillShowcase('koffing', 'koffing-weezing-self-destruct', 'Self-Destruct now detonates as a full-screen blast, with a larger Weezing explosion on the evolved version.', 'update'),
        skillShowcase('ekans', 'ekans-poison-fang', 'Poison Fang now bites down with giant purple fangs, and Arbok escalates the attack into a third bite.', 'new'),
        skillShowcase('ekans', 'ekans-toxic', 'Toxic now throws poison goo into a bubbling portrait affliction effect, and Arbok doubles up the application feel to match the extra poison stack.', 'new'),
        skillShowcase('ekans', 'ekans-shed-skin', 'Shed Skin now visibly peels a layer off the portrait while healing plus signs float upward.', 'new'),
        skillShowcase('ekans', 'arbok-crunch', 'Crunch now lands with giant white jaws, and kills caused through Crunch marks trigger a custom CRUNCH shatter finisher.', 'new'),
        skillShowcase('machop', 'machop-brick-break', 'Brick Break now drops a black karate hand onto the target portrait, and the impact exaggerates further when Bulk Up is stacked.', 'new'),
        skillShowcase('machop', 'machop-counter', 'Counter now plants a heavy black hand into the target portrait, with a stronger Machoke version and extra force when Bulk Up is loaded.', 'new'),
        skillShowcase('machop', 'machop-bulk-up', 'Bulk Up now radiates a live energy aura around Machop and Machoke that scales with the stored bonus instead of only flashing on cast.', 'new'),
        skillShowcase('machop', 'machop-taunt', 'Taunt now points at the target with a white wagging finger before curling back in a full come-at-me gesture.', 'new'),
        sectionNote('Animation Pipeline', 'Persistent poison bubbling and Bulk Up aura intensity now read directly from active status state, so those effects continue to scale after the initial cast.', 'quality'),
        sectionNote('Accessibility', 'All of these portrait effects still respect reduced-motion handling and the in-game skill-animation toggle.', 'quality'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaKoffingEkansMachopAnimationNews() {
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

        console.log('Synced Pokemon Arena Update V.3.2.6 Koffing/Ekans/Machop animation news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaKoffingEkansMachopAnimationNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
