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
            A: ['mew', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Mew exposes exactly four single-form skills', () => {
    assert.equal(ROSTER.mew.skills.length, 4);
    assert.equal(ROSTER.mew.forms.base.skillIds.length, 4);
    assert.deepEqual(ROSTER.mew.forms.base.skillIds, [
        'mew-psychic-barrier', 'mew-psychic', 'mew-pink-bubble', 'mew-life-dew',
    ]);
});

test('Psychic Barrier stacks permanently and inflates the target’s Random cost', () => {
    let game = matchup();
    game = step(game, action('A', 0, 'mew-psychic-barrier', 'B', 2));
    assert.equal(game.teams.B[2].barrier, 15);

    game = step(game, action('B', 0, 'pidgey-gust', 'A', 1));
    game = step(game, action('A', 0, 'mew-pink-bubble', 'A', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'mew-psychic-barrier', 'B', 2));

    assert.equal(game.teams.B[2].barrier, 30);
    fullEnergy(game, 'B');
    assert.deepEqual(
        legalActions(game).find((candidate) => candidate.skillId === 'chansey-eggbomb')?.energyCosts,
        ['random', 'random']
    );
});

test('Psychic deals 30 damage and, while Barrier remains, zeroes the target’s next harmful skill', () => {
    let game = matchup({ seed: 2 });
    game = step(game, action('A', 0, 'mew-psychic-barrier', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'mew-psychic', 'B', 0));

    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'mew-psychic-suppression'),
        true
    );

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
});

test('Psychic does not suppress the target when Barrier is absent', () => {
    let game = matchup({ seed: 6 });
    game = step(game, action('A', 0, 'mew-psychic', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'mew-psychic-suppression'),
        false
    );
});

test('Pink Bubble grants 15 stacking Shield and reduces the holder’s Random cost by 1', () => {
    let game = matchup({ seed: 3 });
    game = step(game, action('A', 0, 'mew-pink-bubble', 'A', 1));

    assert.equal(game.teams.A[1].shield, 15);
    assert.equal(game.teams.A[0].shield, 0);
    const bubble = game.teams.A[1].statuses.find((status) => status.id === 'mew-pink-bubble-active');
    assert.equal(bubble.randomCostReduction, 1);
    assert.equal(bubble.trackedShieldPoints, 15);

    game.currentPlayer = 'A';
    fullEnergy(game, 'A');
    assert.deepEqual(
        legalActions(game).find((candidate) => candidate.skillId === 'mew-psychic')?.energyCosts,
        ['ninjutsu', 'random']
    );
    game.teams.A[0].statuses.push({ ...bubble, sourceSlot: 0 });
    assert.deepEqual(
        legalActions(game).find((candidate) => candidate.skillId === 'mew-psychic')?.energyCosts,
        ['ninjutsu']
    );
});

test('Life Dew consumes Pink Bubble Shield into permanent max HP and heals 25% of the new maximum', () => {
    let game = matchup({ seed: 4 });
    game = step(game, action('A', 0, 'mew-pink-bubble', 'A', 0));
    game = step(game, action('B', 0, 'pidgey-gust', 'A', 2));
    game = step(game, action('A', 0, 'mew-psychic-barrier', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 2));
    game = step(game, action('A', 0, 'mew-pink-bubble', 'A', 1));

    game.teams.A[0].hp = 50;
    game.teams.A[1].hp = 50;
    const mewShieldBeforeDew = game.teams.A[0].shield;
    assert.equal(game.teams.A[1].shield, 15);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 2));
    game = step(game, action('A', 0, 'mew-life-dew', 'A', 1));

    assert.equal(game.teams.A[0].maxHp, 100 + mewShieldBeforeDew);
    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(game.teams.A[0].hp, 50 + Math.floor(game.teams.A[0].maxHp * 0.25));

    assert.equal(game.teams.A[1].maxHp, 115);
    assert.equal(game.teams.A[1].shield, 0);
    assert.equal(game.teams.A[1].hp, 50 + Math.floor(115 * 0.25));
});
