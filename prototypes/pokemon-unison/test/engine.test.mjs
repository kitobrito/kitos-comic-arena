import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    legalActions,
    replay,
    typeEffectiveness,
    validateAction,
    viewerState,
} from '../reference/engine.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

test('Water Gun uses the production flat type modifier once with no STAB', () => {
    const game = createGame({
        teams: {
            A: ['squirtle', 'charmander', 'bulbasaur'],
            B: ['charmander', 'zubat', 'chansey'],
        },
    });
    const next = enact(game, action('A', 0, 'squirtle-water-gun', 'B', 0));

    assert.deepEqual(typeEffectiveness('Water', ['Fire']), {
        score: 1,
        modifier: 5,
        label: 'Super Effective',
    });
    assert.equal(next.teams.B[0].hp, 65);
    assert.equal(
        next.events.some((event) => event.kind === 'damage' && event.effectiveness === 5),
        true
    );
});

test('same seed and action transcript always reproduces the same state', () => {
    let game = createGame({ seed: 42 });
    const transcript = [
        action('A', 0, 'charmander-ember', 'B', 1),
        action('B', 1, 'zubat-bite', 'A', 0),
        action('A', 2, 'bulbasaur-leech-seed', 'B', 2),
        action('B', 2, 'chansey-softboil', 'B', 1),
    ];
    transcript.forEach((entry) => {
        game = enact(game, entry);
    });

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});

test('viewer state censors hidden enemy statuses, cooldowns, and exact energy', () => {
    let game = createGame();
    game = enact(game, action('A', 0, 'charmander-rage', 'A', 0));

    const enemyView = viewerState(game, 'B');
    const charmander = enemyView.teams.A[0];
    assert.deepEqual(charmander.statuses, []);
    assert.deepEqual(charmander.cooldowns, {});
    assert.deepEqual(Object.keys(enemyView.energy.A), ['total']);
    assert.equal(enemyView.recentEvents.some((event) => event.statusId === 'rage'), false);

    const ownerView = viewerState(game, 'A');
    assert.equal(ownerView.teams.A[0].statuses[0].id, 'charmander-rage-active');
    assert.equal(ownerView.teams.A[0].cooldowns['charmander-rage'], 4);
});

test('replay export keeps the actual starting player', () => {
    const game = createGame({ seed: 10, startingPlayer: 'B' });
    assert.equal(exportReplay(game).startingPlayer, 'B');
});

test('Withdraw blocks the whole next harmful skill and is consumed', () => {
    let game = createGame();
    game = enact(game, action('A', 1, 'squirtle-withdraw', 'A', 0));
    game = enact(game, action('B', 0, 'pikachu-thundershock', 'A', 0));

    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'withdraw'), false);
    assert.equal(game.events.some((event) => event.kind === 'blocked'), true);
});

test('Leech Seed ticks three times and heals its living source', () => {
    let game = createGame();
    game.teams.A[2].hp = 50;
    game = enact(game, action('A', 2, 'bulbasaur-leech-seed', 'B', 2));
    // The 20 HP immediate burst and the first of two periodic 5 HP ticks both land before
    // the caster's next real action, since the target's turn starts immediately afterward.
    assert.equal(game.teams.B[2].hp, 75);
    assert.equal(game.teams.A[2].hp, 75);

    game = enact(game, legalActions(game)[0]);
    game = enact(game, legalActions(game)[0]);
    assert.equal(game.teams.B[2].hp, 70);
    assert.equal(game.teams.A[2].hp, 80);
});

test('authoritative validation rejects out-of-turn and cross-team targets', () => {
    const game = createGame();
    assert.equal(
        validateAction(game, action('B', 0, 'pikachu-thundershock', 'A', 0)),
        "It is A's turn."
    );
    assert.equal(
        validateAction(game, action('A', 0, 'charmander-ember', 'A', 1)),
        'This skill must target an enemy.'
    );
});

test('legalActions never exposes an invalid target combination', () => {
    const game = createGame();
    const actions = legalActions(game);
    assert.ok(actions.length > 0);
    actions.forEach((entry) => assert.equal(validateAction(game, entry), null));
});

test('a malformed replay stops at the exact invalid action', () => {
    const result = replay({
        seed: 10,
        actions: [action('B', 0, 'pikachu-thundershock', 'A', 0)],
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /^Action 1:/);
});
