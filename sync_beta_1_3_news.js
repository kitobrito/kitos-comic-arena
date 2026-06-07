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
        level_requirement: 12,
        rank: '12',
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
            { type: 'reach_rank', rank: 12 },
            { type: 'win_matches', character_id: 'the-joker', character_name: 'The Joker', wins: 3 },
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
            text: 'Comic-Arena Beta V 1.3 opens the Star Wars universe with Darth Vader, Boba Fett, and Obi-Wan Kenobi joining the roster.',
        },
        {
            type: 'paragraph',
            text: 'This update also adds Star Wars to the universe filters, fixes the in-game skill click fallback, keeps combat cards from shifting when damage lands, and restores visibility for the lower right-side health display.',
        },
        {
            type: 'paragraph',
            text: 'New unlock missions are available for all three Star Wars characters, and Ghost Rider no longer uses a PvE mission fight.',
        },
        {
            type: 'paragraph',
            text: 'Special kill animations were expanded across the roster: Sabered, Eviscerated, Claimed, Judged, Devoured, Hunted, Vanished, Scorched, Butchered, BOOM, Consumed, Speed Blitz, and Lucille\'d now give finishing blows more personality.',
        },
    ],
    paragraphs: [
        'Comic-Arena Beta V 1.3 opens the Star Wars universe with Darth Vader, Boba Fett, and Obi-Wan Kenobi joining the roster.',
        'This update also adds Star Wars to the universe filters, fixes the in-game skill click fallback, keeps combat cards from shifting when damage lands, and restores visibility for the lower right-side health display.',
        'New unlock missions are available for all three Star Wars characters, and Ghost Rider no longer uses a PvE mission fight.',
        'Special kill animations were expanded across the roster: Sabered, Eviscerated, Claimed, Judged, Devoured, Hunted, Vanished, Scorched, Butchered, BOOM, Consumed, Speed Blitz, and Lucille\'d now give finishing blows more personality.',
    ],
    changes: [
        skillShowcase('darth-vader', 'darth-vader-saber-strike-down', 'Darth Vader uses Saber Strike-Down to deal 35 bleed damage and apply Health Cap pressure.'),
        skillShowcase('darth-vader', 'darth-vader-force-choke', 'Force Choke silences one enemy for 2 turns and deals 10 affliction damage each turn.'),
        skillShowcase('darth-vader', 'darth-vader-sith-brutality', 'Sith Brutality counters the first new enemy skill used on Vader or an ally, then punishes the attacker.'),
        skillShowcase('darth-vader', 'darth-vader-force-parry', 'Force Parry makes Darth Vader invulnerable for 1 turn.'),
        skillShowcase('boba-fett', 'boba-fett-bounty-hunter-blaster', 'Boba Fett marks a target as Wanted: Dead or Alive and upgrades his equipment after claiming the bounty.'),
        skillShowcase('boba-fett', 'boba-fett-wrist-flamethrower', 'Wrist Flamethrower burns one enemy and splashes affliction damage across the rest of the enemy team.'),
        skillShowcase('boba-fett', 'boba-fett-missile-backpack', 'Missile Backpack marks a delayed explosion and temporarily swaps into Looted Lightsaber.'),
        skillShowcase('boba-fett', 'boba-fett-mandalorian-armor-jetpack', 'Mandalorian Armor Jetpack gives Boba a defensive invulnerability turn.'),
        skillShowcase('obi-wan-kenobi', 'obi-wan-kenobi-soresu-style-cut', 'Soresu Style Cut rewards Obi-Wan for successful evades or reflects with extra bleed damage.'),
        skillShowcase('obi-wan-kenobi', 'obi-wan-kenobi-saber-deflect', 'Saber Deflect reflects new Ranged enemy skills and prepares Jedi Guardian for the next turn.'),
        skillShowcase('obi-wan-kenobi', 'obi-wan-kenobi-force-push', 'Force Push deals 25 damage and clears active harmful skills applied by the target enemy.'),
        skillShowcase('obi-wan-kenobi', 'obi-wan-kenobi-jedi-maneuver', 'Jedi Maneuver lets Obi-Wan choose an enemy to evade and mark.'),
        skillShowcase('obi-wan-kenobi', 'obi-wan-kenobi-jedi-guardian', 'Jedi Guardian protects an ally with permanent destructible defense and short-term evasion.'),
        {
            text: 'Gameplay fixes: player skill icons now have a click fallback, combat cards keep stable spacing during damage effects, and the lower right-side health display is no longer hidden.',
            changeType: 'fix',
        },
        {
            text: 'New special kill animations: Darth Vader and Obi-Wan can Sabered targets, Wolverine Eviscerates, Boba Fett Claims bounties, Ghost Rider Judges, Carnage Devours, Predator Hunts with thermal scan, Batman Vanishes targets, Superman/Homelander/Billy Butcher have distinct laser labels, Joker/Green Goblin/Rex trigger BOOM kills, Venom Consumes, Flash Speed Blitzes, and Negan can Lucille targets.',
            changeType: 'new',
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
