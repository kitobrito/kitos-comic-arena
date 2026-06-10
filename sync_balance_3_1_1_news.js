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
const latestReleasesVersion = 'balance-v3-1-1';

const releaseIds = ['grand-master-yoda', 'darth-sidious', 'general-grievous'];

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

const disabledPve = {
    enabled: false,
    buttonLabel: 'Start Fight',
    botName: 'Mission Bot',
    botTeamCharacterId: '',
    botTeamSize: 3,
    backgroundImage: '',
    playerTeamCharacterIds: [],
};

const releaseMissions = [
    {
        missionId: 'grand-master-yoda',
        title: 'Grand Master of the Force',
        level_requirement: 10,
        rank: '10',
        reward_character: 'grand-master-yoda',
        reward_character_name: 'Grand Master Yoda',
        reward: 'Unlock Grand Master Yoda',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'obi-wan-kenobi', character_name: 'Obi-Wan Kenobi', wins: 2 },
        image: 'assets/images/yodamission.jpg',
        imageAlt: 'Grand Master Yoda mission artwork',
        characterName: 'Grand Master Yoda',
        portrait: 'assets/images/YodaFP.webp',
        portraitAlt: 'Grand Master Yoda portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'obi-wan-kenobi', character_name: 'Obi-Wan Kenobi', wins: 4 },
            { type: 'win_streak', character_id: 'obi-wan-kenobi', character_name: 'Obi-Wan Kenobi', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 32,
    },
    {
        missionId: 'darth-sidious',
        title: 'Rule the Galaxy',
        level_requirement: 18,
        rank: '18',
        reward_character: 'darth-sidious',
        reward_character_name: 'Darth Sidious',
        reward: 'Unlock Darth Sidious',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'darth-vader', character_name: 'Darth Vader', wins: 2 },
        image: 'assets/images/darthsidiousmission.avif',
        imageAlt: 'Darth Sidious mission artwork',
        characterName: 'Darth Sidious',
        portrait: 'assets/images/darthsidiousfp.png',
        portraitAlt: 'Darth Sidious portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'darth-vader', character_name: 'Darth Vader', wins: 4 },
            { type: 'win_streak', character_id: 'darth-vader', character_name: 'Darth Vader', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 33,
    },
    {
        missionId: 'general-grievous',
        title: 'Trophy Hunter',
        level_requirement: 10,
        rank: '10',
        reward_character: 'general-grievous',
        reward_character_name: 'General Grievous',
        reward: 'Unlock General Grievous',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'boba-fett', character_name: 'Boba Fett', wins: 2 },
        image: 'assets/images/generalgrievousmission.jpeg',
        imageAlt: 'General Grievous mission artwork',
        characterName: 'General Grievous',
        portrait: 'assets/images/generalgrievousfp.png',
        portraitAlt: 'General Grievous portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'boba-fett', character_name: 'Boba Fett', wins: 4 },
            { type: 'win_streak', character_id: 'boba-fett', character_name: 'Boba Fett', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 34,
    },
];

const mergeByMissionId = (currentMissions = []) => {
    const replacements = new Map(releaseMissions.map((mission) => [mission.missionId, mission]));
    const seen = new Set();
    const merged = (Array.isArray(currentMissions) ? currentMissions : []).map((mission) => {
        if (!mission || !mission.missionId) return mission;
        const replacement = replacements.get(mission.missionId);
        if (!replacement) return mission;
        seen.add(mission.missionId);
        return replacement;
    });
    releaseMissions.forEach((mission) => {
        if (!seen.has(mission.missionId)) {
            merged.push(mission);
        }
    });
    return merged.sort((a, b) => (Number(a?.sortOrder) || 999) - (Number(b?.sortOrder) || 999));
};

const paragraphs = [
    'Comic Arena Balance v 3.1.1 expands the Star Wars roster with three new characters: Grand Master Yoda, Darth Sidious, and General Grievous.',
    'Yoda brings Harmony-based support, Sidious spreads Corruption before cashing it out with Crimson Force Lightning, and Grievous builds Collected Lightsabers to overwhelm marked prey.',
    'This update focuses on complete new-character kits, including all passives, costs, cooldowns, and in-battle effects for the new Star Wars releases.',
    'Follow-up polish adds character-specific visuals: Sidious now fires blue Force Lightning and red Crimson Force Lightning, while Yoda and Grievous can finish enemies with sabered killing-blow portrait animations.',
    'Roster cleanup moved Ghost Rider directly before Hulk, moved Predalien, Pvt. Saunders, and Predator Stalker into Aliens vs Predator, and moved Rage Infected into Other.',
    'Admin character editor saves now complete locally even if Git sync cannot push, and the latest releases panel now points to Grand Master Yoda, Darth Sidious, and General Grievous.',
];

const changes = [
    skillShowcase(
        'grand-master-yoda',
        'grand-master-yoda-ataru-strike',
        'Ataru Strike costs 1 Taijutsu and deals 20 damage to one enemy. If Harmony is active, it instead deals 35 bleed damage and consumes Harmony.'
    ),
    skillShowcase(
        'grand-master-yoda',
        'grand-master-yoda-grand-masters-wisdom',
        'Grand Master\'s Wisdom costs 1 Genjutsu, increases one ally\'s damage by 10 for 2 turns, and gives Yoda Harmony.'
    ),
    skillShowcase(
        'grand-master-yoda',
        'grand-master-yoda-force-barrier',
        'Force Barrier costs 1 Random, gives Yoda or one ally 20 destructible defense, makes them ignore enemy non-damage effects for 1 turn, and gives Yoda Harmony.'
    ),
    skillShowcase(
        'grand-master-yoda',
        'grand-master-yoda-master-of-the-force',
        'Master of the Force costs 1 Taijutsu and 1 Genjutsu, dealing 35 piercing damage. With Harmony active, it deals 55 piercing damage, stuns for 1 turn, and consumes Harmony.'
    ),
    skillShowcase(
        'grand-master-yoda',
        'grand-master-yoda-passive-harmony',
        'Passive: Harmony lets Yoda empower his damaging skills after using non-damaging Force support.'
    ),
    skillShowcase(
        'darth-sidious',
        'darth-sidious-force-lightning',
        'Force Lightning costs 1 Ninjutsu, deals 15 affliction damage, applies 1 Corruption, and deals 10 additional damage if the target already has Corruption.'
    ),
    skillShowcase(
        'darth-sidious',
        'darth-sidious-dark-manipulation',
        'Dark Manipulation costs 1 Genjutsu, makes one enemy deal 10 less damage for 2 turns, and applies 1 Corruption.'
    ),
    skillShowcase(
        'darth-sidious',
        'darth-sidious-rule-of-two',
        'Rule of Two costs 1 Random and marks an ally for 2 turns. Whenever that ally damages an enemy, that enemy gains 1 Corruption.'
    ),
    skillShowcase(
        'darth-sidious',
        'darth-sidious-crimson-force-lightning',
        'Crimson Force Lightning costs 1 Ninjutsu, 1 Genjutsu, and 1 Random, deals 15 affliction damage to all enemies, gains 10 damage per Corruption stack, stuns enemies at 3 stacks, and removes Corruption afterward.'
    ),
    skillShowcase(
        'darth-sidious',
        'darth-sidious-passive-corruption',
        'Passive: Corruption causes enemies to take 5 affliction damage whenever they gain Corruption, stacking up to 3 times.'
    ),
    skillShowcase(
        'general-grievous',
        'general-grievous-four-armed-assault',
        'Four-Armed Assault costs 1 Taijutsu, deals 10 damage plus 10 per Collected Lightsaber, then grants 1 Collected Lightsaber. Maximum damage is 50.'
    ),
    skillShowcase(
        'general-grievous',
        'general-grievous-jedi-hunter',
        'Jedi Hunter costs 1 Genjutsu, deals 20 damage, marks the target as Prey for 2 turns, and lets Grievous gain an additional Collected Lightsaber when damaging Prey with Melee skills.'
    ),
    skillShowcase(
        'general-grievous',
        'general-grievous-whirling-blades',
        'Whirling Blades costs 1 Random, counters the first harmful skill used on Grievous for 1 turn, deals 15 damage plus 10 per Collected Lightsaber, then removes all Collected Lightsabers.'
    ),
    skillShowcase(
        'general-grievous',
        'general-grievous-trophy-execution',
        'Trophy Execution costs 1 Taijutsu and 1 Random, deals 20 damage plus 15 per Collected Lightsaber, applies Health Cap against Prey, then removes all Collected Lightsabers.'
    ),
    skillShowcase(
        'general-grievous',
        'general-grievous-passive-collected-lightsabers',
        'Passive: Collected Lightsabers gives Grievous 1 Collected Lightsaber whenever he damages an enemy with a Melee skill, stacking up to 4.'
    ),
];

const newsPost = {
    title: 'comic arena balance v 3.1.1',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes,
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncBalance311News() {
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
                    version: latestReleasesVersion,
                    releases: releaseIds.map((characterId) => ({ characterId })),
                    updatedAt: new Date(),
                    updatedBy: 'sync_balance_3_1_1_news',
                },
                $unset: {
                    value: '',
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
            ...currentOverrides.filter((entry) => !releaseIds.includes(entry && entry.characterId)),
            ...releaseIds.map((characterId) => {
                const character = getCharacter(characterId);
                return {
                    characterId: character.characterId,
                    character,
                    updatedAt: new Date(),
                    updatedBy: 'sync_balance_3_1_1_news',
                };
            }),
        ];

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: new Date(),
                    updatedBy: 'sync_balance_3_1_1_news',
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
                    updatedBy: 'sync_balance_3_1_1_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Comic Arena Balance v 3.1.1 news, latest releases, character overrides, and missions.');
    } finally {
        await client.close();
    }
}

syncBalance311News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
