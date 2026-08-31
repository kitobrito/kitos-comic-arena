const { MongoClient } = require('mongodb');
require('dotenv').config();

const { ensureRequiredMissionCatalogEntries } = require('./server');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionCatalogKey = 'missions';

// Lance is a champion-tier unlock - deliberately the highest rank/level
// requirement in the Pokemon Arena mission catalog, well above the rest of
// the recent batch (Marowak/Pinsir/Tauros/Darkrai top out around rank 20).
const lanceMission = {
    missionId: 'lance-champion-trial',
    title: 'Lance Champion Trial',
    level_requirement: 30,
    rank: '30',
    reward_character: 'lance',
    reward_character_name: 'Lance',
    reward: 'Unlock Lance.',
    unlockPointCost: 1000,
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/BIB/lancepokemonchampion.webp',
    imageAlt: 'Lance mission artwork',
    characterName: 'Lance',
    portrait: 'assets/images/PokemonArena/BIB/lancepokemonchampion.webp',
    portraitAlt: 'Lance portrait',
    requirements: [
        'Lance is the Pokemon Champion trial - the hardest unlock in the arena, gated behind proving yourself with two of the roster\'s toughest recent champions.',
        'Clear a 5-win streak with Darkrai and Tauros on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'darkrai',
            character_name: 'Darkrai',
            wins: 12,
        },
        {
            type: 'win_matches',
            character_id: 'tauros',
            character_name: 'Tauros',
            wins: 12,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['darkrai', 'tauros'],
            character_names: ['Darkrai', 'Tauros'],
            wins: 5,
        },
    ],
    available: true,
    sortOrder: 30,
};

const upsertMission = (missions = []) => {
    const list = Array.isArray(missions) ? missions.slice() : [];
    const existingIndex = list.findIndex(
        (mission) =>
            String(mission?.missionId || '').trim().toLowerCase() === lanceMission.missionId ||
            String(mission?.reward_character || '').trim().toLowerCase() === 'lance'
    );
    if (existingIndex === -1) {
        list.push({ ...lanceMission });
    } else {
        list[existingIndex] = {
            ...list[existingIndex],
            ...lanceMission,
        };
    }
    return ensureRequiredMissionCatalogEntries(list);
};

async function syncPokemonLanceMission() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const appState = db.collection(appStateCollectionName);
        const existingState = await appState.findOne({ key: missionCatalogKey });
        const nextCatalog = upsertMission(existingState?.missions || []);

        await appState.updateOne(
            { key: missionCatalogKey },
            {
                $set: {
                    key: missionCatalogKey,
                    missions: nextCatalog,
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_lance_mission',
                },
            },
            { upsert: true }
        );

        console.log('Synced Lance mission into the live mission catalog.');
    } finally {
        await client.close();
    }
}

syncPokemonLanceMission().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
