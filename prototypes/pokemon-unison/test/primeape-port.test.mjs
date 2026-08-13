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

function matchup({ seed = 1, teams } = {}) {
    return createGame({
        seed,
        teams: teams ?? {
            A: ['primeape', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Primeape exposes exactly four active skills', () => {
    assert.equal(ROSTER.primeape.skills.length, 4);
    assert.deepEqual(ROSTER.primeape.forms.base.skillIds, [
        'primeape-rock-smash', 'primeape-knock-off', 'primeape-rage-fist', 'primeape-close-combat',
    ]);
});

test('Rock Smash destroys Primeape’s own Barrier and the target’s Shield, deals 20 damage, and empowers Rage Fist only if Barrier was destroyed', () => {
    let game = matchup();
    game.teams.A[0].barrier = 15;
    game.teams.B[0].shield = 10;
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'primeape-rock-smash', 'B', 0));

    assert.equal(game.teams.A[0].barrier, 0);
    assert.equal(game.teams.B[0].shield, 0);
    assert.equal(game.teams.B[0].hp, 80);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'primeape-rock-smash-empowerment'), true);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'primeape-rage-fist', 'B', 0));
    // Ghost vs Pidgey's Normal/Flying typing floors the 15+10 total at a minimum of 5 per hit,
    // and there's only one damage effect here so the floor applies once: 25 -> 15.
    assert.equal(game.teams.B[0].hp, 85);
});

test('Rock Smash grants no empowerment when Primeape has no Barrier to destroy', () => {
    let game = matchup({ seed: 2 });
    game.teams.B[0].shield = 5;
    game = step(game, action('A', 0, 'primeape-rock-smash', 'B', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'primeape-rock-smash-empowerment'), false);
});

test('Knock Off deals 15 damage, strips helpful statuses, blocks Shield gain for 2 turns, and empowers Rock Smash/Close Combat if it stripped something', () => {
    let game = matchup({ seed: 3 });
    game.teams.B[0].statuses.push({
        id: 'test-buff', name: 'Test Buff', hidden: false, harmful: false,
        durationActions: 3, sourcePlayer: 'B', sourceSlot: 0, appliedTurn: 0,
    });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'primeape-knock-off', 'B', 0));

    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'test-buff'), false);
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'primeape-knock-off-empowerment')?.skillDamageBonuses,
        { 'primeape-rock-smash': 10, 'primeape-close-combat': 10 }
    );

    game.teams.B[0].shield = 0;
    game = step(game, action('B', 2, 'chansey-pokemon-center-healing', 'B', 2));
    assert.equal(game.teams.B[0].shield, 0);
    assert.equal(game.teams.B[2].shield, 5);
});

test('Rage Fist deals 15 damage plus 5 per 15 HP lost, and becomes Piercing while Anger Point is active', () => {
    let game = matchup({ seed: 4, teams: { A: ['primeape', 'charmander', 'squirtle'], B: ['abra', 'zubat', 'chansey'] } });
    game = step(game, action('A', 1, 'charmander-scratch', 'B', 1));
    game = step(game, action('B', 0, 'abra-psychic', 'A', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'primeape-anger-point-active'), true);
});

test('Close Combat deals 35 piercing damage (45 below 50 HP) and exposes Primeape to +10 incoming damage for 1 turn', () => {
    let game = matchup({ seed: 5 });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'primeape-close-combat', 'B', 0));
    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'primeape-close-combat-exposure')?.damageTakenBonusFlat,
        10
    );

    let lowHpGame = matchup({ seed: 5 });
    lowHpGame.teams.A[0].hp = 40;
    lowHpGame.teams.B[0].hp = 100;
    lowHpGame = step(lowHpGame, action('A', 0, 'primeape-close-combat', 'B', 0));
    assert.equal(lowHpGame.teams.B[0].hp, 55);
});
