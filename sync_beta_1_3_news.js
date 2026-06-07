const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const characterOverridesKey = 'character_overrides';
const missionCatalogKey = 'missions';

const starWarsIds = ['darth-vader', 'boba-fett', 'obi-wan-kenobi'];
const starWarsCharacters = starWarsIds.map((characterId) => {
    const character = characters.find((entry) => entry && entry.characterId === characterId);
    if (!character) {
        throw new Error(`Missing Star Wars character: ${characterId}`);
    }
    return character;
});

const getCharacter = (characterId) => {
    const character = starWarsCharacters.find((entry) => entry.characterId === characterId);
    if (!character) {
        throw new Error(`Missing Star Wars character: ${characterId}`);
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

const disabledPve = {
    enabled: false,
    buttonLabel: 'Start Fight',
    botName: 'Mission Bot',
    botTeamCharacterId: '',
    botTeamSize: 3,
    backgroundImage: '',
    playerTeamCharacterIds: [],
};

const starWarsMissions = [
    {
        missionId: 'darth-vader',
        title: 'Dark Lord of the Sith',
        level_requirement: 18,
        rank: '18',
        reward_character: 'darth-vader',
        reward_character_name: 'Darth Vader',
        reward: 'Unlock Darth Vader',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/darthvadermission.jpeg',
        imageAlt: 'Darth Vader mission artwork',
        characterName: 'Darth Vader',
        portrait: 'assets/images/darthvaderfp.webp',
        portraitAlt: 'Darth Vader portrait',
        requirements: [],
        goals: [
            { type: 'reach_rank', rank: 18 },
            { type: 'win_matches', character_id: 'the-joker', character_name: 'The Joker', wins: 8 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 29,
    },
    {
        missionId: 'boba-fett',
        title: 'Dead or Alive',
        level_requirement: 10,
        rank: '10',
        reward_character: 'boba-fett',
        reward_character_name: 'Boba Fett',
        reward: 'Unlock Boba Fett',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 2 },
        image: 'assets/images/bobafettmission.avif',
        imageAlt: 'Boba Fett mission artwork',
        characterName: 'Boba Fett',
        portrait: 'assets/images/bobafettfp.webp',
        portraitAlt: 'Boba Fett portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 4 },
            { type: 'win_streak', character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 30,
    },
    {
        missionId: 'obi-wan-kenobi',
        title: 'The Negotiator',
        level_requirement: 10,
        rank: '10',
        reward_character: 'obi-wan-kenobi',
        reward_character_name: 'Obi-Wan Kenobi',
        reward: 'Unlock Obi-Wan Kenobi',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'wonder-woman', character_name: 'Wonder Woman', wins: 2 },
        image: 'assets/images/obiwankenobimission.jpg',
        imageAlt: 'Obi-Wan Kenobi mission artwork',
        characterName: 'Obi-Wan Kenobi',
        portrait: 'assets/images/obiwankenobifp.webp',
        portraitAlt: 'Obi-Wan Kenobi portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'wonder-woman', character_name: 'Wonder Woman', wins: 4 },
            { type: 'win_streak', character_id: 'wonder-woman', character_name: 'Wonder Woman', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 31,
    },
];

const now = new Date();
const newsPost = {
    title: 'Comic-Arena Beta V 1.3',
    blocks: [
        {
            type: 'paragraph',
            text: 'Comic-Arena Beta V 1.3 continues the Star Wars rollout with a balance pass focused on Darth Vader, Ghost Rider, Aquaman, Iron Man, Rex Splode, Superman, and Green Goblin.',
        },
        {
            type: 'paragraph',
            text: 'Darth Vader now hits harder with Saber Strike-Down, Force Choke sets up a cheaper follow-up, and Ghost Rider\'s Penance Stare now uses a true silence effect instead of locking out harmful skills entirely.',
        },
        {
            type: 'paragraph',
            text: 'Aquaman\'s Tidal Wave has been rebuilt into a 2-turn pressure tool, Rex Splode\'s baton now splashes two different extra enemies, and Iron Man\'s Armor Upgrade is now a permanent self-upgrade that immediately Overcharges him.',
        },
        {
            type: 'paragraph',
            text: 'This pass also trims Superman\'s passive durability, raises Green Goblin\'s Mad Bomber proc rate, and updates the in-game news summary to match the new numbers and effects.',
        },
    ],
    paragraphs: [
        'Comic-Arena Beta V 1.3 continues the Star Wars rollout with a balance pass focused on Darth Vader, Ghost Rider, Aquaman, Iron Man, Rex Splode, Superman, and Green Goblin.',
        'Darth Vader now hits harder with Saber Strike-Down, Force Choke sets up a cheaper follow-up, and Ghost Rider\'s Penance Stare now uses a true silence effect instead of locking out harmful skills entirely.',
        'Aquaman\'s Tidal Wave has been rebuilt into a 2-turn pressure tool, Rex Splode\'s baton now splashes two different extra enemies, and Iron Man\'s Armor Upgrade is now a permanent self-upgrade that immediately Overcharges him.',
        'This pass also trims Superman\'s passive durability, raises Green Goblin\'s Mad Bomber proc rate, and updates the in-game news summary to match the new numbers and effects.',
    ],
    changes: [
        skillShowcase('darth-vader', 'darth-vader-saber-strike-down', 'Saber Strike-Down now deals 40 bleed damage and still applies permanent Health Cap pressure.'),
        skillShowcase('darth-vader', 'darth-vader-force-choke', 'Force Choke now makes Saber Strike-Down cost 1 bloodline and 1 random energy on the next turn.'),
        {
            text: 'Ghost Rider: Penance Stare now applies a silence effect instead of preventing harmful-skill use entirely, while still reducing damage and increasing affliction damage taken.',
            changeType: 'balance',
        },
        {
            text: 'Superman: Passive The Man of Steel now grants 8 unpierceable damage reduction instead of 12.',
            changeType: 'balance',
        },
        {
            text: 'Aquaman: Trident Strike now deals 24 damage, Tidal Wave now applies 15 damage per turn plus cost and cooldown pressure for 2 turns, and both Trident Strike and Drown now add Sea Sharks to Tidal Wave targets.',
            changeType: 'balance',
        },
        {
            text: 'Rex Splode: Explosive Baton now splashes 10 affliction damage to one different enemy and 5 affliction damage to another different enemy.',
            changeType: 'balance',
        },
        {
            text: 'Iron Man: Armor Upgrade is now a self-only permanent suit upgrade that grants 25% damage reduction, swaps to Proton Cannon and Energy Burst, and immediately casts Overcharge.',
            changeType: 'balance',
        },
        {
            text: 'Iron Man: Repulsor Blast now costs 2 random energy, deals 18 damage per turn to the main target and 8 damage per turn to other enemies for 2 turns, while Overcharge converts it into an immediate affliction burst with a stun on the main target.',
            changeType: 'balance',
        },
        {
            text: 'Green Goblin: Passive Mad Bomber now has a 25% chance to plant a Bomb when Green Goblin uses a skill.',
            changeType: 'balance',
        },
    ],
    author: 'system',
    createdAt: now,
    updatedAt: now,
};

const mergeByMissionId = (currentMissions = []) => {
    const replacements = new Map(starWarsMissions.map((mission) => [mission.missionId, mission]));
    replacements.set('ghost-rider', { special_pve: { ...disabledPve } });
    const seen = new Set();
    const merged = (Array.isArray(currentMissions) ? currentMissions : []).map((mission) => {
        if (!mission || !mission.missionId) return mission;
        const replacement = replacements.get(mission.missionId);
        if (!replacement) return mission;
        seen.add(mission.missionId);
        return replacement.missionId ? replacement : { ...mission, ...replacement };
    });
    starWarsMissions.forEach((mission) => {
        if (!seen.has(mission.missionId)) {
            merged.push(mission);
        }
    });
    return merged;
};

async function syncBeta13News() {
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

        await appState.updateOne(
            { key: latestReleasesKey },
            {
                $set: {
                    key: latestReleasesKey,
                    version: 2,
                    releases: starWarsIds.map((characterId) => ({ characterId })),
                    updatedAt: new Date(),
                    updatedBy: 'sync_beta_1_3_news',
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
            ...currentOverrides.filter((entry) => !starWarsIds.includes(entry && entry.characterId)),
            ...starWarsCharacters.map((character) => ({
                characterId: character.characterId,
                character,
                updatedAt: new Date(),
                updatedBy: 'sync_beta_1_3_news',
            })),
        ];

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: new Date(),
                    updatedBy: 'sync_beta_1_3_news',
                },
            },
            { upsert: true }
        );

        const missionState = await appState.findOne({ key: missionCatalogKey });
        const currentMissions = Array.isArray(missionState && missionState.missions)
            ? missionState.missions
            : [];
        await appState.updateOne(
            { key: missionCatalogKey },
            {
                $set: {
                    key: missionCatalogKey,
                    missions: mergeByMissionId(currentMissions),
                    updatedAt: new Date(),
                    updatedBy: 'sync_beta_1_3_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Beta V 1.3 news, Star Wars releases, overrides, and missions.');
    } finally {
        await client.close();
    }
}

syncBeta13News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
