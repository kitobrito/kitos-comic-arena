import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, legalActions } from '../reference/engine.mjs';
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
            A: ['totodile', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Totodile exposes exactly four active skills and its passive is not a castable skill', () => {
    assert.equal(ROSTER.totodile.skills.length, 4);
    assert.deepEqual(ROSTER.totodile.forms.base.skillIds, [
        'totodile-aerial-water-gun', 'totodile-scary-face',
        'totodile-aqua-tail', 'totodile-superpower',
    ]);
});

test('Aerial Water Gun deals 15 to all enemies, gains a Water Ring, and delays every enemy’s harmful skills by one of their turns', () => {
    let game = matchup();
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'totodile-aerial-water-gun', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive')?.waterRings,
        1
    );
    assert.equal(legalActions(game).some((candidate) => candidate.skillId === 'pidgey-gust'), false);
    // Whirlwind is not harmful, so it's untouched by the delay.
    assert.equal(legalActions(game).some((candidate) => candidate.skillId === 'pidgey-whirlwind'), true);
});

test('Scary Face Guard Breaks the target and adds +10 incoming Physical/Special damage for 2 turns', () => {
    let game = matchup({ seed: 2 });
    game = step(game, action('A', 0, 'totodile-scary-face', 'B', 0));

    const status = game.teams.B[0].statuses.find((entry) => entry.id === 'totodile-scary-face-active');
    assert.equal(status.guardBroken, true);
    assert.deepEqual(status.incomingDamageBonusBySkillClass, { Physical: 10, Special: 10 });
});

test('Water Rings heal 5 HP per ring at the start of each of Totodile’s turns', () => {
    let game = matchup({ seed: 3 });
    game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive').waterRings = 2;
    game.teams.A[0].hp = 50;
    game = step(game, action('A', 1, 'charmander-scratch', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    assert.equal(game.teams.A[0].hp, 60);
});

test('Aqua Tail deals 45 piercing damage and consumes all Water Rings into a stun lasting one turn per ring', () => {
    let game = matchup({ seed: 4 });
    game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive').waterRings = 3;
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'totodile-aqua-tail', 'B', 0));

    assert.equal(game.teams.B[0].hp, 55);
    assert.equal(game.teams.B[0].statuses.find((status) => status.id === 'totodile-aqua-tail-stun')?.durationActions, 3);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive')?.waterRings,
        0
    );
});

test('Superpower empowers the next Aqua Tail by 10, which then permanently loses 5 damage', () => {
    let game = matchup({ seed: 5 });
    game = step(game, action('A', 0, 'totodile-superpower', 'A', 0));
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive')?.aquaTailModifier,
        10
    );

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'totodile-aqua-tail', 'B', 0));

    assert.equal(game.teams.B[0].hp, 45);
    const tracker = game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive');
    assert.equal(tracker.aquaTailModifier, -5);
    assert.equal(tracker.aquaTailEmpoweredFlag, 0);
});

test('Water Rings loses 1 ring when hit by a new non-Strategic enemy skill', () => {
    let game = matchup({ seed: 6 });
    game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive').waterRings = 2;
    game = step(game, action('A', 1, 'charmander-scratch', 'B', 0));
    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'totodile-water-rings-passive')?.waterRings,
        1
    );
});
