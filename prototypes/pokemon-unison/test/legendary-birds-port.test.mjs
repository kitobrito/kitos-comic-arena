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

function action(player, actorSlot, skillId, targetPlayer, targetSlot, randomEnergy) {
    return {
        player,
        actorSlot,
        skillId,
        targetPlayer,
        targetSlot,
        ...(randomEnergy ? { randomEnergy } : {}),
    };
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

function ready(state, player, { clearCooldowns = false } = {}) {
    state.currentPlayer = player;
    state.winner = null;
    state.energy[player] = {
        [Energy.TAIJUTSU]: 10,
        [Energy.NINJUTSU]: 10,
        [Energy.BLOODLINE]: 10,
        [Energy.GENJUTSU]: 10,
    };
    if (clearCooldowns) state.teams[player].forEach((unit) => { unit.cooldowns = {}; });
    return state;
}

function status(unit, id) {
    return unit.statuses.find((entry) => entry.id === id);
}

const birdTeams = {
    A: ['articuno', 'moltres', 'zapdos'],
    B: ['chansey', 'pidgey', 'eevee'],
};

const neutralTeams = {
    A: ['articuno', 'moltres', 'zapdos'],
    B: ['chansey', 'eevee', 'jigglypuff'],
};

test('the legendary birds expose every production skill, cost, cooldown, type, passive, and asset', () => {
    assert.deepEqual(ROSTER.articuno.types, ['Ice', 'Flying']);
    assert.deepEqual(ROSTER.moltres.types, ['Fire', 'Flying']);
    assert.deepEqual(ROSTER.zapdos.types, ['Electric', 'Flying']);

    assert.deepEqual(
        ROSTER.articuno.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.NINJUTSU], cooldown: 1 },
            { energy: [Energy.NINJUTSU], cooldown: 0 },
            { energy: [Energy.NINJUTSU, Energy.NINJUTSU, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM], cooldown: 4 },
        ]
    );
    assert.deepEqual(
        ROSTER.moltres.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.BLOODLINE], cooldown: 3 },
            { energy: [Energy.BLOODLINE], cooldown: 4 },
            { energy: [Energy.BLOODLINE, Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.BLOODLINE, Energy.BLOODLINE, Energy.RANDOM], cooldown: 0 },
            { energy: [], cooldown: 0 },
        ]
    );
    assert.deepEqual(
        ROSTER.zapdos.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [], cooldown: 1 },
            { energy: [Energy.GENJUTSU], cooldown: 0 },
            { energy: [Energy.GENJUTSU, Energy.GENJUTSU, Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.RANDOM], cooldown: 4 },
        ]
    );
    assert.deepEqual(ROSTER.moltres.forms.base.skillIds, [
        'moltres-fire-spin',
        'moltres-sunny-day',
        'moltres-heat-wave',
        'moltres-overheat',
    ]);
    assert.match(ROSTER.articuno.passiveDescription, /5 damage/i);
    assert.match(ROSTER.moltres.passiveDescription, /3 Heat/i);
    [...ROSTER.articuno.skills, ...ROSTER.moltres.skills, ...ROSTER.zapdos.skills]
        .forEach((skill) => assert.match(skill.image, /PokemonArena\/(articuno|moltres|zapdos)/i));
});

test('Blizzard paralyzes team cooldowns and Ice Beam can stun only Special skills', () => {
    const controlTeams = {
        A: birdTeams.A,
        B: ['zapdos', 'pidgey', 'eevee'],
    };
    let game = createGame({ seed: 1, teams: controlTeams });
    game.teams.B.forEach((unit) => { unit.cooldowns.test = 2; });
    game = enact(game, action('A', 0, 'articuno-blizzard', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.cooldowns.test), [2, 2, 2]);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'articuno-blizzard-paralysis'))), [true, true, true]);

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 0, 'articuno-ice-beam', 'B', 0));
    assert.ok(status(game.teams.B[0], 'articuno-ice-beam-stun'));
    assert.match(
        validateAction(game, action('B', 0, 'zapdos-thunderbolt', 'B', 0)),
        /Special skills are stunned/i
    );
    assert.equal(validateAction(game, action('B', 0, 'zapdos-flight', 'B', 0)), null);
});

test('Sheer Cold hits the full team, repeats Blizzard and Ice Beam control, and gains 5 permanent damage', () => {
    let game = createGame({ seed: 3, teams: neutralTeams });
    game = enact(game, action('A', 0, 'articuno-sheer-cold', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [70, 70, 70]);
    assert.equal(status(game.teams.A[0], 'articuno-sheer-cold-tracker')?.bonusDamage, 5);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'articuno-blizzard-paralysis'))), [true, true, true]);

    game = pass(game);
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 0, 'articuno-sheer-cold', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [35, 35, 35]);
    assert.equal(status(game.teams.A[0], 'articuno-sheer-cold-tracker')?.bonusDamage, 10);
});

test('Sunny Day adds exactly 3 affliction damage and Heat Wave gains one capped Heat', () => {
    let game = createGame({ seed: 11, teams: neutralTeams });
    game = enact(game, action('A', 1, 'moltres-sunny-day', 'B', 0));
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 1);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'moltres-sunny-day'))), [true, true, true]);

    game = pass(game);
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 1, 'moltres-heat-wave', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [77, 87, 87]);
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 2);

    status(game.teams.A[1], 'moltres-heat-tracker').heat = 3;
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 1, 'moltres-heat-wave', 'B', 0));
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 3);
});

test('Fire Spin punishes harmful skills aimed anywhere on Moltres team', () => {
    let game = createGame({ seed: 13, teams: birdTeams });
    game = enact(game, action('A', 1, 'moltres-fire-spin', 'A', 1));
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 1);

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(game.events.some((event) =>
        event.kind === 'damage' && event.amount === 10 && /Fire Spin/.test(event.message)
    ), true);
});

test('Overheat consumes Heat, loses 5 damage per Heat, and drops its Random then Red costs', () => {
    let game = createGame({ seed: 17, teams: neutralTeams });
    const heat = status(game.teams.A[1], 'moltres-heat-tracker');
    heat.heat = 3;
    game = enact(game, action('A', 1, 'moltres-overheat', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [55, 55, 55]);
    assert.deepEqual(
        { heat: heat.heat, overheatPenalty: heat.overheatPenalty, overheatUses: heat.overheatUses },
        { heat: 3, overheatPenalty: 0, overheatUses: 0 },
        'the original state remains immutable'
    );
    let liveHeat = status(game.teams.A[1], 'moltres-heat-tracker');
    assert.deepEqual(
        { heat: liveHeat.heat, overheatPenalty: liveHeat.overheatPenalty, overheatUses: liveHeat.overheatUses },
        { heat: 0, overheatPenalty: 5, overheatUses: 1 }
    );

    ready(game, 'A', { clearCooldowns: true });
    assert.deepEqual(
        legalActions(game, 'A').find((entry) => entry.skillId === 'moltres-overheat')?.energyCosts,
        [Energy.BLOODLINE, Energy.BLOODLINE]
    );
    liveHeat.heat = 3;
    game = enact(game, action('A', 1, 'moltres-overheat', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [25, 25, 25]);
    liveHeat = status(game.teams.A[1], 'moltres-heat-tracker');
    assert.deepEqual(
        { heat: liveHeat.heat, overheatPenalty: liveHeat.overheatPenalty, overheatUses: liveHeat.overheatUses },
        { heat: 0, overheatPenalty: 10, overheatUses: 2 }
    );

    ready(game, 'A', { clearCooldowns: true });
    assert.deepEqual(
        legalActions(game, 'A').find((entry) => entry.skillId === 'moltres-overheat')?.energyCosts,
        [Energy.BLOODLINE]
    );
});

test('Charge discounts Yellow costs, increases on Zapdos turns, and ends after another skill', () => {
    let game = createGame({ seed: 19, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-charge', 'A', 2));
    assert.equal(status(game.teams.A[2], 'zapdos-charge-active')?.specificCostReductions[Energy.GENJUTSU], 1);

    game = pass(game);
    assert.equal(status(game.teams.A[2], 'zapdos-charge-active')?.specificCostReductions[Energy.GENJUTSU], 2);
    const cannon = legalActions(game, 'A').find((entry) => entry.skillId === 'zapdos-zap-cannon');
    assert.deepEqual(cannon?.energyCosts, [Energy.RANDOM]);

    game = enact(game, action('A', 2, 'zapdos-zap-cannon', 'B', 0));
    assert.equal(status(game.teams.A[2], 'zapdos-charge-active'), undefined);
});

test('Thunderbolt traps harmful skills, pressures their cooldown, detonates on recast, and Flight boosts it', () => {
    let game = createGame({ seed: 23, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderbolt', 'A', 2));

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.B[0].hp, 95);
    assert.equal(game.teams.B[0].cooldowns['chansey-eggbomb'], 3);

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-thunderbolt', 'A', 2));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 80, 85]);
    assert.equal(status(game.teams.A[2], 'zapdos-thunderbolt-active'), undefined);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'zapdos-thunderbolt-paralysis'))), [true, true, true]);

    game = createGame({ seed: 29, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderbolt', 'A', 2));
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-flight', 'A', 2));
    game = enact(game, action('B', 1, 'pidgey-gust', 'A', 2));
    assert.equal(game.teams.B[1].hp, 93);
    assert.equal(game.teams.A[2].hp, 100);
    assert.equal(game.events.some((event) => event.kind === 'blocked' && /Flight/.test(event.message)), true);
});

test('Thunderbolt accelerates Zap Cannon, adds 10 piercing damage, and its expiry stuns', () => {
    let game = createGame({ seed: 31, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderbolt', 'A', 2));
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-zap-cannon', 'B', 0));

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    const cannon = status(game.teams.B[0], 'zapdos-zap-cannon');
    assert.equal(cannon?.onExpireDamage, 40);
    assert.equal(cannon?.durationActions, 1);

    ready(game, 'B', { clearCooldowns: true });
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 55);
    assert.equal(status(game.teams.B[0], 'zapdos-zap-cannon'), undefined);
    assert.ok(status(game.teams.B[0], 'zapdos-zap-cannon-stun'));
    ready(game, 'B');
    assert.match(validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)), /cannot use skills/i);
});

test('a full legendary-bird team turn replays deterministically', () => {
    let game = createGame({ seed: 37, teams: neutralTeams });
    const queued = [
        action('A', 0, 'articuno-sheer-cold', 'B', 0, [Energy.BLOODLINE]),
        action('A', 1, 'moltres-sunny-day', 'B', 0),
        action('A', 2, 'zapdos-thunderbolt', 'A', 2),
    ];
    const resolved = resolveQueuedTurn(game, queued);
    assert.equal(resolved.ok, true, resolved.error);
    game = resolved.state;

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
