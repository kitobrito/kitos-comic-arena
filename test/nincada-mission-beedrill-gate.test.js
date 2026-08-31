const assert = require('node:assert/strict');
const test = require('node:test');

const { ensureRequiredMissionCatalogEntries } = require('../server');

// Nincada used to be free to use with a bonus-points mission attached to
// itself ("win 10 with Nincada to earn 300 points"). It's now a real
// mission-locked character gated behind Beedrill instead.
test('Nincada is unlocked by winning with Beedrill, not by using Nincada itself', () => {
    const catalog = ensureRequiredMissionCatalogEntries([]);
    const mission = catalog.find((entry) => entry.missionId === 'nincada-evolution-specialist');
    assert.ok(mission, 'expected the Nincada mission to exist');
    assert.equal(mission.reward_character, 'nincada');
    assert.equal(mission.reward_character_name, 'Nincada');
    assert.equal(mission.reward, 'Unlock Nincada.');
    assert.equal(mission.goals.length, 1);
    assert.equal(mission.goals[0].type, 'win_matches');
    assert.equal(mission.goals[0].character_id, 'beedrill');
    assert.equal(mission.goals[0].wins, 10);
    assert.ok(mission.requirements.some((line) => line.includes('Beedrill')));
    assert.ok(!mission.requirements.some((line) => line.includes('free to use')));
});
