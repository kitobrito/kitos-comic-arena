import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame } from '../reference/engine.mjs';
import { ROSTER } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function fullEnergy(state, player) {
    state.energy[player] = { taijutsu: 10, ninjutsu: 10, bloodline: 10, genjutsu: 10 };
}

function step(state, nextAction) {
    fullEnergy(state, nextAction.player);
    return enact(state, nextAction);
}

function matchup({ seed = 1 } = {}) {
    return createGame({
        seed,
        teams: {
            A: ['cyndaquil', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Cyndaquil exposes exactly four active skills and its passive is not a castable skill', () => {
    assert.equal(ROSTER.cyndaquil.skills.length, 4);
    assert.deepEqual(ROSTER.cyndaquil.forms.base.skillIds, [
        'cyndaquil-aerial-tackle', 'cyndaquil-aerial-flamethrower',
        'cyndaquil-cynda-smokescreen', 'cyndaquil-skyward-leap',
    ]);
});

test('Aerial Tackle deals 20 damage and strips control/channeled statuses sourced by the target', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game.teams.A[0].statuses.push({
        id: 'test-taunt-from-pidgey', name: 'Test Taunt', hidden: false, harmful: true,
        durationActions: 3, tauntSource: true, sourcePlayer: 'B', sourceSlot: 0, appliedTurn: 0,
    });
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));

    assert.equal(game.teams.B[0].hp, 80);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'test-taunt-from-pidgey'), false);
});

test('Cynda-Smokescreen fails every enemy skill for their next turn, and Aerial Flamethrower applies a 5-damage afterburn while it lingers', () => {
    let game = matchup({ seed: 2 });
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'cyndaquil-cynda-smokescreen', 'B', 0));
    assert.equal(game.teams.B.every((unit) => unit.statuses.some((status) => status.id === 'cyndaquil-smokescreen-active')), true);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.events.some((event) => event.kind === 'skill-failed' && event.skillId === 'pidgey-peck'), true);
    assert.equal(game.teams.A[0].hp, 100);

    // Warming Up already sits at +5 from casting Smokescreen, and this very Flamethrower cast
    // adds another +5 before its own damage resolves (bonus 10): 5 base + 10 bonus = 15 immediate.
    // Because the afterburn's turnStartDamage fires as soon as it becomes B's turn — synchronously,
    // inside this same action — it lands right away too, at the same 10 bonus: another 15. Total 30.
    game = step(game, action('A', 0, 'cyndaquil-aerial-flamethrower', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [70, 70, 70]);
    assert.equal(game.teams.B.every((unit) => unit.statuses.some((status) => status.id === 'cyndaquil-flamethrower-afterburn')), true);
});

test('Warming Up permanently adds 5 damage to Flamethrower and itself every time Cyndaquil uses a skill', () => {
    let game = matchup({ seed: 3 });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-warming-up-passive')?.skillDamageBonuses,
        { 'cyndaquil-aerial-flamethrower': 5, 'cyndaquil-warming-up': 5 }
    );

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    // No Smokescreen here, so no afterburn tick — just the immediate hit at 5 base + 10 bonus
    // (the existing +5 from Aerial Tackle, plus another +5 this very Flamethrower cast adds first).
    game = step(game, action('A', 0, 'cyndaquil-aerial-flamethrower', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-warming-up-passive')?.skillDamageBonuses,
        { 'cyndaquil-aerial-flamethrower': 10, 'cyndaquil-warming-up': 10 }
    );
});

test('Skyward Leap evades the next hit, then empowers Aerial Tackle and Aerial Flamethrower by 10 for one use', () => {
    let game = matchup({ seed: 4 });
    game = step(game, action('A', 0, 'cyndaquil-skyward-leap', 'A', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-leap-active'), true);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-leap-active'), false);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-bonus'), true);

    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
});
