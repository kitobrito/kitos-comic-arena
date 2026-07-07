const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionsKey = 'missions';

const normalizeArenaMode = (value = '') => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'pokemon' ? 'pokemon' : 'comic';
};

const shouldNormalizeComicMissionDifficulty = (mission = {}) => {
    if (normalizeArenaMode(mission?.arena || '') === 'pokemon') {
        return false;
    }
    if (Boolean(mission?.special_pve?.enabled)) {
        return false;
    }
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    return !goals.some((goal) => String(goal?.type || '').trim().toLowerCase() === 'reach_rank');
};

const COMIC_MISSION_REQUIRED_PAIR_OVERRIDES = {
    venom: [
        { characterId: 'spider-man', characterName: 'Spider-Man' },
        { characterId: 'batman', characterName: 'Batman' },
    ],
    omniman: [
        { characterId: 'invincible', characterName: 'Invincible' },
        { characterId: 'atom-eve', characterName: 'Atom Eve' },
    ],
    'sorrow-mission': [
        { characterId: 'atrocitus', characterName: 'Atrocitus' },
        { characterId: 'sinestro', characterName: 'Sinestro' },
    ],
    'boba-fett': [
        { characterId: 'ghost-rider', characterName: 'Ghost Rider' },
        { characterId: 'captain-america', characterName: 'Captain America' },
    ],
    'obi-wan-kenobi': [
        { characterId: 'wonder-woman', characterName: 'Wonder Woman' },
        { characterId: 'ghost-rider', characterName: 'Ghost Rider' },
    ],
};

const normalizeCharacterId = (value = '') =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const collectComicMissionCharacterReferences = (mission = {}) => {
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    const references = [];
    const seen = new Set();
    const addReference = (characterId, characterName) => {
        const normalizedCharacterId = normalizeCharacterId(characterId);
        if (!normalizedCharacterId || seen.has(normalizedCharacterId)) {
            return;
        }
        seen.add(normalizedCharacterId);
        references.push({
            characterId: normalizedCharacterId,
            characterName: String(characterName || '').trim() || normalizedCharacterId,
        });
    };

    goals.forEach((goal) => {
        const goalType = String(goal?.type || '').trim().toLowerCase();
        if (goalType === 'win_matches' || goalType === 'win_streak') {
            addReference(goal?.character_id ?? goal?.characterId, goal?.character_name ?? goal?.characterName);
            return;
        }
        if (goalType === 'win_matches_same_team' || goalType === 'win_streak_same_team') {
            const ids = Array.isArray(goal?.character_ids) ? goal.character_ids : [];
            const names = Array.isArray(goal?.character_names) ? goal.character_names : [];
            ids.forEach((characterId, index) => {
                addReference(characterId, names[index]);
            });
        }
    });

    return references;
};

const getComicMissionRequiredPair = (mission = {}) => {
    const missionId = String(mission?.missionId || '').trim();
    const overridePair = COMIC_MISSION_REQUIRED_PAIR_OVERRIDES[missionId];
    if (Array.isArray(overridePair) && overridePair.length >= 2) {
        return overridePair.slice(0, 2).map((entry) => ({
            characterId: normalizeCharacterId(entry?.characterId),
            characterName: String(entry?.characterName || '').trim() || normalizeCharacterId(entry?.characterId),
        }));
    }
    return collectComicMissionCharacterReferences(mission).slice(0, 2);
};

const normalizeComicMissionDifficulty = (mission = {}) => {
    if (!shouldNormalizeComicMissionDifficulty(mission)) {
        return mission;
    }
    const requiredPair = getComicMissionRequiredPair(mission);
    if (requiredPair.length < 2) {
        return mission;
    }
    const first = requiredPair[0];
    const second = requiredPair[1];
    return {
        ...mission,
        goals: [
            {
                type: 'win_matches',
                character_id: first.characterId,
                character_name: first.characterName,
                wins: 10,
            },
            {
                type: 'win_matches',
                character_id: second.characterId,
                character_name: second.characterName,
                wins: 10,
            },
            {
                type: 'win_streak_same_team',
                character_ids: [first.characterId, second.characterId],
                character_names: [first.characterName, second.characterName],
                wins: 4,
            },
        ],
    };
};

async function syncComicMissionDifficulty() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const appState = db.collection(appStateCollectionName);
        const state = await appState.findOne({ key: missionsKey });
        const missions = Array.isArray(state?.missions) ? state.missions : [];
        if (!missions.length) {
            throw new Error('No stored mission catalog found.');
        }
        const nextMissions = missions.map((mission) => normalizeComicMissionDifficulty(mission));
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: nextMissions,
                    updatedAt: new Date(),
                    updatedBy: 'sync_comic_mission_difficulty',
                },
            },
            { upsert: true }
        );

        console.log('Synced Comic Arena non-rank, non-PvE missions to Pokemon-style mission patterns.');
    } finally {
        await client.close();
    }
}

syncComicMissionDifficulty().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
