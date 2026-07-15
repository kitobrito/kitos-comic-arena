const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const state = await db.collection('app_state').findOne({ key: 'mission_catalog' });
        
        if (!state || !state.missions) {
            console.log('No mission catalog found in database.');
            return;
        }

        console.log('Checking missions for playerTeamCharacterIds:');
        state.missions.forEach(m => {
            const pve = m.special_pve || m.specialPve;
            if (pve && pve.enabled) {
                console.log(`- ${m.title} (${m.missionId}): ${JSON.stringify(pve.playerTeamCharacterIds)}`);
            }
        });

    } finally {
        await client.close();
    }
}

run();
