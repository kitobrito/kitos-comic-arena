import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, validateAction } from '../reference/engine.mjs';
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

function matchup({ seed = 1 } = {}) {
    return createGame({
        seed,
        teams: {
            A: ['scraggy', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Scraggy and Scrafty expose four active skills each', () => {
    assert.equal(ROSTER.scraggy.skills.length, 8);
    assert.deepEqual(ROSTER.scraggy.forms.base.skillIds, [
        'scraggy-headbutt', 'scraggy-leer', 'scraggy-hi-jump-kick', 'scraggy-focus-blast',
    ]);
    assert.deepEqual(ROSTER.scraggy.forms.scrafty.skillIds, [
        'scrafty-headbutt', 'scrafty-leer', 'scrafty-hi-jump-kick', 'scrafty-focus-blast',
    ]);
});

test('Headbutt deals 20 damage, boosted to 25 against a stunned target', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'scraggy-headbutt', 'B', 0));
    assert.equal(game.teams.B[0].hp, 80);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'scraggy-leer', 'B', 0));
    game.teams.B[0].hp = 100;
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 1));
    game = step(game, action('A', 0, 'scraggy-headbutt', 'B', 0));
    assert.equal(game.teams.B[0].hp, 75);
});

test('Leer stuns harmful skills for 1 turn and Physical skills for 2, and grants 1 Focus Energy', () => {
    let game = matchup({ seed: 2 });
    game = step(game, action('A', 0, 'scraggy-leer', 'B', 0));

    assert.equal(game.teams.A[0].counters.focusEnergy, 1);
    assert.equal(
        validateAction(game, action('B', 0, 'pidgey-gust', 'A', 0)),
        "This Pokemon's Physical skills are stunned."
    );
});

test('Hi Jump Kick cannot miss a stunned target and lands for 35 damage plus 1 Focus Energy', () => {
    let game = matchup({ seed: 3 });
    game = step(game, action('A', 0, 'scraggy-leer', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'scraggy-hi-jump-kick', 'B', 0));

    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(game.teams.A[0].counters.focusEnergy, 2);
});

test('Hi Jump Kick can miss an unstunned target, dealing 25 fixed self-damage instead', () => {
    let game = matchup({ seed: 999983 });
    game = step(game, action('A', 0, 'scraggy-hi-jump-kick', 'B', 0));
    assert.equal(game.teams.B[0].hp, 100);
    assert.equal(game.teams.A[0].hp, 75);
});

test('Focus Blast requires at least 1 Focus Energy and deals 40 piercing damage at the start of the target’s following turn', () => {
    let game = matchup({ seed: 4 });
    assert.equal(
        validateAction(game, action('A', 0, 'scraggy-focus-blast', 'B', 0)),
        'Requires at least 1 focusEnergy.'
    );

    game.teams.A[0].counters.focusEnergy = 1;
    game = step(game, action('A', 0, 'scraggy-focus-blast', 'B', 0));
    game.teams.B[0].hp = 100;

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    assert.equal(game.teams.B[0].hp, 100);

    game = step(game, action('A', 1, 'charmander-scratch', 'B', 1));
    assert.equal(game.teams.B[0].hp, 60);
});

test('Reaching 3 Focus Energy stacks evolves Scraggy into Scrafty with improved skills', () => {
    let game = matchup({ seed: 5 });
    game.teams.A[0].counters.focusEnergy = 2;
    game = step(game, action('A', 0, 'scraggy-leer', 'B', 0));

    assert.equal(game.teams.A[0].form, 'scrafty');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, [
        'scrafty-headbutt', 'scrafty-leer', 'scrafty-hi-jump-kick', 'scrafty-focus-blast',
    ]);
});
