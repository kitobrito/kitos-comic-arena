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
            A: ['dragapult', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Dragapult exposes exactly four active skills', () => {
    assert.equal(ROSTER.dragapult.skills.length, 4);
    assert.deepEqual(ROSTER.dragapult.forms.base.skillIds, [
        'dragapult-dragon-darts', 'dragapult-ten-thousand-volt-thunderbolt',
        'dragapult-dragon-tail', 'dragapult-dragon-rush',
    ]);
});

test('Dragon Darts stacks up to 2 and deals 10 damage per stack at the end of the target’s turn', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    assert.equal(game.teams.B[0].hp, 90);

    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'dragapult-dragon-darts-mark')?.dragapultDragonDartsStacks,
        2
    );
    game.teams.B[0].hp = 100;
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 1));
    assert.equal(game.teams.B[0].hp, 80);
});

test('Dragon Darts turn-end damage doubles while the target is stunned', () => {
    let game = matchup({ seed: 2 });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 1));
    game = step(game, action('A', 0, 'dragapult-ten-thousand-volt-thunderbolt', 'B', 0));

    game.teams.B[0].hp = 100;
    game = step(game, action('B', 1, 'zubat-draining-fangs', 'B', 1));
    assert.equal(game.teams.B[0].hp, 60);
});

test('Dragon Tail deals 30 damage and stuns Special skills for 2 turns', () => {
    let game = matchup({ seed: 3 });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'dragapult-dragon-tail', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'dragapult-dragon-tail-special-stun')?.cannotUseSkillClasses,
        ['Special']
    );
});

test('Dragon Rush is invulnerable, deals 30 damage, and fully stuns the target for 1 turn per Dragon Darts stack', () => {
    let game = matchup({ seed: 4 });
    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'dragapult-dragon-darts', 'B', 0));
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 1));

    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'dragapult-dragon-rush', 'B', 0));

    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'dragapult-dragon-rush-invulnerable'), true);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'dragapult-dragon-rush-stun')?.durationActions,
        2
    );
});

test('Dragon Rush applies no stun when the target has no Dragon Darts stacks', () => {
    let game = matchup({ seed: 5 });
    game = step(game, action('A', 0, 'dragapult-dragon-rush', 'B', 0));
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'dragapult-dragon-rush-stun'), false);
});
