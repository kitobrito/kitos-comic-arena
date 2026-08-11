import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
    resolveQueuedTurn,
    validateAction,
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

function ready(state, player) {
    state.currentPlayer = player;
    state.winner = null;
    state.energy[player] = {
        [Energy.TAIJUTSU]: 10,
        [Energy.NINJUTSU]: 10,
        [Energy.BLOODLINE]: 10,
        [Energy.GENJUTSU]: 10,
    };
    return state;
}

const krabbyTeams = {
    A: ['krabby', 'charmander', 'squirtle'],
    B: ['pidgey', 'zubat', 'chansey'],
};

test('Krabby and Kingler expose four current active slots with matching costs', () => {
    const krabby = ROSTER.krabby;
    assert.equal(krabby.skills.length, 8);
    assert.deepEqual(krabby.types, ['Water']);
    assert.deepEqual(krabby.forms.base.skillIds, [
        'krabby-metal-claw',
        'krabby-leer',
        'krabby-crabhammer',
        'krabby-harden',
    ]);
    assert.deepEqual(krabby.forms.kingler.skillIds, [
        'kingler-metal-claw',
        'kingler-leer',
        'kingler-crabhammer',
        'kingler-harden',
    ]);
    assert.deepEqual(krabby.skills.find((skill) => skill.id === 'krabby-leer').energy, [Energy.RANDOM]);
    assert.deepEqual(krabby.skills.find((skill) => skill.id === 'kingler-crabhammer').energy, [Energy.BLOODLINE, Energy.BLOODLINE]);
    assert.deepEqual(krabby.skills.find((skill) => skill.id === 'kingler-harden').energy, [Energy.RANDOM, Energy.RANDOM]);
});

test('Metal Claw pierces reduction, consumes shield, and stacks its seeded permanent bonus', () => {
    let game = createGame({ seed: 0, teams: krabbyTeams });
    game.teams.B[0].shield = 20;
    game.teams.B[0].statuses.push({
        id: 'test-reduction', name: 'Reduction', harmful: false,
        durationActions: null, damageReductionPercent: 90,
    });
    game = enact(game, action('A', 0, 'krabby-metal-claw', 'B', 0));
    assert.equal(game.teams.B[0].hp, 100);
    assert.equal(game.teams.B[0].shield, 0);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'krabby-metal-claw-bonus')?.nonAfflictionDamageBonusFlat,
        5
    );

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['krabby-metal-claw'];
    game = enact(game, action('A', 0, 'krabby-metal-claw', 'B', 1));
    assert.equal(game.teams.B[1].hp, 75);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'krabby-metal-claw-bonus')?.nonAfflictionDamageBonusFlat,
        10
    );
});

test('Bubble only increases active cooldowns and Drenched adds random cost and Physical damage', () => {
    let game = createGame({ seed: 999999, teams: krabbyTeams });
    game.teams.B[0].cooldowns['pidgey-whirlwind'] = 2;
    game = enact(game, action('A', 0, 'krabby-leer', 'B', 0));

    assert.deepEqual(game.teams.B[0].cooldowns, { 'pidgey-whirlwind': 2 });
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'krabby-bubble-drenched'), true);
    game.energy.B = {
        [Energy.TAIJUTSU]: 0,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 1,
        [Energy.GENJUTSU]: 0,
    };
    assert.equal(
        validateAction(game, action('B', 0, 'pidgey-gust', 'A', 0)),
        'Not enough energy.'
    );

    ready(game, 'A');
    game = enact(game, action('A', 1, 'charmander-scratch', 'B', 0));
    assert.equal(game.teams.B[0].hp, 50);
});

test('Crabhammer stuns all skills and resolves its deterministic critical packet', () => {
    let game = createGame({ seed: 0, teams: krabbyTeams });
    game = enact(game, action('A', 0, 'krabby-crabhammer', 'B', 0));

    assert.equal(game.teams.B[0].hp, 60);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'krabby-crabhammer-stun'), true);
    assert.match(
        validateAction(game, action('B', 0, 'pidgey-gust', 'A', 0)),
        /cannot use skills/
    );
});

test('Harden evolves Krabby only after three owner turn starts with tracked shield remaining', () => {
    let game = createGame({ seed: 521, teams: krabbyTeams });
    game = enact(game, action('A', 0, 'krabby-harden', 'A', 0));
    assert.equal(game.teams.A[0].shield, 20);
    assert.equal(game.teams.A[0].counters.evolution, undefined);

    for (let turn = 1; turn <= 3; turn += 1) {
        game = pass(game);
        assert.equal(game.currentPlayer, 'A');
        assert.equal(game.teams.A[0].counters.evolution, turn);
        if (turn < 3) game = pass(game);
    }

    assert.equal(game.teams.A[0].form, 'kingler');
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'krabby-harden-turn-tracker'), false);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Kingler');

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});

test('destroying all Harden shield removes its evolution clock', () => {
    let game = createGame({ seed: 557, teams: krabbyTeams });
    game = enact(game, action('A', 0, 'krabby-harden', 'A', 0));
    game = enact(game, action('B', 0, 'pidgey-peck', 'A', 0));

    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'krabby-harden-defense'), false);
    game = pass(game);
    assert.equal(game.teams.A[0].counters.evolution, undefined);
});

test('Kingler Bubble hits the enemy team while modifying only its main target', () => {
    let game = createGame({ seed: 601, teams: krabbyTeams });
    game.teams.A[0].form = 'kingler';
    game.teams.B[0].cooldowns['pidgey-whirlwind'] = 1;
    game = enact(game, action('A', 0, 'kingler-leer', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 90, 90]);
    assert.deepEqual(game.teams.B[0].cooldowns, { 'pidgey-whirlwind': 2 });
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'kingler-bubble-drenched')?.physicalDamageTakenBonusFlat,
        15
    );
    assert.equal(game.teams.B[1].statuses.some((status) => status.id === 'kingler-bubble-drenched'), false);
});

test('Rare Candy immediately evolves Krabby while keeping Harden usable as Kingler', () => {
    const teams = {
        A: ['pokemon-trainer', 'krabby', 'squirtle'],
        B: ['pidgey', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 619, teams });
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(game.teams.A[1].form, 'kingler');
    assert.equal(game.teams.A[1].shield, 25);

    ready(game, 'A');
    game = enact(game, action('A', 1, 'kingler-harden', 'A', 1));
    assert.equal(game.teams.A[1].shield, 55);
    assert.equal(
        game.teams.A[1].statuses.find((status) => status.id === 'krabby-harden-guard')?.damageReductionPercent,
        50
    );
});
