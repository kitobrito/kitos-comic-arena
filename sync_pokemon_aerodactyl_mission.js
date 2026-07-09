const { MongoClient } = require('mongodb');
require('dotenv').config();

const { ensureRequiredMissionCatalogEntries } = require('./server');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionCatalogKey = 'missions';

const aerodactylMission = {
    missionId: 'aerodactyl-fossil-flight',
    title: 'Aerodactyl Fossil Flight',
    level_requirement: 13,
    rank: '13',
    reward_character: 'aerodactyl',
    reward_character_name: 'Aerodactyl',
    reward: 'Unlock Aerodactyl.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/missionpics/aerodactyl.avif',
    imageAlt: 'Aerodactyl mission artwork',
    characterName: 'Aerodactyl',
    portrait: 'assets/images/PokemonArena/aerodactyl/fp.webp',
    portraitAlt: 'Aerodactyl portrait',
    requirements: [
        'Aerodactyl unlocks through a high-speed fossil trial built around recoil and fast finishes.',
        'Clear a 4-win streak with Scyther and Hitmonlee on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'scyther',
            character_name: 'Scyther',
            wins: 10,
        },
        {
            type: 'win_matches',
            character_id: 'hitmonlee',
            character_name: 'Hitmonlee',
            wins: 10,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['scyther', 'hitmonlee'],
            character_names: ['Scyther', 'Hitmonlee'],
            wins: 4,
        },
    ],
    available: true,
    sortOrder: 15,
};

const pikachuMissionImage = 'assets/images/PokemonArena/missionpics/pikachu.jpeg';

const upsertMission = (missions = []) => {
    const list = Array.isArray(missions) ? missions.slice() : [];
    const normalizedAerodactyl = {
        ...aerodactylMission,
    };
    const existingIndex = list.findIndex(
        (mission) =>
            String(mission?.missionId || '').trim().toLowerCase() === aerodactylMission.missionId ||
            String(mission?.reward_character || '').trim().toLowerCase() === 'aerodactyl'
    );
    if (existingIndex === -1) {
        list.push(normalizedAerodactyl);
    } else {
        list[existingIndex] = {
            ...list[existingIndex],
            ...normalizedAerodactyl,
        };
    }
    const pikachuIndex = list.findIndex(
        (mission) =>
            String(mission?.missionId || '').trim().toLowerCase() === 'pikachu-starter-path' ||
            String(mission?.reward_character || '').trim().toLowerCase() === 'pikachu'
    );
    if (pikachuIndex !== -1) {
        list[pikachuIndex] = {
            ...list[pikachuIndex],
            image: pikachuMissionImage,
        };
    }
    return ensureRequiredMissionCatalogEntries(list);
};

async function syncPokemonAerodactylMission() {
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
                    updatedBy: 'sync_pokemon_aerodactyl_mission',
                },
            },
            { upsert: true }
        );

        console.log('Synced Aerodactyl mission into the live mission catalog.');
    } finally {
        await client.close();
    }
}

syncPokemonAerodactylMission().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
