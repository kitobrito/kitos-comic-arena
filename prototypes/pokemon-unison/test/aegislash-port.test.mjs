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
            A: ['aegislash', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Aegislash exposes exactly four active skills and its passive is not a castable skill', () => {
    assert.equal(ROSTER.aegislash.skills.length, 4);
    assert.deepEqual(ROSTER.aegislash.forms.base.skillIds, [
        'aegislash-slash', 'aegislash-swords-dance',
        'aegislash-kings-shield', 'aegislash-sacred-sword',
    ]);
});

test('Aegislash begins in Shield Stance with 10 shield and 5 unpierceable damage reduction', () => {
    const game = matchup();
    assert.equal(game.teams.A[0].shield, 10);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'aegislash-shield-stance')?.unpierceableDamageReductionFlat,
        5
    );
});

test('Cut deals 20 piercing damage and swaps Shield Stance for Blade Stance', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'aegislash-slash', 'B', 0));

    assert.equal(game.teams.B[0].hp, 80);
    assert.deepEqual(game.teams.A[0].statuses.map((status) => status.id), ['aegislash-blade-stance']);
});

test('Swords Dance permanently boosts Sacred Sword and Cut, and re-enters Shield Stance', () => {
    let game = matchup({ seed: 2 });
    game = step(game, action('A', 0, 'aegislash-slash', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'aegislash-swords-dance', 'A', 0));

    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'aegislash-shield-stance'), true);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'aegislash-blade-stance'), false);
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'aegislash-swords-dance-active')?.skillDamageBonuses,
        { 'aegislash-sacred-sword': 10, 'aegislash-slash': 5 }
    );

    game.teams.B[0].hp = 100;
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 1));
    game = step(game, action('A', 0, 'aegislash-sacred-sword', 'B', 0));
    assert.equal(game.teams.B[0].hp, 60);
    // Sacred Sword swaps back to Blade Stance, but the permanent Swords Dance buff survives.
    assert.deepEqual(
        game.teams.A[0].statuses.map((status) => status.id).sort(),
        ['aegislash-blade-stance', 'aegislash-swords-dance-active']
    );
});

test('King\'s Shield ignores all enemy damage and permanently punishes each attacker once', () => {
    let game = matchup({ seed: 3 });
    game = step(game, action('A', 0, 'aegislash-kings-shield', 'A', 0));

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'aegislash-kings-shield-penalty')?.outgoingDamageDebuff,
        5
    );
});
