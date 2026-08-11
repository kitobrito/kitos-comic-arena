import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    legalActions,
    replay,
    resolveQueuedTurn,
    validateAction,
} from '../reference/engine.mjs';
import { Energy, ROSTER } from '../reference/roster.mjs';

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

const teams = {
    A: ['machop', 'charmander', 'squirtle'],
    B: ['chansey', 'scyther', 'pidgey'],
};

test('Machop and Machoke expose four current active slots with matching costs', () => {
    const machop = ROSTER.machop;
    assert.equal(machop.skills.length, 8);
    assert.deepEqual(machop.forms.base.skillIds, [
        'machop-brick-break', 'machop-counter', 'machop-bulk-up', 'machop-taunt',
    ]);
    assert.deepEqual(machop.forms.machoke.skillIds, [
        'machoke-brick-break', 'machoke-counter', 'machoke-bulk-up', 'machoke-taunt',
    ]);
    assert.deepEqual(machop.skills.find((skill) => skill.id === 'machop-brick-break').energy, [
        Energy.NINJUTSU, Energy.RANDOM,
    ]);
    assert.deepEqual(machop.skills.find((skill) => skill.id === 'machoke-brick-break').energy, [
        Energy.NINJUTSU, Energy.RANDOM, Energy.RANDOM,
    ]);
});

test('the second Bulk Up evolves Machop while preserving stacked defense and damage', () => {
    let game = createGame({ seed: 977, teams });
    game.teams.A[0].hp = 80;
    game = enact(game, action('A', 0, 'machop-bulk-up', 'A', 0));
    assert.equal(game.teams.A[0].shield, 10);
    assert.equal(game.teams.A[0].counters['bulk-up'], 1);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'machop-bulk-up-bonus')
            ?.machopBulkUpBonus,
        5
    );

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['machop-bulk-up'];
    game = enact(game, action('A', 0, 'machop-bulk-up', 'A', 0));
    assert.equal(game.teams.A[0].form, 'machoke');
    assert.equal(game.teams.A[0].hp, 90);
    assert.equal(game.teams.A[0].shield, 20);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'machop-bulk-up-bonus')
            ?.machopBulkUpBonus,
        10
    );
});

test('Brick Break gains its bonus only after destroying defense and consumes Bulk Up', () => {
    let plain = createGame({ seed: 983, teams });
    plain = enact(plain, action('A', 0, 'machop-brick-break', 'B', 0));
    assert.equal(plain.teams.B[0].hp, 60);

    let shielded = createGame({ seed: 991, teams });
    shielded.teams.B[0].shield = 20;
    shielded = enact(shielded, action('A', 0, 'machop-bulk-up', 'A', 0));
    ready(shielded, 'A');
    shielded = enact(shielded, action('A', 0, 'machop-brick-break', 'B', 0));
    assert.equal(shielded.teams.B[0].shield, 0);
    assert.equal(shielded.teams.B[0].hp, 45);
    assert.equal(
        shielded.teams.A[0].statuses.some((status) => status.id === 'machop-bulk-up-bonus'),
        false
    );
});

test('Counter cancels the first new damaging skill, reflects damage, and evolves Machop', () => {
    let game = createGame({ seed: 997, teams });
    game.teams.A[0].hp = 80;
    game = enact(game, action('A', 0, 'machop-counter', 'B', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].hp, 90);
    assert.equal(game.teams.A[0].form, 'machoke');
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'machop-counter-mark'), false);
    assert.equal(
        game.events.some((event) => event.kind === 'countered' && event.skillId === 'chansey-eggbomb'),
        true
    );
});

test('Counter stores and consumes Bulk Up even if the target lets the mark expire', () => {
    let game = createGame({ seed: 1009, teams });
    game = enact(game, action('A', 0, 'machop-bulk-up', 'A', 0));
    ready(game, 'A');
    game = enact(game, action('A', 0, 'machop-counter', 'B', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'machop-bulk-up-bonus'), false);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'machop-counter-mark')?.storedBulkUpBonus,
        5
    );
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(game.teams.A[0].form, 'machoke');
});

test('Taunt restricts targets and helpful skills while reducing Physical damage', () => {
    let game = createGame({ seed: 1013, teams });
    game = enact(game, action('A', 0, 'machop-taunt', 'B', 1));
    const scytherActions = legalActions(game, 'B').filter((entry) => entry.actorSlot === 1);
    assert.equal(scytherActions.length > 0, true);
    assert.equal(scytherActions.every((entry) =>
        entry.targetPlayer === 'A' && entry.targetSlot === 0 &&
        ['scyther-fury-cutter', 'scyther-x-cutter'].includes(entry.skillId)
    ), true);
    assert.match(
        validateAction(game, action('B', 1, 'scyther-fury-cutter', 'A', 1)),
        /taunted/
    );
    game = enact(game, action('B', 1, 'scyther-fury-cutter', 'A', 0));
    assert.equal(game.teams.A[0].hp, 93);
});

test('Machoke Bulk Up empowers Brick Break and adds a non-Mental stun', () => {
    let game = createGame({ seed: 1019, teams });
    game.teams.A[0].form = 'machoke';
    game.teams.B[0].shield = 20;
    game = enact(game, action('A', 0, 'machoke-bulk-up', 'A', 0));
    assert.equal(game.teams.A[0].shield, 20);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'machoke-brick-break', 'B', 0));
    assert.equal(game.teams.B[0].hp, 30);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'machoke-brick-break-stun'),
        true
    );
    assert.match(
        validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)),
        /non-Mental/
    );
});

test('Machoke Counter doubles reflected damage and upgraded Taunt lasts three target turns', () => {
    let game = createGame({ seed: 1021, teams });
    game.teams.A[0].form = 'machoke';
    game = enact(game, action('A', 0, 'machoke-counter', 'B', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.B[0].hp, 50);

    ready(game, 'A');
    game = enact(game, action('A', 0, 'machoke-taunt', 'B', 1));
    assert.equal(
        game.teams.B[1].statuses.find((status) => status.id === 'machop-taunt')?.durationActions,
        3
    );
});

test('Counter evolution replays deterministically', () => {
    let game = createGame({ seed: 1031, teams });
    game = enact(game, action('A', 0, 'machop-counter', 'B', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
