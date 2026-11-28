'use strict';

// Pinsir’s target-specific hit bonuses and timed effects run through the battle engine.
const test = require('node:test');
const assert = require('node:assert/strict');

const characters = require('../characters');
const {
    buildInitialBoard,
    configureBattleRuntime,
    resetBattleRuntime,
    processTurnStartStatusEffects,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');

const pinsir = characters.find((c) => c.characterId === 'pinsir');
const skill = (id) => pinsir.skills.findIndex((s) => s.id === id);
// A typeless target, so Pokemon type effectiveness doesn't change the numbers.
const punch = { id: 't-punch', name: 'Punch', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 20, scope: 'target' }] };
const dummy = { id: 'dummy', characterId: 'dummy', name: 'Dummy', arena: 'comic', skills: [punch, { id: 't-heal', target: 'self', effects: [{ type: 'heal', scope: 'self', amount: 20 }] }] };
const roster = [pinsir, dummy];

function game() {
    const players = [{ username: 'may', team: [0] }, { username: 'foe', team: [1, 1, 1] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = {
        players, board: buildInitialBoard(players, roster), chakraPools: { may: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { may: 1, foe: 1 } },
    };
    const use = (username, skillIndex, targetUsername, targetSlot = 0, slot = 0) => {
        match.pendingTurns[username] = { queueOrder: [String(slot)], queuedByActorSlot: { [String(slot)]: { skillIndex, targetSelection: [{ username: targetUsername, slot: targetSlot }] } } };
        resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
        match.pendingTurns[username] = {};
    };
    const pass = (username) => {
        tickStatusesForTurnEnd({ match, endingUsername: username });
        const other = username === 'may' ? 'foe' : 'may';
        match.economy.turnCounts[other] += 1;
        processTurnStartStatusEffects({ match, startingUsername: other });
    };
    const round = () => { pass('may'); pass('foe'); };
    const unit = match.board.may[0];
    return { match, use, pass, round, unit, foes: match.board.foe, readyAll: () => { unit.state.cooldowns = {}; } };
}
const status = (unit, id) => unit.state.statuses.find((s) => s.id === id);

const guillotine = skill('pinsir-guillotine');
const viceGrip = skill('pinsir-vice-grip');
const seismicToss = skill('pinsir-seismic-toss');
const rockTomb = skill('pinsir-rock-tomb');
const useRoll = (roll) => configureBattleRuntime({ random: () => roll });
test.afterEach(resetBattleRuntime);

test('Guillotine replaces X-Scissor, deals 50 on a hit and uses a shorter cooldown on a miss', () => {
    assert.deepEqual(pinsir.skills.slice(0, 4).map((s) => s.id), [
        'pinsir-vice-grip', 'pinsir-seismic-toss', 'pinsir-guillotine', 'pinsir-rock-tomb',
    ]);
    assert.deepEqual(pinsir.skills[guillotine].energy, ['Random']);
    assert.deepEqual(pinsir.skills[seismicToss].energy, ['Taijutsu']);
    const g = game();
    g.unit.hp = 60;
    g.foes[0].state.statuses.push({
        id: 'shield', remainingTurns: 999, metadata: { damageReductionFlat: 25, destructibleDefensePoints: 30 },
    });
    useRoll(0.30);
    g.use('may', guillotine, 'foe');
    assert.equal(g.foes[0].hp, 100);
    assert.equal(g.unit.state.cooldowns['pinsir-guillotine'], 3);
    assert.equal(status(g.unit, 'pinsir_mega_evolved'), undefined);
    g.readyAll();
    useRoll(0.29);
    g.use('may', guillotine, 'foe');
    assert.equal(g.foes[0].hp, 50);
    assert.equal(status(g.foes[0], 'shield').metadata.destructibleDefensePoints, 30);
    assert.equal(g.unit.state.cooldowns['pinsir-guillotine'], 5);
    assert.equal(g.unit.hp, 85);
    assert.equal(status(g.unit, 'pinsir_mega_evolved').metadata.unpierceableDamageReductionFlat, 10);
    const effective = resolveEffectiveSkill({ characters: roster, rosterIndex: 0, skillIndex: viceGrip, actorState: g.unit.state });
    assert.equal(effective.id, 'pinsir-struggle-bug');
    g.readyAll();
    g.use('may', guillotine, 'foe', 1);
    assert.equal(g.unit.hp, 85, 'Mega only heals once');
});

test('Vice Grip disables reduction before damage and gives only its target a next-turn hit bonus', () => {
    const g = game();
    g.foes[0].state.statuses.push({ id: 'reduction', remainingTurns: 999, metadata: { damageReductionFlat: 30 } });
    useRoll(0.50);
    g.use('may', viceGrip, 'foe');
    assert.equal(g.foes[0].hp, 80);
    g.use('may', guillotine, 'foe');
    assert.equal(g.foes[0].hp, 80, 'the bonus starts next turn');
    g.round(); g.readyAll();
    g.use('may', guillotine, 'foe', 1);
    assert.equal(g.foes[1].hp, 100, 'unmarked enemy gets no bonus');
    g.readyAll();
    g.use('may', guillotine, 'foe');
    assert.equal(g.foes[0].hp, 30);
    g.round();
    assert.equal(status(g.foes[0], 'pinsir_vice_grip_guillotine_mark'), undefined);
});

test('Seismic Toss counters even a helpful skill, and only triggered counters stack on that enemy', () => {
    const g = game();
    g.use('may', seismicToss, 'foe', 1);
    g.pass('may');
    g.use('foe', 1, 'foe', 1, 1);
    assert.equal(g.foes[1].hp, 70);
    assert.equal(status(g.foes[1], 'pinsir_seismic_toss_bonus_0').metadata.pinsirGuillotineBonus, 15);
    g.pass('foe'); g.readyAll();
    g.use('may', seismicToss, 'foe', 1);
    g.pass('may');
    g.use('foe', 1, 'foe', 1, 1);
    assert.equal(g.foes[1].hp, 40);
    assert.equal(status(g.foes[1], 'pinsir_seismic_toss_bonus_0').metadata.pinsirGuillotineBonus, 30);
    g.pass('foe');
    useRoll(0.55);
    g.use('may', guillotine, 'foe', 0);
    assert.equal(g.foes[0].hp, 100);
    g.readyAll();
    g.use('may', guillotine, 'foe', 1);
    assert.equal(g.foes[1].hp, 0);
});

test('Rock Tomb spends its remaining defense on the marked enemy and stuns even with no defense left', () => {
    for (const hits of [1, 2]) {
        const g = game();
        g.use('may', rockTomb, 'foe', 2);
        assert.equal(status(g.unit, 'pinsir_rock_tomb_defense').metadata.destructibleDefensePoints, 30);
        g.pass('may');
        for (let slot = 0; slot < hits; slot++) g.use('foe', 0, 'may', 0, slot);
        g.pass('foe');
        assert.equal(status(g.unit, 'pinsir_rock_tomb_defense'), undefined);
        assert.equal(g.foes[2].hp, hits === 1 ? 90 : 100);
        assert.equal(status(g.foes[2], 'pinsir_rock_tomb_stun').remainingTurns, 1);
    }
});

test('Struggle Bug evades according to missing HP and loses its guaranteed mark on damage', () => {
    for (const evade of [true, false]) {
        const g = game();
        useRoll(0.10);
        g.use('may', guillotine, 'foe', 2);
        g.round(); g.readyAll();
        g.unit.hp = 50;
        g.use('may', viceGrip, 'foe', 1);
        assert.equal(status(g.unit, 'pinsir_struggle_bug_evasion').metadata.evadeChancePercent, 50);
        useRoll(evade ? 0.4 : 0.8);
        g.pass('may');
        g.use('foe', 0, 'may');
        if (evade) g.use('foe', 0, 'may', 0, 1);
        assert.equal(g.unit.hp, evade ? 50 : 40);
        assert.equal(Boolean(status(g.foes[1], 'pinsir_struggle_bug_guillotine_mark')), evade);
        g.pass('foe');
        useRoll(0.99);
        g.use('may', guillotine, 'foe', 1);
        assert.equal(g.foes[1].hp, evade ? 50 : 100);
    }
});
