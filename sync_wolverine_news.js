const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const characterOverridesKey = 'character_overrides';

const wolverine = characters.find((character) => character && character.characterId === 'wolverine');

if (!wolverine) {
    throw new Error('Wolverine is missing from characters.js.');
}

const getSkill = (skillId) => {
    const skill = Array.isArray(wolverine.skills)
        ? wolverine.skills.find((entry) => entry && entry.id === skillId)
        : null;
    if (!skill) {
        throw new Error(`Wolverine skill is missing: ${skillId}`);
    }
    return skill;
};

const buildSkillShowcase = (skillId, text, changeType = '') => {
    const skill = getSkill(skillId);
    return {
        text,
        changeType,
        characterId: wolverine.characterId,
        characterName: wolverine.name,
        facePicture: wolverine.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();
const wolverineParagraphs = [
    'Wolverine has joined the Comic Arena roster as a regenerating bleed bruiser who keeps pressure on a target with permanent stacking wounds, self-healing, and rage-fueled damage delay.',
    'His kit rewards staying in the fight: Adamantium Skeleton makes him harder to bring down, Healing Factor stacks over time, Hot Claws turns his claw strings into affliction pressure, and Berserker Rage now gives him a Healing Factor stack when activated.',
];
const wolverineChanges = [
    buildSkillShowcase(
        'wolverine-adamantium-claws',
        'Adamantium Claws slashes one enemy twice for 10 piercing damage each hit and applies permanent stacking bleed. During Berserker Rage, it hits one extra time.',
        'new'
    ),
    buildSkillShowcase(
        'wolverine-hot-claws',
        'Hot Claws empowers Adamantium Claws for 3 turns, adding 5 affliction damage to each claw hit and making the target ignore healing effects for 1 turn.',
        'new'
    ),
    buildSkillShowcase(
        'wolverine-berserker-rage',
        'Berserker Rage lets Wolverine ignore enemy stun effects, delays enemy damage until the effect ends, makes Adamantium Claws hit an extra time, and now grants one stack of Healing Factor when activated.',
        'buff'
    ),
    buildSkillShowcase(
        'wolverine-healing-factor',
        'Healing Factor heals Wolverine for 10 HP for 3 turns. The effect stacks, including the stack gained from Berserker Rage.',
        'new'
    ),
    buildSkillShowcase(
        'wolverine-passive-adamantium-skeleton',
        'Passive: Adamantium Skeleton gives Wolverine 5 permanent unpierceable damage reduction from the start of the match.',
        'new'
    ),
];
const fallbackPost = {
    title: 'Wolverine Joins Comic Arena',
    blocks: wolverineParagraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs: wolverineParagraphs,
    changes: [
        ...wolverineChanges,
    ],
    author: 'system',
    createdAt: now,
    updatedAt: now,
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const appendWolverineToCurrentPost = (currentPost) => {
    const existingBlocks = asArray(currentPost.blocks);
    const existingParagraphs = asArray(currentPost.paragraphs)
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
    const blockTexts = new Set(
        existingBlocks
            .map((entry) => (entry && typeof entry.text === 'string' ? entry.text.trim() : ''))
            .filter(Boolean)
    );
    const paragraphTexts = new Set(existingParagraphs);
    const blocksToAdd = wolverineParagraphs
        .filter((text) => !blockTexts.has(text))
        .map((text) => ({ type: 'paragraph', text }));
    const paragraphsToAdd = wolverineParagraphs.filter((text) => !paragraphTexts.has(text));

    return {
        title: currentPost.title || fallbackPost.title,
        blocks: blocksToAdd.length
            ? [...existingBlocks, { type: 'divider', text: '' }, ...blocksToAdd]
            : existingBlocks,
        paragraphs: paragraphsToAdd.length
            ? [...existingParagraphs, ...paragraphsToAdd]
            : existingParagraphs,
        changes: [
            ...asArray(currentPost.changes).filter((entry) => entry && entry.characterId !== wolverine.characterId),
            ...wolverineChanges,
        ],
        author: currentPost.author || 'system',
        createdAt: currentPost.createdAt || now,
        updatedAt: now,
    };
};

async function syncWolverineNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const appState = db.collection(appStateCollectionName);

        const currentPost = await newsPosts.findOne({}, { sort: { createdAt: -1 } });
        if (currentPost && currentPost._id) {
            await newsPosts.updateOne(
                { _id: currentPost._id },
                {
                    $set: appendWolverineToCurrentPost(currentPost),
                }
            );
        } else {
            await newsPosts.insertOne(fallbackPost);
        }

        const latestState = await appState.findOne({ key: latestReleasesKey });
        const currentReleases = Array.isArray(latestState && latestState.releases)
            ? latestState.releases
            : [];
        const nextReleaseIds = [
            wolverine.characterId,
            ...currentReleases
                .map((entry) => (entry && typeof entry.characterId === 'string' ? entry.characterId : ''))
                .filter((characterId) => characterId && characterId !== wolverine.characterId),
        ].slice(0, 3);

        await appState.updateOne(
            { key: latestReleasesKey },
            {
                $set: {
                    key: latestReleasesKey,
                    version: 1,
                    releases: nextReleaseIds.map((characterId) => ({ characterId })),
                    updatedAt: new Date(),
                    updatedBy: 'sync_wolverine_news',
                },
            },
            { upsert: true }
        );

        const overrideState = await appState.findOne({ key: characterOverridesKey });
        const currentOverrides = Array.isArray(overrideState && overrideState.overrides)
            ? overrideState.overrides
            : overrideState && overrideState.value && Array.isArray(overrideState.value.overrides)
                ? overrideState.value.overrides
                : [];
        const nextOverrides = [
            ...currentOverrides.filter((entry) => entry && entry.characterId !== wolverine.characterId),
            {
                characterId: wolverine.characterId,
                character: wolverine,
                updatedAt: new Date(),
                updatedBy: 'sync_wolverine_news',
            },
        ];

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: new Date(),
                    updatedBy: 'sync_wolverine_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Wolverine into the current news post, latest releases, and character overrides.');
    } finally {
        await client.close();
    }
}

syncWolverineNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
