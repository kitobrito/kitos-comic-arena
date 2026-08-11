import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createGame,
    exportReplay,
    legalQueuedActions,
    replay,
    resolveQueuedTurn,
    validateQueuedAction,
} from '../reference/engine.mjs';

const action = (actorSlot, skillId, targetPlayer, targetSlot) => ({
    player: 'A',
    actorSlot,
    skillId,
    targetPlayer,
    targetSlot,
});

test('queued planning reserves energy and permits each Pokemon to act only once', () => {
    const state = createGame({ seed: 12 });
    state.energy.A = { taijutsu: 0, ninjutsu: 0, bloodline: 1, genjutsu: 0 };
    const queued = [action(0, 'charmander-rage', 'A', 0)];

    assert.deepEqual(legalQueuedActions(state, queued), []);
    assert.match(
        validateQueuedAction(state, queued, action(0, 'charmander-ember', 'B', 0)),
        /once per team turn/
    );
});

test('three queued Pokemon actions resolve in order and advance one team turn', () => {
    const state = createGame({ seed: 24 });
    const turn = [
        action(0, 'charmander-rage', 'A', 0),
        action(1, 'squirtle-water-gun', 'B', 0),
        action(2, 'bulbasaur-vine-whip', 'B', 1),
    ];
    const result = resolveQueuedTurn(state, turn);

    assert.equal(result.ok, true);
    assert.equal(result.state.turnNumber, 1);
    assert.equal(result.state.currentPlayer, 'B');
    assert.equal(result.state.actions.length, 3);
    assert.deepEqual(result.state.turns, [turn]);
    assert.equal(result.state.teams.A[2].counters.sun ?? 0, 0);
});

test('an inactive Bulbasaur gains Sun once per resolved team turn', () => {
    const state = createGame({ seed: 36 });
    const result = resolveQueuedTurn(state, [action(0, 'charmander-scratch', 'B', 0)]);

    assert.equal(result.ok, true);
    assert.equal(result.state.teams.A[2].counters.sun, 1);
    assert.equal(result.state.turnNumber, 1);
});

test('queued turn replay reproduces the deterministic authoritative state', () => {
    const state = createGame({ seed: 48 });
    const resolved = resolveQueuedTurn(state, [
        action(0, 'charmander-rage', 'A', 0),
        action(1, 'squirtle-water-gun', 'B', 0),
    ]);
    const reproduced = replay(exportReplay(resolved.state));

    assert.equal(resolved.ok, true);
    assert.equal(reproduced.ok, true);
    assert.deepEqual(reproduced.state, resolved.state);
});

test('a later queued action is skipped deterministically if its target was defeated', () => {
    const state = createGame({ seed: 60 });
    state.teams.B[0].hp = 10;
    const result = resolveQueuedTurn(state, [
        action(0, 'charmander-scratch', 'B', 0),
        action(1, 'squirtle-water-gun', 'B', 0),
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.state.teams.B[0].alive, false);
    assert.equal(result.state.actions.length, 1);
    assert.equal(result.state.events.some((event) => event.kind === 'skipped-action'), true);
    assert.equal(result.state.turnNumber, 1);
});

test('an empty pass cannot advance a completed match', () => {
    const state = createGame({ seed: 72 });
    state.winner = 'A';
    const result = resolveQueuedTurn(state, []);

    assert.equal(result.ok, false);
    assert.match(result.error, /already over/);
    assert.equal(result.state.turnNumber, 0);
});
