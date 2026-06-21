
const { MongoClient } = require('mongodb');
require('dotenv').config();
const characters = require('./characters');
const server = require('./server');

// We need to access DEFAULT_MISSION_CATALOG from server.js
// Since it's not exported, we'll have to be clever or just re-run the logic here.
// Actually, I just added the Ghost Rider mission to characters.js... wait, no, I added it to server.js.

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';

async function syncMissions() {
    if (!uri) {
        console.error('No MONGODB_URI found in .env');
        return;
    }
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const appState = db.collection('app_state');
        
        // Load the current missions from the database
        const state = await appState.findOne({ key: 'missions' });
        let missions = state && Array.isArray(state.missions) ? state.missions : [];
        
        console.log(`Found ${missions.length} missions in DB.`);
        
        // Find the Ghost Rider mission in the default catalog (we'll just define it here to be safe)
        const ghostRiderMission = {
            missionId: 'ghost-rider',
            title: 'Spirit of Vengeance',
            level_requirement: 5,
            rank: '5',
            reward_character: 'ghost-rider',
            reward_character_name: 'Ghost Rider',
            reward: 'Unlock Ghost Rider',
            mode_restriction: {
                allowed_modes: ['quick', 'ladder']
            },
            win_streak: {
                character_id: '',
                character_name: '',
                wins: 0
            },
            image: 'assets/images/ghostridermissionpic.png',
            imageAlt: 'Ghost Rider mission artwork',
            characterName: 'Ghost Rider',
            portrait: 'assets/images/ghostriderfp.png',
            portraitAlt: 'Ghost Rider portrait',
            requirements: [],
            goals: [
                {
                    type: 'win_matches',
                    character_id: 'captain-america',
                    character_name: 'Captain America',
                    wins: 5
                },
                {
                    type: 'win_matches',
                    character_id: 'spider-man',
                    character_name: 'Spider-Man',
                    wins: 5
                }
            ],
            special_pve: {
                enabled: true,
                buttonLabel: 'Trial of Sin',
                botName: 'The Penitent',
                botTeamCharacterId: 'ghost-rider',
                botTeamSize: 1,
                botMaxQueuedSkillsPerTurn: 1,
                backgroundImage: 'assets/images/ghostridermissionpic.png',
                playerTeamCharacterIds: [
                    'the-hulk',
                    'spider-man',
                    'captain-america'
                ]
            },
            sortOrder: 28
        };

        const existingIndex = missions.findIndex(m => m.missionId === 'ghost-rider');
        if (existingIndex !== -1) {
            console.log('Ghost Rider mission already exists in DB. Updating...');
            missions[existingIndex] = ghostRiderMission;
        } else {
            console.log('Adding Ghost Rider mission to DB.');
            missions.push(ghostRiderMission);
        }

        // Sort missions by sortOrder
        missions.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

        await appState.updateOne(
            { key: 'missions' },
            { 
                $set: { 
                    key: 'missions',
                    missions: missions,
                    updatedAt: new Date(),
                    updatedBy: 'system-fix'
                } 
            },
            { upsert: true }
        );
        
        console.log('Successfully synced Ghost Rider mission to MongoDB.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.close();
    }
}

syncMissions();
