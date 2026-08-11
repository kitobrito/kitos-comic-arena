import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
    resolveQueuedTurn,
} from '../reference/engine.mjs';
import { Energy, ROSTER, unitPresentation } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function pass(state) {
    const result = resolveQueuedTurn(state, []);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function matchup({
    seed = 4096,
    teamA = ['hitmonlee', 'squirtle', 'bulbasaur'],
    teamB = ['hitmonchan', 'chansey', 'eevee'],
} = {}) {
    return createGame({ seed, teams: { A: teamA, B: teamB } });
}

function prepareLowKick(seed = 4096) {
    let game = matchup({ seed });
    game = enact(game, action('A', 0, 'hitmonlee-double-kick', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonlee-low-kick', 'B', 0));
    return game;
}

test('Hitmonlee exposes four production slots, the Low Kick replacement, costs, cooldowns, classes, and artwork', () => {
    const hitmonlee = ROSTER.hitmonlee;

    assert.deepEqual(hitmonlee.types, ['Fighting']);
    assert.deepEqual(hitmonlee.forms.base.skillIds, [
        'hitmonlee-double-kick',
        'hitmonlee-focus-energy',
        'hitmonlee-mega-kick',
        'hitmonlee-high-jump-kick',
    ]);
    assert.deepEqual(
        hitmonlee.skills.map(({ energy, cooldown, classes }) => ({ energy, cooldown, classes })),
        [
            { energy: [Energy.TAIJUTSU], cooldown: 0, classes: ['Fighting', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM], cooldown: 3, classes: ['Normal', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 2, classes: ['Normal', 'Physical', 'Instant'] },
            { energy: [Energy.TAIJUTSU, Energy.TAIJUTSU], cooldown: 2, classes: ['Fighting', 'Physical', 'Instant'] },
            { energy: [Energy.TAIJUTSU], cooldown: 0, classes: ['Fighting', 'Physical', 'Instant'] },
        ]
    );
    hitmonlee.skills.forEach((skill) => assert.match(skill.image, /hitmonlee/i));
});

test('Double Kick rolls each critical independently, Focus Energy raises both chances, and the slot becomes Low Kick', () => {
    let ordinary = matchup({ seed: 4096 });
    ordinary = enact(ordinary, action('A', 0, 'hitmonlee-double-kick', 'B', 0));
    assert.equal(ordinary.teams.B[0].hp, 80);
    assert.equal(unitPresentation(ordinary.teams.A[0]).skillIds[0], 'hitmonlee-low-kick');

    let focused = matchup({ seed: 4096 });
    focused = enact(focused, action('A', 0, 'hitmonlee-focus-energy', 'A', 0));
    focused = pass(focused);
    focused = enact(focused, action('A', 0, 'hitmonlee-double-kick', 'B', 0));
    assert.equal(focused.teams.B[0].hp, 70);
    assert.equal(
        focused.teams.A[0].statuses.find((status) => status.id === 'hitmonlee-focus-energy')
            ?.durationActions,
        1
    );
});

test('Low Kick restores Double Kick and reduces only non-affliction outgoing damage by 15', () => {
    let ordinary = prepareLowKick();
    assert.equal(unitPresentation(ordinary.teams.A[0]).skillIds[0], 'hitmonlee-double-kick');
    ordinary = enact(ordinary, action('B', 0, 'hitmonchan-mega-punch', 'A', 0));
    assert.equal(ordinary.teams.A[0].hp, 100);

    let affliction = prepareLowKick();
    affliction = enact(affliction, action('B', 0, 'hitmonchan-fire-punch', 'A', 0));
    assert.equal(affliction.teams.A[0].hp, 75);
});

test('Focus Energy remains active for exactly two later Hitmonlee turns', () => {
    let game = matchup();
    game = enact(game, action('A', 0, 'hitmonlee-focus-energy', 'A', 0));
    game = pass(game);

    game = pass(game);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'hitmonlee-focus-energy')
            ?.durationActions,
        1
    );
    game = pass(game);
    game = pass(game);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'hitmonlee-focus-energy'),
        false
    );
});

test('Mega Kick preserves the current runtime five-damage critical packet and Focus Energy raises its chance', () => {
    let ordinary = matchup({ seed: 4096 });
    ordinary = enact(ordinary, action('A', 0, 'hitmonlee-mega-kick', 'B', 0));
    assert.equal(ordinary.teams.B[0].hp, 60);

    let focused = matchup({ seed: 4096 });
    focused = enact(focused, action('A', 0, 'hitmonlee-focus-energy', 'A', 0));
    focused = pass(focused);
    focused = enact(focused, action('A', 0, 'hitmonlee-mega-kick', 'B', 0));
    assert.equal(focused.teams.B[0].hp, 55);
});

test('High Jump Kick deterministically resolves an ordinary hit, a focused critical, or a fixed 30-HP miss crash', () => {
    let ordinaryHit = matchup({ seed: 16 });
    ordinaryHit = enact(ordinaryHit, action('A', 0, 'hitmonlee-high-jump-kick', 'B', 0));
    assert.equal(ordinaryHit.teams.B[0].hp, 55);
    assert.equal(ordinaryHit.teams.A[0].hp, 100);

    let focusedHit = matchup({ seed: 16 });
    focusedHit = enact(focusedHit, action('A', 0, 'hitmonlee-focus-energy', 'A', 0));
    focusedHit = pass(focusedHit);
    focusedHit = enact(focusedHit, action('A', 0, 'hitmonlee-high-jump-kick', 'B', 0));
    assert.equal(focusedHit.teams.B[0].hp, 50);
    assert.equal(focusedHit.teams.A[0].hp, 100);

    let miss = matchup({ seed: 11264 });
    miss.teams.A[0].shield = 50;
    miss.teams.A[0].shieldCapacity = 50;
    miss.teams.A[0].statuses.push({
        id: 'test-reduction', name: 'Test Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionPercent: 100,
    });
    miss = enact(miss, action('A', 0, 'hitmonlee-high-jump-kick', 'B', 0));
    assert.equal(miss.teams.B[0].hp, 100);
    assert.equal(miss.teams.A[0].hp, 70);
    assert.equal(miss.teams.A[0].shield, 50);
});

test('Hitmonlee chance branches, Focus Energy, and slot swaps replay deterministically', () => {
    let game = matchup({ seed: 16 });
    game = enact(game, action('A', 0, 'hitmonlee-focus-energy', 'A', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonlee-high-jump-kick', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonlee-double-kick', 'B', 1));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
