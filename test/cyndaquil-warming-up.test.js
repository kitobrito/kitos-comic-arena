'use strict';

// Cyndaquil's Warming-Up: each skill Cyndaquil uses adds 5 to the passive, and an enemy that attacks
// Cyndaquil takes that much affliction damage back.
const test = require('node:test');
const assert = require('node:assert/strict');

const characters = require('../characters');
const { buildInitialBoard, processTurnStartStatusEffects, resolvePendingTurnSkills, tickStatusesForTurnEnd } = require('../battleLogic');

const cyndaquil = characters.find((c) => c.characterId === 'cyndaquil');
const idx = (id) => cyndaquil.skills.findIndex((s) => s.id === id);
const punch = { id: 't-punch', name: 'Punch', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 20, scope: 'target' }] };
const dummy = { id: 'dummy', characterId: 'dummy', name: 'Dummy', arena: 'comic', skills: [punch] };
const roster = [cyndaquil, dummy];

function game() {
    const players = [{ username: 'ash', team: [0] }, { username: 'foe', team: [1, 1, 1] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = {
        players, board: buildInitialBoard(players, roster), chakraPools: { ash: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { ash: 1, foe: 1 } },
    };
    const use = (username, skillIndex, targetUsername, targetSlot = 0, slot = 0) => {
        match.pendingTurns[username] = { queueOrder: [String(slot)], queuedByActorSlot: { [String(slot)]: { skillIndex, targetSelection: [{ username: targetUsername, slot: targetSlot }] } } };
        resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
        match.pendingTurns[username] = {};
    };
    const pass = (username) => {
        tickStatusesForTurnEnd({ match, endingUsername: username });
        const other = username === 'ash' ? 'foe' : 'ash';
        match.economy.turnCounts[other] += 1;
        processTurnStartStatusEffects({ match, startingUsername: other });
    };
    return { match, use, pass, unit: match.board.ash[0], foes: match.board.foe };
}
const warm = (unit) => unit.state.statuses.find((s) => s.id === 'cyndaquil_warming_up');

test('Warming-Up starts at 0, so an early attack on Cyndaquil takes nothing back', () => {
    const g = game();
    assert.equal(warm(g.unit).metadata.skillDamageBonuses['cyndaquil-warming-up'], 0);
    g.use('foe', 0, 'ash');
    assert.equal(g.foes[0].hp, 100);
});

test('each skill Cyndaquil uses adds 5, and an attacker takes that much back as affliction damage', () => {
    const g = game();
    g.use('ash', idx('cyndaquil-aerial-tackle'), 'foe', 1);
    g.pass('ash'); g.pass('foe');
    g.unit.state.cooldowns = {};
    g.use('ash', idx('cyndaquil-aerial-tackle'), 'foe', 1);
    assert.equal(warm(g.unit).metadata.skillDamageBonuses['cyndaquil-warming-up'], 10);
    g.pass('ash');
    const before = g.foes[0].hp;
    g.use('foe', 0, 'ash');
    assert.equal(before - g.foes[0].hp, 10, 'the attacker takes Warming-Up damage');
});

test('Aerial Flamethrower starts at 5 to every enemy and grows with Warming-Up', () => {
    const g = game();
    g.use('ash', idx('cyndaquil-aerial-flamethrower'), 'foe', 0);
    assert.deepEqual(g.foes.map((f) => f.hp), [95, 95, 95], 'first use: 5 base, nothing stored yet');
    assert.equal(warm(g.unit).metadata.skillDamageBonuses['cyndaquil-warming-up'], 5);
    g.pass('ash'); g.pass('foe');
    g.unit.state.cooldowns = {};
    g.use('ash', idx('cyndaquil-aerial-tackle'), 'foe', 1);
    g.pass('ash'); g.pass('foe');
    g.unit.state.cooldowns = {};
    g.foes.forEach((f) => { f.hp = 100; });
    g.use('ash', idx('cyndaquil-aerial-flamethrower'), 'foe', 0);
    assert.deepEqual(g.foes.map((f) => f.hp), [85, 85, 85], 'after 2 skills: 5 + 10');
});
