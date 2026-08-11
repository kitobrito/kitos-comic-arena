import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, resolveQueuedTurn, validateAction } from '../reference/engine.mjs';
import { ROSTER } from '../reference/roster.mjs';

const teams = {
    A: ['charmander', 'squirtle', 'bulbasaur'],
    B: ['pikachu', 'zubat', 'chansey'],
};

const action = (player, actorSlot, skillId, targetPlayer, targetSlot) => ({
    player,
    actorSlot,
    skillId,
    targetPlayer,
    targetSlot,
});

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

test('Pikachu exposes all four canonical active skills plus its Static passive', () => {
    assert.deepEqual(ROSTER.pikachu.skills.map((skill) => skill.id), [
        'pikachu-thundershock',
        'pikachu-volt-tackle',
        'pikachu-thunder',
        'pikachu-agility',
    ]);
    const state = createGame({ teams });
    assert.equal(state.teams.B[0].statuses.some((status) => status.id === 'pikachu-static-passive'), true);
});

test('Static damages and marks an enemy that targets Pikachu', () => {
    let state = createGame({ teams });
    state = enact(state, action('A', 0, 'charmander-scratch', 'B', 0));

    assert.equal(state.teams.A[0].hp, 95);
    assert.equal(state.teams.A[0].statuses.some((status) => status.id === 'pikachu-static-mark'), true);
});

test('Thundershock paralyzes cooldown recovery and discounts Thunder for Pikachu next turn', () => {
    let state = createGame({ teams, startingPlayer: 'B' });
    state.teams.A[0].cooldowns['charmander-scratch'] = 3;
    state = enact(state, action('B', 0, 'pikachu-thundershock', 'A', 0));

    assert.equal(state.teams.A[0].cooldowns['charmander-scratch'], 3);
    assert.equal(state.teams.A[0].statuses.some((status) => status.paralyzeCooldowns), true);
    state = resolveQueuedTurn(state, []).state;
    state.energy.B = { taijutsu: 1, ninjutsu: 0, bloodline: 0, genjutsu: 1 };
    assert.equal(validateAction(state, action('B', 0, 'pikachu-thunder', 'A', 0)), null);
});

test('Volt Tackle loses health and Static extends its cooldown shock', () => {
    let state = createGame({ teams });
    state = enact(state, action('A', 0, 'charmander-scratch', 'B', 0));
    state = enact(state, action('B', 0, 'pikachu-volt-tackle', 'A', 0));
    const pikachuHp = state.teams.B[0].hp;
    state = enact(state, action('A', 0, 'charmander-ember', 'B', 1));

    assert.equal(pikachuHp, 65);
    assert.equal(state.teams.A[0].cooldowns['charmander-ember'], 3);
});

test('Thunder consumes a Static setup for bonus damage and harmful-skill stun', () => {
    let state = createGame({ teams });
    state = enact(state, action('A', 0, 'charmander-scratch', 'B', 0));
    state = enact(state, action('B', 0, 'pikachu-thunder', 'A', 0));

    assert.equal(state.teams.A[0].hp, 45);
    assert.equal(state.teams.A[0].statuses.some((status) => status.stunHarmful), true);
    assert.equal(state.teams.A[0].statuses.some((status) => status.id === 'pikachu-static-mark'), true);
});
