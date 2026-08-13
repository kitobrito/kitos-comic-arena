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
            A: ['nincada', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Nincada exposes its own four skills plus Ninjask’s and Shedinja’s four each', () => {
    assert.equal(ROSTER.nincada.skills.length, 12);
    assert.deepEqual(ROSTER.nincada.forms.base.skillIds, [
        'nincada-metal-claw', 'nincada-struggle-bug', 'nincada-hidden-power', 'nincada-evolve',
    ]);
    assert.deepEqual(ROSTER.nincada.forms.ninjask.skillIds, [
        'ninjask-skitter-smack', 'ninjask-shadow-ball', 'ninjask-extreme-speed', 'ninjask-double-team',
    ]);
    assert.deepEqual(ROSTER.nincada.forms.shedinja.skillIds, [
        'shedinja-bug-buzz', 'shedinja-feint-attack', 'shedinja-solar-beam', 'shedinja-hex',
    ]);
});

test('Metal Claw deals 15 damage and grants 15 shield, both boosted by 10 while already shielded', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'nincada-metal-claw', 'B', 0));
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.A[0].shield, 15);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'nincada-metal-claw', 'B', 0));
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.A[0].shield, 40);
});

test('Struggle Bug cancels the first enemy Physical hit, reflects 15 damage, and grants 25% evasion', () => {
    let game = matchup();
    game = step(game, action('A', 0, 'nincada-struggle-bug', 'A', 0));

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'nincada-struggle-bug-evasion')?.evadeChancePercent,
        25
    );
});

test('Hidden Power deals a random 10/20/30 damage and stuns Metal Claw plus itself when it rolls 30', () => {
    let game = matchup({ seed: 999983 });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'nincada-hidden-power', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);

    game.currentPlayer = 'A';
    fullEnergy(game, 'A');
    assert.equal(
        validateAction(game, action('A', 0, 'nincada-metal-claw', 'B', 0)),
        "This Pokemon's Metal Claw skills are stunned."
    );
    assert.equal(validateAction(game, action('A', 0, 'nincada-struggle-bug', 'A', 0)), null);
});

test('Evolve at 50+ damage and 50+ HP turns Nincada into Ninjask and revives the lowest-slot fainted ally as Shedinja', () => {
    let game = matchup({ seed: 2 });
    game.teams.A[0].counters.nincadaDamage = 50;
    game.teams.A[1].alive = false;
    game.teams.A[1].hp = 0;
    game.teams.A[0].hp = 60;
    game = step(game, action('A', 0, 'nincada-evolve', 'A', 0));

    assert.equal(game.teams.A[0].form, 'ninjask');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, [
        'ninjask-skitter-smack', 'ninjask-shadow-ball', 'ninjask-extreme-speed', 'ninjask-double-team',
    ]);

    assert.equal(game.teams.A[1].alive, true);
    assert.equal(game.teams.A[1].maxHp, 1);
    assert.equal(game.teams.A[1].hp, 1);
    assert.equal(game.teams.A[1].effectiveSpeciesId, 'nincada');
    assert.equal(game.teams.A[1].effectiveForm, 'shedinja');
    assert.deepEqual(unitPresentation(game.teams.A[1]).skillIds, [
        'shedinja-bug-buzz', 'shedinja-feint-attack', 'shedinja-solar-beam', 'shedinja-hex',
    ]);
    assert.equal(
        game.teams.A[1].statuses.find((status) => status.id === 'shedinja-wonder-guard-passive')?.ignoreNextEnemyDamageEffects,
        3
    );
});

test('Evolve below 50 HP still revives a fainted ally as Shedinja but does not evolve Nincada into Ninjask', () => {
    let game = matchup({ seed: 3 });
    game.teams.A[0].counters.nincadaDamage = 50;
    game.teams.A[2].alive = false;
    game.teams.A[2].hp = 0;
    game.teams.A[0].hp = 40;
    game = step(game, action('A', 0, 'nincada-evolve', 'A', 0));

    assert.equal(game.teams.A[0].form, 'base');
    assert.equal(game.teams.A[2].alive, true);
    assert.equal(game.teams.A[2].effectiveSpeciesId, 'nincada');
    assert.equal(game.teams.A[2].effectiveForm, 'shedinja');
});

test('Evolve requires 50 total damage dealt before it becomes usable', () => {
    const game = matchup({ seed: 4 });
    game.teams.A[0].counters.nincadaDamage = 49;
    assert.equal(
        validateAction(game, action('A', 0, 'nincada-evolve', 'A', 0)),
        'Requires at least 50 nincadaDamage.'
    );
});

test('Shedinja’s Bug Buzz silences non-damage effects and Hex permanently stacks Special vulnerability', () => {
    let game = matchup({ seed: 5 });
    game.teams.A[0].counters.nincadaDamage = 50;
    game.teams.A[1].alive = false;
    game.teams.A[1].hp = 0;
    game.teams.A[0].hp = 60;
    game = step(game, action('A', 0, 'nincada-evolve', 'A', 0));

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 1, 'shedinja-bug-buzz', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'shedinja-bug-buzz-silence'),
        true
    );

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 1));
    game = step(game, action('A', 1, 'shedinja-hex', 'B', 0));
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'shedinja-hex-vulnerability')?.incomingDamageBonusBySkillClass,
        { Special: 5 }
    );
});
