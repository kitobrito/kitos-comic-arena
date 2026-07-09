const { MongoClient } = require('mongodb');
require('dotenv').config();

const { ensureRequiredMissionCatalogEntries } = require('./server');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionCatalogKey = 'missions';

const scytherMission = {
    missionId: 'scyther-trial',
    title: 'The Scyther Trial',
    level_requirement: 6,
    rank: '6',
    reward_character: 'scyther',
    reward_character_name: 'Scyther',
    reward: 'Unlock Scyther.',
    arena: 'pokemon',
    mode_restriction: {
        allowed_modes: ['quick', 'ladder'],
    },
    win_streak: {
        character_id: '',
        character_name: '',
        wins: 0,
    },
    image: 'assets/images/PokemonArena/scyther/scythermissionpic.jpeg',
    imageAlt: 'Scyther mission artwork',
    characterName: 'Scyther',
    portrait: 'assets/images/PokemonArena/scyther/scytherfp.webp',
    portraitAlt: 'Scyther portrait',
    requirements: [
        'This trial is still a milestone, but it is a much lighter climb than the original version.',
        'Clear a 3-win streak with Zubat and Gastly on the same team.',
    ],
    goals: [
        {
            type: 'win_matches',
            character_id: 'chansey',
            character_name: 'Chansey',
            wins: 4,
        },
        {
            type: 'win_matches',
            character_id: 'pidgey',
            character_name: 'Pidgey',
            wins: 4,
        },
        {
            type: 'win_matches',
            character_id: 'koffing',
            character_name: 'Koffing',
            wins: 4,
        },
        {
            type: 'win_streak_same_team',
            character_ids: ['zubat', 'gastly'],
            character_names: ['Zubat', 'Gastly'],
            wins: 3,
        },
    ],
    available: true,
    sortOrder: 5,
};

const upsertMission = (missions = []) => {
    const list = Array.isArray(missions) ? missions.slice() : [];
    const existingIndex = list.findIndex(
        (mission) =>
            String(mission?.missionId || '').trim().toLowerCase() === 'scyther-trial' ||
            String(mission?.reward_character || '').trim().toLowerCase() === 'scyther'
    );
    if (existingIndex === -1) {
        list.push({ ...scytherMission });
    } else {
        list[existingIndex] = {
            ...list[existingIndex],
            ...scytherMission,
        };
    }
    return ensureRequiredMissionCatalogEntries(list);
};

async function syncPokemonScytherMission() {
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
                    updatedBy: 'sync_pokemon_scyther_mission',
                },
            },
            { upsert: true }
        );

        console.log('Synced easier Scyther mission into the live mission catalog.');
    } finally {
        await client.close();
    }
}

syncPokemonScytherMission().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
