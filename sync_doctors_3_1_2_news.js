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
const latestReleasesVersion = 'update-v3-1-2-doctors';

const releaseIds = ['doctor-strange', 'doctor-fate', 'doctor-doom'];

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
        missionId: 'doctor-strange',
        title: 'Sorcerer Supreme',
        level_requirement: 18,
        rank: '18',
        reward_character: 'doctor-strange',
        reward_character_name: 'Doctor Strange',
        reward: 'Unlock Doctor Strange',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 2 },
        image: 'assets/images/doctorstrangemission.webp',
        imageAlt: 'Doctor Strange mission artwork',
        characterName: 'Doctor Strange',
        portrait: 'assets/images/doctorstrangefp.webp',
        portraitAlt: 'Doctor Strange portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 4 },
            { type: 'win_streak', character_id: 'ghost-rider', character_name: 'Ghost Rider', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 35,
    },
    {
        missionId: 'doctor-fate',
        title: 'Judgment of Nabu',
        level_requirement: 18,
        rank: '18',
        reward_character: 'doctor-fate',
        reward_character_name: 'Doctor Fate',
        reward: 'Unlock Doctor Fate',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'doctor-strange', character_name: 'Doctor Strange', wins: 2 },
        image: 'assets/images/doctorfatemission.webp',
        imageAlt: 'Doctor Fate mission artwork',
        characterName: 'Doctor Fate',
        portrait: 'assets/images/doctorfatefp.webp',
        portraitAlt: 'Doctor Fate portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'doctor-strange', character_name: 'Doctor Strange', wins: 4 },
            { type: 'win_streak', character_id: 'doctor-strange', character_name: 'Doctor Strange', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 36,
    },
    {
        missionId: 'doctor-doom',
        title: 'Lord of Latveria',
        level_requirement: 18,
        rank: '18',
        reward_character: 'doctor-doom',
        reward_character_name: 'Doctor Doom',
        reward: 'Unlock Doctor Doom',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: 'doctor-fate', character_name: 'Doctor Fate', wins: 2 },
        image: 'assets/images/doctordoommission.webp',
        imageAlt: 'Doctor Doom mission artwork',
        characterName: 'Doctor Doom',
        portrait: 'assets/images/drdoomfp.webp',
        portraitAlt: 'Doctor Doom portrait',
        requirements: [],
        goals: [
            { type: 'win_matches', character_id: 'doctor-fate', character_name: 'Doctor Fate', wins: 4 },
            { type: 'win_streak', character_id: 'doctor-fate', character_name: 'Doctor Fate', wins: 2 },
        ],
        special_pve: { ...disabledPve },
        sortOrder: 37,
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
    'Comic Arena Update V.3.1.2 opens the mystic gates with Doctor Strange, Doctor Fate, and Doctor Doom joining the roster.',
    'Doctor Strange builds Arcane Energy into Zom-powered magic, Doctor Fate marks enemies with Judgment before sealing or sentencing them, and Doctor Doom controls the board through Doombot pressure and Latverian tech.',
    'This update also adds missions for all three doctors and moves them into the latest character releases panel.',
];

const changes = [
    skillShowcase(
        'doctor-strange',
        'doctor-strange-crimson-bands-of-cyttorak',
        'Crimson Bands of Cyttorak costs 1 Genjutsu, stuns one enemy for 1 turn, and gives Doctor Strange 1 Arcane Energy. While Empowered by Zom, it affects all enemies.'
    ),
    skillShowcase(
        'doctor-strange',
        'doctor-strange-shield-of-the-seraphim',
        'Shield of the Seraphim costs 1 Random, grants Doctor Strange or an ally 25 destructible defense for 2 turns, and gives Doctor Strange 1 Arcane Energy.'
    ),
    skillShowcase(
        'doctor-strange',
        'doctor-strange-bolts-of-balthakk',
        'Bolts of Balthakk costs 1 Ninjutsu and deals 25 damage to one enemy. While Empowered by Zom, it deals 20 additional affliction damage.'
    ),
    skillShowcase(
        'doctor-strange',
        'doctor-strange-channel-zom',
        'Channel Zom requires 3 Arcane Energy, transforms Doctor Strange into Empowered by Zom for 3 turns, grants 20 permanent destructible defense, and replaces itself with Zom\'s Wrath.'
    ),
    skillShowcase(
        'doctor-strange',
        'doctor-strange-zoms-wrath',
        'Zom\'s Wrath costs 1 Ninjutsu and 1 Genjutsu, deals 25 affliction damage to all enemies, deals 20 additional damage to enemies stunned by Crimson Bands of Cyttorak, then ends Empowered by Zom.'
    ),
    skillShowcase(
        'doctor-strange',
        'doctor-strange-passive-arcane-energy',
        'Passive: Arcane Energy tracks Doctor Strange\'s mystic setup. At 3 Arcane Energy, he may use Channel Zom.'
    ),
    skillShowcase(
        'doctor-fate',
        'doctor-fate-judgment-of-nabu',
        'Judgment of Nabu costs 1 Genjutsu and marks one enemy as Judged for 2 turns, making their harmful skills deal 5 less damage. If they are already Judged, it deals 30 damage and refreshes Judgment.'
    ),
    skillShowcase(
        'doctor-fate',
        'doctor-fate-seal-of-order',
        'Seal of Order costs 1 Ninjutsu and silences one enemy for 1 turn. If they are Judged, they take 15 affliction damage and are silenced for 2 turns instead.'
    ),
    skillShowcase(
        'doctor-fate',
        'doctor-fate-ankh-of-protection',
        'Ankh of Protection costs 1 Random, gives one ally 25 destructible defense, and retaliates for 10 affliction damage whenever that ally is damaged. Judged attackers take 15 additional affliction damage.'
    ),
    skillShowcase(
        'doctor-fate',
        'doctor-fate-verdict-of-nabu',
        'Verdict of Nabu costs 1 Ninjutsu and 1 Genjutsu, deals 20 damage to all enemies, and deals 30 additional damage plus a 1-turn stun to Judged enemies while refreshing Judgment.'
    ),
    skillShowcase(
        'doctor-doom',
        'doctor-doom-doombot-decoy',
        'Doombot Decoy costs 2 Random, summons a Doombot with 30 destructible defense for 2 turns, taunts all enemies toward it, and damages the attacker for 20 if destroyed by an enemy skill.'
    ),
    skillShowcase(
        'doctor-doom',
        'doctor-doom-arcane-tech-blast',
        'Arcane-Tech Blast costs 1 Ninjutsu and deals 25 damage to one enemy. If a Doombot is active, a random enemy takes 15 affliction damage.'
    ),
    skillShowcase(
        'doctor-doom',
        'doctor-doom-latverian-lockdown',
        'Latverian Lockdown costs 1 Taijutsu and silences one enemy for 1 turn. If a Doombot is active, it first removes 15 destructible defense from the target, then deals 15 damage.'
    ),
    skillShowcase(
        'doctor-doom',
        'doctor-doom-dooms-command',
        'Doom\'s Command costs 1 Taijutsu and 1 Ninjutsu and can only be used while a Doombot is active. Doom destroys the Doombot to deal 25 damage to all enemies and stun them for 1 turn.'
    ),
];

const newsPost = {
    title: 'Comic Arena Update V.3.1.2',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes,
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncDoctors312News() {
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
                    updatedBy: 'sync_doctors_3_1_2_news',
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
                    updatedBy: 'sync_doctors_3_1_2_news',
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
                    updatedBy: 'sync_doctors_3_1_2_news',
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
                    updatedBy: 'sync_doctors_3_1_2_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Comic Arena Update V.3.1.2 news, latest releases, character overrides, and doctor missions.');
    } finally {
        await client.close();
    }
}

syncDoctors312News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
