const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    ensureRequiredMissionCatalogEntries,
    resolveMissionUnlockPointCost,
} = require('../server');

test("Aegislash has a canonical King's Shield mission with a 300-point alternative", () => {
    const missions = ensureRequiredMissionCatalogEntries([]);
    const mission = missions.find((entry) => entry.reward_character === 'aegislash');

    assert.ok(mission);
    assert.equal(mission.missionId, 'aegislash-kings-shield-trial');
    assert.equal(mission.arena, 'pokemon');
    assert.equal(resolveMissionUnlockPointCost(mission), 300);
    assert.equal(mission.image, 'assets/images/PokemonArena/missionpics/aegislash.webp');
    assert.deepEqual(
        mission.goals.map((goal) => ({
            type: goal.type,
            characterIds: goal.character_ids,
            wins: goal.wins,
        })),
        [
            {
                type: 'win_matches_same_team',
                characterIds: ['gastly', 'magnemite'],
                wins: 8,
            },
            {
                type: 'win_streak_same_team',
                characterIds: ['gastly', 'magnemite'],
                wins: 4,
            },
        ]
    );
    assert.ok(fs.existsSync(path.join(__dirname, '..', mission.image)));
    assert.ok(fs.existsSync(path.join(__dirname, '..', mission.portrait)));
});

test('Aegislash mission upsert preserves unrelated missions without duplicating itself', () => {
    const existing = [{
        missionId: 'custom-pokemon-mission',
        title: 'Custom Mission',
        arena: 'pokemon',
        goals: [],
    }];
    const once = ensureRequiredMissionCatalogEntries(existing);
    const twice = ensureRequiredMissionCatalogEntries(once);

    assert.ok(twice.some((mission) => mission.missionId === 'custom-pokemon-mission'));
    assert.equal(
        twice.filter((mission) => mission.reward_character === 'aegislash').length,
        1
    );
});
