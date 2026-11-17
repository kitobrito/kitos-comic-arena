const test = require('node:test');
const assert = require('node:assert/strict');
const battleLogic = require('../battleLogic.js');

const pool = (t = 0, b = 0, n = 0, g = 0) => ({ taijutsu: t, bloodline: b, ninjutsu: n, genjutsu: g });

test('destroyed energy is recorded with the colour that was actually removed', () => {
    const match = { turnNumber: 4, chakraPools: { hero: pool(0, 2, 0, 0) }, economy: {} };
    const removed = battleLogic.removeRandomChakraFromMatch({ match, username: 'hero', amount: 1, sourceUsername: 'villain', sourceSkillId: 'zap', sourceSlot: 1 });
    assert.equal(removed, 1);
    assert.deepEqual(match.chakraPools.hero, pool(0, 1, 0, 0));
    assert.equal(match.economy.energyLosses.length, 1);
    assert.deepEqual(match.economy.energyLosses[0], { id: 1, username: 'hero', type: 'bloodline', kind: 'destroyed', toUsername: null, sourceSkillId: 'zap', sourceSlot: 1, turn: 4 });
});

test('stolen energy names who took it, and the record stays short', () => {
    const match = { turnNumber: 2, economy: {} };
    for (let i = 0; i < 30; i += 1) battleLogic.recordEnergyLoss(match, { username: 'hero', type: 'ninjutsu', kind: 'stolen', toUsername: 'villain', sourceSlot: 0 });
    assert.equal(match.economy.energyLosses.length, 24);
    assert.equal(match.economy.energyLosses.at(-1).id, 30);
    assert.equal(match.economy.energyLosses.at(-1).kind, 'stolen');
    assert.equal(match.economy.energyLosses.at(-1).toUsername, 'villain');
});

test('nothing is recorded when there is no energy to take', () => {
    const match = { turnNumber: 1, chakraPools: { hero: pool() }, economy: {} };
    assert.equal(battleLogic.removeRandomChakraFromMatch({ match, username: 'hero', amount: 2 }), 0);
    assert.equal(match.economy.energyLosses, undefined);
});
