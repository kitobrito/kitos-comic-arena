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

const neutralTeams = {
    A: ['onix', 'squirtle', 'bulbasaur'],
    B: ['chansey', 'eevee', 'pokemon-trainer'],
};

test('Onix exposes its production type pair, complete active kit, Sturdy passive, and artwork', () => {
    const onix = ROSTER.onix;

    assert.deepEqual(onix.types, ['Rock', 'Ground']);
    assert.deepEqual(onix.forms.base.skillIds, [
        'onix-rock-throw',
        'onix-iron-tail',
        'onix-stealth-rock',
        'onix-harden',
    ]);
    assert.deepEqual(
        onix.skills.map(({ energy, cooldown, classes }) => ({ energy, cooldown, classes })),
        [
            { energy: [Energy.RANDOM], cooldown: 1, classes: ['Rock', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1, classes: ['Steel', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 6, classes: ['Rock', 'Physical', 'Instant', 'Invisible'] },
            { energy: [Energy.RANDOM], cooldown: 4, classes: ['Normal', 'Physical', 'Instant'] },
        ]
    );
    assert.equal(onix.startStatuses[0].minimumHp, 1);
    assert.equal(onix.startStatuses[0].consumeOnPreventedDeath, true);
    assert.equal(onix.startStatuses[0].ignoreExecutionEffects, true);
    onix.skills.forEach((skill) => assert.match(skill.image, /PokemonArena\/onix/i));
});

test('Sturdy prevents one lethal hit at 1 HP and is consumed before the next lethal hit', () => {
    const teams = {
        A: ['onix', 'squirtle', 'bulbasaur'],
        B: ['hitmonchan', 'eevee', 'chansey'],
    };
    let game = createGame({ seed: 911, teams });
    game.teams.A[0].hp = 5;
    game = pass(game);
    ready(game, 'B');
    game = enact(game, action('B', 0, 'hitmonchan-mega-punch', 'A', 0));

    assert.equal(game.teams.A[0].hp, 1);
    assert.equal(game.teams.A[0].alive, true);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'onix-sturdy-passive'),
        false
    );

    ready(game, 'B');
    delete game.teams.B[0].cooldowns['hitmonchan-mega-punch'];
    game = enact(game, action('B', 0, 'hitmonchan-mega-punch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 0);
    assert.equal(game.teams.A[0].alive, false);
});

test('Sturdy ignores execute effects only while its one-use passive remains active', () => {
    const teams = {
        A: ['onix', 'squirtle', 'bulbasaur'],
        B: ['ekans', 'eevee', 'chansey'],
    };
    let game = createGame({ seed: 919, teams });
    game.teams.A[0].hp = 20;
    game = pass(game);
    ready(game, 'B');
    game = enact(game, action('B', 0, 'ekans-crunch', 'A', 0));

    assert.equal(game.teams.A[0].hp, 20);
    assert.equal(game.teams.A[0].alive, true);

    game.teams.A[0].statuses = game.teams.A[0].statuses.filter(
        (status) => status.id !== 'onix-sturdy-passive'
    );
    ready(game, 'B');
    delete game.teams.B[0].cooldowns['ekans-crunch'];
    game = enact(game, action('B', 0, 'ekans-crunch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 0);
    assert.equal(game.teams.A[0].alive, false);
});

test('Rock Throw hits the enemy team and lets Iron Tail grant five permanent reduction once', () => {
    let game = createGame({ seed: 929, teams: neutralTeams });
    game = enact(game, action('A', 0, 'onix-rock-throw', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'onix-rock-throw-iron-tail-bonus'),
        true
    );

    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'onix-iron-tail', 'B', 0));
    assert.equal(game.teams.B[0].hp, 60);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'onix-iron-tail-reduction')
            ?.damageReductionFlat,
        5
    );
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'onix-rock-throw-iron-tail-bonus'),
        false
    );

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['onix-iron-tail'];
    game = enact(game, action('A', 0, 'onix-iron-tail', 'B', 1));
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'onix-iron-tail-reduction')
            ?.damageReductionFlat,
        8
    );
});

test('Harden caps converted Iron Tail reduction at ten, taunts the team, and mitigates piercing but not affliction', () => {
    const teams = {
        A: ['onix', 'squirtle', 'bulbasaur'],
        B: ['hitmonchan', 'chansey', 'eevee'],
    };
    let game = createGame({ seed: 937, teams });
    game.teams.A[0].statuses.push({
        id: 'onix-iron-tail-reduction', name: 'Iron Tail Armor',
        hidden: false, harmful: false, durationActions: null,
        damageReductionFlat: 14, sourcePlayer: 'A', sourceSlot: 0, appliedTurn: 0,
    });
    game = enact(game, action('A', 0, 'onix-harden', 'B', 0));

    const harden = game.teams.A[0].statuses.find((status) => status.id === 'onix-harden-active');
    assert.equal(game.teams.A[0].shield, 10);
    assert.equal(harden?.unpierceableDamageReductionFlat, 10);
    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'onix-harden-taunt')),
        [true, true, true]
    );
    assert.equal(validateAction(game, action('B', 0, 'hitmonchan-thunder-punch', 'A', 0)), null);
    assert.match(
        validateAction(game, action('B', 0, 'hitmonchan-thunder-punch', 'A', 1)),
        /taunted/i
    );
    assert.match(
        validateAction(game, action('B', 1, 'chansey-softboil', 'B', 2)),
        /taunted/i
    );

    ready(game, 'B');
    game = enact(game, action('B', 0, 'hitmonchan-thunder-punch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[0].shield, 5);

    ready(game, 'B');
    game = enact(game, action('B', 0, 'hitmonchan-fire-punch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 80);
    assert.equal(game.teams.A[0].shield, 5);
});

test('Harden removes its remaining tracked Shield and taunts after one Onix turn', () => {
    let game = createGame({ seed: 941, teams: neutralTeams });
    game = enact(game, action('A', 0, 'onix-harden', 'B', 0));
    game = pass(game);
    game = pass(game);

    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'onix-harden-active'),
        false
    );
    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'onix-harden-taunt')),
        [false, false, false]
    );
});

test('Stealth Rock penalizes each newly used skill once and stacks its final piercing burst', () => {
    const teams = {
        A: ['onix', 'squirtle', 'bulbasaur'],
        B: ['abra', 'eevee', 'chansey'],
    };
    let game = createGame({ seed: 947, teams });
    game = enact(game, action('A', 0, 'onix-stealth-rock', 'B', 0));

    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'onix-stealth-rock-mark')),
        [true, true, true]
    );

    ready(game, 'B');
    game = enact(game, action('B', 0, 'abra-psychic', 'A', 0));
    assert.equal(game.teams.A[0].hp, 85);
    assert.equal(game.teams.B[0].cooldowns['abra-psychic'], 2);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'onix-stealth-rock-mark')
            ?.onExpireDamage,
        15
    );

    game.teams.B[0].statuses = game.teams.B[0].statuses.filter(
        (status) => status.id !== 'onix-stealth-rock-damage-debuff'
    );
    ready(game, 'B');
    delete game.teams.B[0].cooldowns['abra-psychic'];
    game = enact(game, action('B', 0, 'abra-psychic', 'A', 0));
    assert.equal(game.teams.A[0].hp, 60);
    assert.equal(game.teams.B[0].cooldowns['abra-psychic'], 1);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'onix-stealth-rock-mark')
            ?.onExpireDamage,
        15
    );

    ready(game, 'B');
    game = enact(game, action('B', 0, 'abra-calm-mind', 'B', 0));
    assert.equal(game.teams.B[0].cooldowns['abra-calm-mind'], 2);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'onix-stealth-rock-mark')
            ?.onExpireDamage,
        20
    );

    game.teams.B.forEach((unit) => {
        const mark = unit.statuses.find((status) => status.id === 'onix-stealth-rock-mark');
        mark.durationActions = 1;
    });
    ready(game, 'A');
    game = pass(game);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 90, 90]);
});

test('Onix setup, first-use hooks, and permanent reduction replay deterministically', () => {
    const teams = {
        A: ['onix', 'squirtle', 'bulbasaur'],
        B: ['abra', 'eevee', 'chansey'],
    };
    let game = createGame({ seed: 953, teams });
    game = enact(game, action('A', 0, 'onix-stealth-rock', 'B', 0));
    game = enact(game, action('B', 0, 'abra-psychic', 'A', 0));
    game = enact(game, action('A', 0, 'onix-rock-throw', 'B', 0));
    game = enact(game, action('B', 0, 'abra-calm-mind', 'B', 0));
    game = enact(game, action('A', 0, 'onix-iron-tail', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
