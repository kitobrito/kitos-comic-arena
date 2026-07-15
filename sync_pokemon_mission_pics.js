const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionsKey = 'missions';

const missionImageOverrides = new Map([
    ['pikachu-starter-path', 'assets/images/PokemonArena/missionpics/pikachu.avif'],
    ['krabby-tide-trial', 'assets/images/PokemonArena/missionpics/krabby.webp'],
    ['ekans-venom-trial', 'assets/images/PokemonArena/missionpics/ekans.jpeg'],
    ['machop-power-run', 'assets/images/PokemonArena/missionpics/machop.jpeg'],
    ['magikarp-long-climb', 'assets/images/PokemonArena/missionpics/magikarp.webp'],
    ['mr-mime-stage-trial', 'assets/images/PokemonArena/missionpics/mr.mime.avif'],
    ['hitmonlee-kick-circuit', 'assets/images/PokemonArena/missionpics/hitmonlee.jpeg'],
    ['hitmonchan-power-grid', 'assets/images/PokemonArena/missionpics/hitmonchan.jpeg'],
    ['magnemite-magnet-rise', 'assets/images/PokemonArena/missionpics/magnemite.jpg'],
]);

async function main() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const appState = db.collection(appStateCollectionName);
        const currentState = await appState.findOne({ key: missionsKey });
        const currentMissions = Array.isArray(currentState?.missions) ? currentState.missions : [];

        const nextMissions = currentMissions.map((mission) => {
            const nextImage = missionImageOverrides.get(mission?.missionId);
            if (!nextImage) return mission;
            return {
                ...mission,
                image: nextImage,
            };
        });

        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: nextMissions,
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_mission_pics',
                },
            },
            { upsert: true }
        );

        console.log(`Updated mission pictures for ${missionImageOverrides.size} Pokemon missions.`);
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
