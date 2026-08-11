import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
    resolveQueuedTurn,
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

const abraTeams = {
    A: ['abra', 'charmander', 'squirtle'],
    B: ['pidgey', 'zubat', 'chansey'],
};

test('Abra and Kadabra expose four current active slots with matching costs', () => {
    const abra = ROSTER.abra;
    assert.equal(abra.skills.length, 8);
    assert.deepEqual(abra.types, ['Psychic']);
    assert.deepEqual(abra.forms.base.skillIds, [
        'abra-future-sight',
        'abra-psychic',
        'abra-calm-mind',
        'abra-teleport',
    ]);
    assert.deepEqual(abra.forms.kadabra.skillIds, [
        'kadabra-future-sight',
        'kadabra-psychic',
        'kadabra-calm-mind',
        'kadabra-teleport',
    ]);
    assert.deepEqual(abra.skills.find((skill) => skill.id === 'abra-future-sight').energy, [Energy.NINJUTSU]);
    assert.deepEqual(abra.skills.find((skill) => skill.id === 'abra-psychic').energy, [Energy.GENJUTSU, Energy.RANDOM]);
    assert.deepEqual(abra.skills.find((skill) => skill.id === 'abra-calm-mind').energy, [Energy.GENJUTSU]);
    assert.deepEqual(abra.skills.find((skill) => skill.id === 'abra-teleport').energy, [Energy.RANDOM, Energy.RANDOM]);
});

test('Future Sight expires on the second target turn and pierces defense without a type modifier', () => {
    let game = createGame({ seed: 301, teams: abraTeams });
    game.teams.B[0].shield = 50;
    game.teams.B[0].statuses.push({
        id: 'test-reduction',
        name: 'Test Reduction',
        harmful: false,
        durationActions: null,
        damageReductionPercent: 90,
    });
    game = enact(game, action('A', 0, 'abra-future-sight', 'B', 0));

    game = pass(game);
    assert.equal(game.teams.B[0].hp, 100);
    assert.equal(game.teams.B[0].shield, 50);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'abra-future-sight-mark')?.durationActions,
        1
    );

    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.B[0].shield, 50);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'abra-future-sight-mark'), false);

    let deterministic = createGame({ seed: 301, teams: abraTeams });
    deterministic = enact(deterministic, action('A', 0, 'abra-future-sight', 'B', 0));
    deterministic = pass(deterministic);
    deterministic = pass(deterministic);
    deterministic = pass(deterministic);
    const replayed = replay(exportReplay(deterministic));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, deterministic);
});

test('Psychic gains its second packet while Future Sight is active', () => {
    let game = createGame({ seed: 337, teams: abraTeams });
    game = enact(game, action('A', 0, 'abra-future-sight', 'B', 0));
    ready(game, 'A');
    game = enact(game, action('A', 0, 'abra-psychic', 'B', 0));

    assert.equal(game.teams.B[0].hp, 55);
    assert.equal(game.teams.B[0].statuses.some((status) => status.guardBroken), false);
});

test('Calm Mind refreshes its source-turn buff and evolves Abra on its third use', () => {
    let game = createGame({ seed: 353, teams: abraTeams });
    game.teams.A[0].hp = 60;
    game = enact(game, action('A', 0, 'abra-calm-mind', 'A', 0));
    assert.equal(game.teams.A[0].counters.evolution, 1);
    assert.equal(game.teams.A[0].statuses.find((status) => status.id === 'abra-calm-mind-state')?.durationActions, 3);

    game = pass(game);
    assert.equal(game.teams.A[0].statuses.find((status) => status.id === 'abra-calm-mind-state')?.durationActions, 3);
    game = pass(game);
    assert.equal(game.teams.A[0].statuses.find((status) => status.id === 'abra-calm-mind-state')?.durationActions, 2);

    for (let use = 2; use <= 3; use += 1) {
        ready(game, 'A');
        delete game.teams.A[0].cooldowns['abra-calm-mind'];
        game = enact(game, action('A', 0, 'abra-calm-mind', 'A', 0));
        assert.equal(
            game.teams.A[0].statuses.filter((status) => status.id === 'abra-calm-mind-state').length,
            1
        );
    }

    assert.equal(game.teams.A[0].counters.evolution, 3);
    assert.equal(game.teams.A[0].form, 'kadabra');
    assert.equal(game.teams.A[0].hp, 70);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Kadabra');
});

test('Calm Mind adds damage per packet and reduces ordinary incoming damage', () => {
    const teams = {
        A: ['abra', 'squirtle', 'bulbasaur'],
        B: ['charmander', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 999999, teams });
    game = enact(game, action('A', 0, 'abra-calm-mind', 'A', 0));
    game = enact(game, action('B', 0, 'charmander-scratch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 82);

    ready(game, 'A');
    game = enact(game, action('A', 0, 'abra-psychic', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
});

test('Teleport protects Abra and its selected ally through the enemy turn', () => {
    let game = createGame({ seed: 401, teams: abraTeams });
    game = enact(game, action('A', 0, 'abra-teleport', 'A', 1));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'abra-teleport-cover'), true);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'abra-teleport-cover'), true);

    game = enact(game, action('B', 0, 'pidgey-gust', 'A', 1));
    assert.equal(game.teams.A[1].hp, 100);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'abra-teleport-cover'), true);

    game = pass(game);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'abra-teleport-cover'), false);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'abra-teleport-cover'), false);
});

test('Kadabra Teleport cleanses enemy statuses from both protected allies', () => {
    const teams = {
        A: ['pokemon-trainer', 'abra', 'squirtle'],
        B: ['pidgey', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 419, teams });
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(game.teams.A[1].form, 'kadabra');

    for (const slot of [1, 2]) {
        game.teams.A[slot].statuses.push({
            id: `enemy-status-${slot}`,
            name: 'Enemy Status',
            harmful: true,
            durationActions: 3,
            sourcePlayer: 'B',
            sourceSlot: 0,
        });
    }
    ready(game, 'A');
    game = enact(game, action('A', 1, 'kadabra-teleport', 'A', 2));

    for (const slot of [1, 2]) {
        assert.equal(game.teams.A[slot].statuses.some((status) => status.id === `enemy-status-${slot}`), false);
        assert.equal(game.teams.A[slot].statuses.some((status) => status.id === 'abra-teleport-cover'), true);
    }
});

test('Kadabra Psychic adds its marked stun and upgraded damage', () => {
    let game = createGame({ seed: 443, teams: abraTeams });
    game.teams.A[0].form = 'kadabra';
    game = enact(game, action('A', 0, 'kadabra-future-sight', 'B', 0));
    ready(game, 'A');
    game = enact(game, action('A', 0, 'kadabra-psychic', 'B', 0));

    assert.equal(game.teams.B[0].hp, 50);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'kadabra-psychic-stun'), true);
});
