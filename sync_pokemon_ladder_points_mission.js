const { withMongo } = require('./scripts/lib/runtime-toolkit');

const mission = {
    missionId: 'pokemon-ladder-first-25-wins',
    title: 'Road to Champion: 25 Ladder Wins',
    level_requirement: 1,
    rank: '1',
    reward_character: '',
    reward_character_name: '',
    reward: 'Earn 1,000 Pokemon Arena points.',
    reward_unlock_points: 1000,
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['ladder'] },
    image: 'assets/images/PokemonArena/found-pokeball.png',
    imageAlt: 'Pokemon Arena 25 Ladder wins reward',
    characterName: 'Pokemon Arena Champion',
    portrait: 'assets/images/PokemonArena/found-pokeball.png',
    portraitAlt: 'Pokemon Arena points reward',
    requirements: [
        'Win 25 Ladder matches in Pokemon Arena.',
        'Human and battle-bot Ladder wins both count. Quick, Private, and mission battles do not.',
        'Spend points on character unlocks, skins, and additional Eevee evolutions.',
    ],
    goals: [{ type: 'win_ladder_matches', wins: 25 }],
    special_pve: { enabled: false },
    sortOrder: 1,
};

async function syncMission() {
    return withMongo(async ({ appState }) => {
        const state = await appState.findOne({ key: 'missions' });
        const missions = Array.isArray(state?.missions) ? state.missions.slice() : [];
        const index = missions.findIndex((entry) => entry?.missionId === mission.missionId);
        if (index >= 0) missions[index] = mission;
        else missions.push(mission);
        await appState.updateOne(
            { key: 'missions' },
            { $set: { key: 'missions', missions, updatedAt: new Date(), updatedBy: 'codex-ladder-incentive' } },
            { upsert: true }
        );
        return { missionId: mission.missionId, inserted: index < 0, missionCount: missions.length };
    });
}

if (require.main === module) {
    syncMission()
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { mission, syncMission };
