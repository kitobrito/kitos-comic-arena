const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionsKey = 'missions';

const OPEN_TEAM_PVE_MISSION_GOAL_TEXT_BY_ID = {
    walker: 'Defeat the Walker Herd at Greene Farm to unlock Walker.',
    'rage-infected-mission': 'Defeat the Rage Outbreak to unlock Rage Infected.',
    predatorstalker: 'Defeat the Predator Hunting Party to unlock Predator Stalker.',
    'raid-on-the-xenomorph-hive': 'Beat the Xenomorph Nest to unlock Xenomorph Drone.',
};

const normalizeOpenTeamPveMission = (mission = {}) => {
    if (!Boolean(mission?.special_pve?.enabled)) {
        return mission;
    }
    const missionId = String(mission?.missionId || '').trim();
    const goalText = OPEN_TEAM_PVE_MISSION_GOAL_TEXT_BY_ID[missionId];
    return {
        ...mission,
        goals: goalText
            ? [
                  {
                      type: 'text',
                      text: goalText,
                  },
              ]
            : Array.isArray(mission?.goals)
            ? mission.goals
            : [],
        special_pve: {
            ...(mission?.special_pve || {}),
            playerTeamCharacterIds: [],
        },
    };
};

async function syncOpenTeamPveMissions() {
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
        const nextMissions = missions.map((mission) => normalizeOpenTeamPveMission(mission));
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: nextMissions,
                    updatedAt: new Date(),
                    updatedBy: 'sync_open_team_pve_missions',
                },
            },
            { upsert: true }
        );

        console.log('Synced PvE missions to open-team fights.');
    } finally {
        await client.close();
    }
}

syncOpenTeamPveMissions().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
