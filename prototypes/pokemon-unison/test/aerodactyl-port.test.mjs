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

function matchup({
    seed = 20,
    teamA = ['aerodactyl', 'squirtle', 'bulbasaur'],
    teamB = ['chansey', 'eevee', 'hitmonchan'],
} = {}) {
    return createGame({ seed, teams: { A: teamA, B: teamB } });
}

function buildRockHeadDefense(seed, amount = 25) {
    let game = matchup({ seed });
    game = enact(game, action('A', 0, 'aerodactyl-take-down', 'B', 1));
    if (amount === 10) return game;
    game = pass(game);
    game = enact(game, action('A', 0, 'aerodactyl-double-edge', 'B', 2));
    return game;
}

test('Aerodactyl exposes the production type pair, four active skills, costs, cooldowns, passive, and artwork', () => {
    const aerodactyl = ROSTER.aerodactyl;

    assert.deepEqual(aerodactyl.types, ['Rock', 'Flying']);
    assert.deepEqual(aerodactyl.forms.base.skillIds, [
        'aerodactyl-take-down',
        'aerodactyl-rock-slide',
        'aerodactyl-double-edge',
        'aerodactyl-stone-edge',
    ]);
    assert.deepEqual(
        aerodactyl.skills.map(({ energy, cooldown, classes }) => ({ energy, cooldown, classes })),
        [
            { energy: [Energy.RANDOM], cooldown: 0, classes: ['Normal', 'Physical', 'Instant'] },
            { energy: [Energy.GENJUTSU], cooldown: 2, classes: ['Rock', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3, classes: ['Normal', 'Physical', 'Instant'] },
            { energy: [Energy.GENJUTSU, Energy.RANDOM], cooldown: 2, classes: ['Rock', 'Physical', 'Instant'] },
        ]
    );
    assert.equal(aerodactyl.startStatuses[0].minimumHpFromSelfSkillDamage, 1);
    assert.equal(aerodactyl.startStatuses[0].sourceSkillId, 'aerodactyl-passive-tough-head');
    aerodactyl.skills.forEach((skill) => assert.match(skill.image, /aerodactyl/i));
});

test('Rock Head limits recoil to actual HP above one and grants exactly that much tracked Shield', () => {
    let game = matchup();
    game.teams.A[0].hp = 5;
    game = enact(game, action('A', 0, 'aerodactyl-take-down', 'B', 0));

    assert.equal(game.teams.A[0].hp, 1);
    assert.equal(game.teams.A[0].alive, true);
    assert.equal(game.teams.A[0].shield, 4);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'aerodactyl-rock-head-defense')
            ?.trackedShieldPoints,
        4
    );

    game = pass(game);
    game = enact(game, action('A', 0, 'aerodactyl-double-edge', 'B', 1));
    assert.equal(game.teams.A[0].hp, 1);
    assert.equal(game.teams.A[0].shield, 4);
});

test('Rock Head Shield stacks and its tracked status disappears when incoming damage exhausts it', () => {
    let game = buildRockHeadDefense(31, 10);
    assert.equal(game.teams.A[0].hp, 90);
    assert.equal(game.teams.A[0].shield, 10);

    game = enact(game, action('B', 2, 'hitmonchan-mega-punch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 90);
    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'aerodactyl-rock-head-defense'),
        false
    );
});

test('Rock Slide consumes Rock Head Shield as selected bonus damage and rolls harmful stuns independently', () => {
    let game = buildRockHeadDefense(20);
    assert.equal(game.teams.A[0].shield, 25);

    game = pass(game);
    game = enact(game, action('A', 0, 'aerodactyl-rock-slide', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [65, 70, 60]);
    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'aerodactyl-rock-head-defense'),
        false
    );
    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'aerodactyl-rock-slide-stun')),
        [true, false, false]
    );
    assert.match(
        validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)),
        /harmful skills are stunned/i
    );
    assert.equal(validateAction(game, action('B', 0, 'chansey-softboil', 'B', 1)), null);
});

test('Stone Edge converts Rock Head Shield into stun chance and linked piercing damage, then consumes only tracked Shield', () => {
    let withoutDefense = matchup({ seed: 4864 });
    withoutDefense = enact(withoutDefense, action('A', 0, 'aerodactyl-stone-edge', 'B', 0));
    assert.equal(withoutDefense.teams.B[0].hp, 65);
    assert.equal(
        withoutDefense.teams.B[0].statuses.some((status) => status.id === 'aerodactyl-stone-edge-stun'),
        false
    );

    let defended = buildRockHeadDefense(4864);
    defended.teams.A[0].shield += 20;
    defended.teams.A[0].shieldCapacity += 20;
    defended = pass(defended);
    defended = enact(defended, action('A', 0, 'aerodactyl-stone-edge', 'B', 0));

    assert.equal(defended.teams.B[0].hp, 60);
    assert.equal(
        defended.teams.B[0].statuses.find((status) => status.id === 'aerodactyl-stone-edge-stun')
            ?.durationActions,
        2
    );
    assert.equal(defended.teams.A[0].shield, 20);
    assert.equal(
        defended.teams.A[0].statuses.some((status) => status.id === 'aerodactyl-rock-head-defense'),
        false
    );
});

test('Stone Edge critical damage occurs only when its rolled stun is actually applied', () => {
    let game = matchup({ seed: 4864 });
    game.teams.A[0].shield = 25;
    game.teams.A[0].shieldCapacity = 25;
    game.teams.A[0].statuses.push({
        id: 'aerodactyl-rock-head-defense', name: 'Rock Head Defense',
        hidden: false, harmful: false, durationActions: null,
        trackedShieldPoints: 25, removeWhenTrackedShieldExhausted: true,
    });
    game.teams.B[0].statuses.push({
        id: 'test-stun-immunity', name: 'Stun Immunity', hidden: false, harmful: false,
        durationActions: null, stunDurationReduction: 2,
    });

    game = enact(game, action('A', 0, 'aerodactyl-stone-edge', 'B', 0));

    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'aerodactyl-stone-edge-stun'),
        false
    );
    assert.equal(game.teams.A[0].shield, 0);
});

test('Rock Head accumulation, Rock Slide consumption, and independent rolls replay deterministically', () => {
    let game = buildRockHeadDefense(20);
    game = pass(game);
    game = enact(game, action('A', 0, 'aerodactyl-rock-slide', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
