import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, legalActions } from '../reference/engine.mjs';
import { ROSTER, unitPresentation } from '../reference/roster.mjs';

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

test('Ditto exposes exactly four Transform skills', () => {
    assert.equal(ROSTER.ditto.skills.length, 4);
    assert.deepEqual(ROSTER.ditto.forms.base.skillIds, [
        'ditto-transform-1', 'ditto-transform-2', 'ditto-transform-3', 'ditto-transform-4',
    ]);
});

test('Ditto auto-transforms into the enemy directly opposite it at game start', () => {
    const game = createGame({
        seed: 1,
        teams: {
            A: ['ditto', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });

    assert.equal(game.teams.A[0].effectiveSpeciesId, 'pidgey');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, [
        'pidgey-gust', 'pidgey-whirlwind', 'pidgey-peck', 'pidgey-sand-attack',
    ]);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'ditto-transformation-active')?.outgoingDamageDebuff,
        5
    );
});

test('Ditto’s copied skills cost only Random energy and deal 5 less damage', () => {
    let game = createGame({
        seed: 2,
        teams: {
            A: ['ditto', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });

    const costs = legalActions(game).filter((candidate) => candidate.actorSlot === 0);
    assert.ok(costs.length > 0);
    assert.equal(costs.every((candidate) => candidate.energyCosts.every((cost) => cost === 'random')), true);

    game.teams.B[1].hp = 100;
    game = step(game, action('A', 0, 'pidgey-peck', 'B', 1));
    assert.equal(game.teams.B[1].hp, 85);
});

test('Ditto stays untransformed when the opposing character is another Ditto', () => {
    const game = createGame({
        seed: 3,
        teams: {
            A: ['ditto', 'charmander', 'squirtle'],
            B: ['ditto', 'zubat', 'chansey'],
        },
    });

    assert.equal(game.teams.A[0].effectiveSpeciesId, null);
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, [
        'ditto-transform-1', 'ditto-transform-2', 'ditto-transform-3', 'ditto-transform-4',
    ]);
});

test('Ditto can manually Transform into a living ally or enemy', () => {
    let game = createGame({
        seed: 4,
        teams: {
            A: ['ditto', 'charmander', 'squirtle'],
            B: ['ditto', 'zubat', 'chansey'],
        },
    });
    game = step(game, action('A', 0, 'ditto-transform-1', 'A', 1));

    assert.equal(game.teams.A[0].effectiveSpeciesId, 'charmander');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, [
        'charmander-ember', 'charmander-scratch', 'charmander-flamethrower', 'charmander-rage',
    ]);
});
