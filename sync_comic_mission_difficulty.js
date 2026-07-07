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

const normalizeComicMissionDifficulty = (mission = {}) => {
    if (!shouldNormalizeComicMissionDifficulty(mission)) {
        return mission;
    }
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    return {
        ...mission,
        goals: goals.map((goal) => {
            const goalType = String(goal?.type || '').trim().toLowerCase();
            if (goalType === 'win_matches') {
                return {
                    ...goal,
                    wins: Math.min(6, Math.max(0, Number(goal?.wins) || 0)),
                };
            }
            if (goalType === 'win_matches_same_team') {
                return {
                    ...goal,
                    wins: Math.min(5, Math.max(0, Number(goal?.wins) || 0)),
                };
            }
            if (goalType === 'win_streak') {
                return {
                    ...goal,
                    wins: Math.min(5, Math.max(0, Number(goal?.wins) || 0)),
                };
            }
            return goal;
        }),
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

        console.log('Synced Comic Arena non-rank, non-PvE mission difficulty to Pokemon-style caps.');
    } finally {
        await client.close();
    }
}

syncComicMissionDifficulty().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
