import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
    resolveQueuedTurn,
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
    A: ['ekans', 'charmander', 'squirtle'],
    B: ['chansey', 'zubat', 'pidgey'],
};

test('Ekans and Arbok expose four current active slots with matching costs', () => {
    const ekans = ROSTER.ekans;
    assert.equal(ekans.skills.length, 8);
    assert.deepEqual(ekans.forms.base.skillIds, [
        'ekans-poison-fang', 'ekans-toxic', 'ekans-shed-skin', 'ekans-crunch',
    ]);
    assert.deepEqual(ekans.forms.arbok.skillIds, [
        'arbok-poison-fang', 'arbok-toxic', 'arbok-shed-skin', 'arbok-crunch',
    ]);
    assert.deepEqual(ekans.skills.find((skill) => skill.id === 'ekans-poison-fang').energy, [
        Energy.BLOODLINE, Energy.RANDOM,
    ]);
    assert.deepEqual(ekans.skills.find((skill) => skill.id === 'arbok-poison-fang').energy, [
        Energy.BLOODLINE, Energy.RANDOM, Energy.RANDOM,
    ]);
});

test('Badly Poison doubles only when its owner uses each new skill and then ticks', () => {
    let game = createGame({ seed: 907, teams });
    game = enact(game, action('A', 0, 'ekans-toxic', 'B', 0));
    assert.equal(game.teams.B[0].hp, 98);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-badly-poison')?.turnEndDamage,
        2
    );

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 1));
    assert.equal(game.teams.B[0].hp, 94);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-badly-poison')?.turnEndDamage,
        4
    );

    ready(game, 'B');
    delete game.teams.B[0].cooldowns['chansey-eggbomb'];
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 1));
    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-badly-poison')?.turnEndDamage,
        4
    );
});

test('Poison Fang adds and stacks permanent venom only on Badly Poisoned targets', () => {
    let game = createGame({ seed: 911, teams });
    game = enact(game, action('A', 0, 'ekans-poison-fang', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'ekans-poison-fang-venom'),
        false
    );

    ready(game, 'A');
    game = enact(game, action('A', 0, 'ekans-toxic', 'B', 0));
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['ekans-poison-fang'];
    game = enact(game, action('A', 0, 'ekans-poison-fang', 'B', 0));
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['ekans-poison-fang'];
    game = enact(game, action('A', 0, 'ekans-poison-fang', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-poison-fang-venom')?.turnEndDamage,
        6
    );
});

test('Shed Skin removes only enemy affliction effects and heals on two later source turns', () => {
    let game = createGame({ seed: 919, teams });
    game.teams.A[0].hp = 50;
    game.teams.A[0].statuses.push(
        {
            id: 'enemy-affliction', name: 'Enemy Affliction', harmful: true, affliction: true,
            durationActions: null, sourcePlayer: 'B', sourceSlot: 0,
        },
        {
            id: 'enemy-control', name: 'Enemy Control', harmful: true,
            durationActions: null, sourcePlayer: 'B', sourceSlot: 0,
        }
    );
    game = enact(game, action('A', 0, 'ekans-shed-skin', 'A', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'enemy-affliction'), false);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'enemy-control'), true);
    assert.equal(game.teams.A[0].hp, 50);

    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.A[0].hp, 65);
    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.A[0].hp, 80);
});

test('Crunch marks ordinary targets and executes through shield and minimum HP at 25', () => {
    let game = createGame({ seed: 929, teams });
    game.teams.B[0].hp = 26;
    game = enact(game, action('A', 0, 'ekans-crunch', 'B', 0));
    assert.equal(game.teams.B[0].alive, true);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-crunch-mark')
            ?.afflictionDamageTakenBonusFlat,
        10
    );
    ready(game, 'A');
    game = enact(game, action('A', 0, 'ekans-toxic', 'B', 0));
    assert.equal(game.teams.B[0].hp, 14);

    let execution = createGame({ seed: 937, teams });
    execution.teams.A[0].hp = 50;
    execution.teams.B[0].hp = 25;
    execution.teams.B[0].shield = 100;
    execution.teams.B[0].statuses.push({
        id: 'minimum-hp', name: 'Minimum HP', harmful: false,
        durationActions: null, minimumHp: 1,
    });
    execution = enact(execution, action('A', 0, 'ekans-crunch', 'B', 0));
    assert.equal(execution.teams.B[0].alive, false);
    assert.equal(execution.teams.B[0].hp, 0);
    assert.equal(execution.teams.B[0].shield, 100);
    assert.equal(execution.teams.A[0].form, 'arbok');
    assert.equal(execution.teams.A[0].hp, 60);
    assert.equal(execution.teams.A[0].cooldowns['arbok-crunch'], undefined);
    assert.equal(execution.teams.A[0].cooldowns['ekans-crunch'], 4);
});

test('Arbok Toxic adds at most two independent stacks and both double together', () => {
    let game = createGame({ seed: 941, teams });
    game.teams.A[0].form = 'arbok';
    game = enact(game, action('A', 0, 'arbok-toxic', 'B', 0));
    assert.deepEqual(
        game.teams.B[0].statuses.filter((status) => status.id.startsWith('ekans-badly-poison')).map((status) => status.id),
        ['ekans-badly-poison']
    );
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['arbok-toxic'];
    game = enact(game, action('A', 0, 'arbok-toxic', 'B', 0));
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['arbok-toxic'];
    game = enact(game, action('A', 0, 'arbok-toxic', 'B', 0));
    assert.deepEqual(
        game.teams.B[0].statuses.filter((status) => status.id.startsWith('ekans-badly-poison')).map((status) => status.id),
        ['ekans-badly-poison', 'ekans-badly-poison-2']
    );
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 1));
    assert.deepEqual(
        game.teams.B[0].statuses.filter((status) => status.id.startsWith('ekans-badly-poison')).map((status) => status.turnEndDamage),
        [4, 4]
    );
});

test('Arbok upgrades Poison Fang, Shed Skin healing, and Crunch execution threshold', () => {
    let game = createGame({ seed: 947, teams });
    game.teams.A[0].form = 'arbok';
    game.teams.B[0].statuses.push({
        ...ROSTER.ekans.skills.find((skill) => skill.id === 'arbok-toxic').effects[1].status,
        sourcePlayer: 'A', sourceSlot: 0, appliedTurn: 0,
    });
    game = enact(game, action('A', 0, 'arbok-poison-fang', 'B', 0));
    assert.equal(game.teams.B[0].hp, 55);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'ekans-poison-fang-venom')?.turnEndDamage,
        6
    );

    ready(game, 'A');
    game.teams.A[0].hp = 50;
    game = enact(game, action('A', 0, 'arbok-shed-skin', 'A', 0));
    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.A[0].hp, 75);

    ready(game, 'A');
    game.teams.B[1].hp = 35;
    game = enact(game, action('A', 0, 'arbok-crunch', 'B', 1));
    assert.equal(game.teams.B[1].alive, false);
});

test('Ekans poison actions replay deterministically', () => {
    let game = createGame({ seed: 953, teams });
    game = enact(game, action('A', 0, 'ekans-toxic', 'B', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 1));
    game = enact(game, action('A', 0, 'ekans-poison-fang', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
