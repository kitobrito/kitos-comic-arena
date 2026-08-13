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
            { energy: [Energy.NINJUTSU], cooldown: 2 },
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

test('Blizzard delays a harmful skill by 1 turn, summons Hail, and Ice Beam can stun only Special skills', () => {
    const controlTeams = {
        A: birdTeams.A,
        B: ['zapdos', 'pidgey', 'eevee'],
    };
    let game = createGame({ seed: 1, teams: controlTeams });
    game = enact(game, action('A', 0, 'articuno-blizzard', 'B', 0));

    // 10 base damage; zapdos and pidgey are part-Flying, which Ice hits super-effectively (+5).
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 90]);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'articuno-blizzard-delay'))), [true, true, true]);
    assert.equal(game.weather?.key, 'hail');
    assert.equal(game.weather?.roundsRemaining, 4);

    // A harmful skill used while marked does not activate immediately...
    ready(game, 'B', { clearCooldowns: true });
    game = enact(game, action('B', 0, 'zapdos-zap-cannon', 'A', 0));
    assert.equal(status(game.teams.A[0], 'zapdos-zap-cannon'), undefined);
    assert.ok(status(game.teams.B[0], 'zapdos-zap-cannon-delayed-activation'));

    // ...but activates automatically once the delay elapses, 1 turn later.
    game = pass(game);
    game = pass(game);
    assert.ok(status(game.teams.A[0], 'zapdos-zap-cannon'));

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 0, 'articuno-ice-beam', 'B', 0));
    // 15 base + 5 from Hail's Ice bonus (Ice Beam is not excluded), then +5 more for Flying-type effectiveness,
    // on top of two extra Hail ticks absorbed while waiting for the Zap Cannon delay to activate.
    assert.equal(game.teams.B[0].hp, 54);
    assert.ok(status(game.teams.B[0], 'articuno-ice-beam-stun'));
    assert.match(
        validateAction(game, action('B', 0, 'zapdos-thunderstorm', 'B', 0)),
        /Special skills are stunned/i
    );
    assert.equal(validateAction(game, action('B', 0, 'zapdos-flight', 'B', 0)), null);
});

test('Sheer Cold hits the full team, repeats Blizzard and Ice Beam control, summons Hail, and gains 5 permanent damage', () => {
    let game = createGame({ seed: 3, teams: neutralTeams });
    game = enact(game, action('A', 0, 'articuno-sheer-cold', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [70, 70, 70]);
    assert.equal(status(game.teams.A[0], 'articuno-sheer-cold-tracker')?.bonusDamage, 5);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'articuno-blizzard-delay'))), [true, true, true]);
    assert.equal(game.weather?.key, 'hail');

    game = pass(game);
    // Hail ticked once during the pass: 3 damage to the non-Ice team.
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [67, 67, 67]);
    assert.equal(game.weather?.roundsRemaining, 3, 'Hail is now on its second of four rounds');

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 0, 'articuno-sheer-cold', 'B', 0));
    // 30 base + 5 permanent tracker bonus + 5 from Hail's own Ice bonus (Sheer Cold is not excluded from it).
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [27, 27, 27]);
    assert.equal(status(game.teams.A[0], 'articuno-sheer-cold-tracker')?.bonusDamage, 10);
    assert.equal(game.weather?.key, 'hail', 'Hail does not refresh, but the still-active weather remains Hail');
    assert.equal(game.weather?.roundsRemaining, 3, 'recasting Blizzard-adjacent Hail while active does not reset its duration');
});

test('Sunny Day summons weather that boosts Fire damage, and Heat Wave gains capped Heat', () => {
    let game = createGame({ seed: 11, teams: neutralTeams });
    game = enact(game, action('A', 1, 'moltres-sunny-day', 'A', 1));
    // Base +1 Heat, plus +1 more from Sunny Day's own "gain extra Heat while it lasts" clause.
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 2);
    assert.equal(game.weather?.key, 'sunny-day');
    assert.equal(game.weather?.roundsRemaining, 4);

    game = pass(game);
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 1, 'moltres-heat-wave', 'B', 0));
    // 20+5=25 to the primary target, 10+5=15 to the others (Fire +5 from Sunny Day).
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 85, 85]);
    assert.equal(status(game.teams.A[1], 'moltres-heat-tracker')?.heat, 3, 'capped at 3 even with the weather bonus');

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

test('Thunderstorm traps harmful skills, pressures their cooldown, detonates on recast, and Flight boosts it', () => {
    let game = createGame({ seed: 23, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderstorm', 'A', 2));
    assert.equal(game.weather?.key, 'thunderstorm');
    assert.equal(game.weather?.roundsRemaining, 4);

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    // The trap's own trigger damage is excluded from Thunderstorm's Electric bonus, so this is unchanged.
    assert.equal(game.teams.B[0].hp, 95);
    assert.equal(game.teams.B[0].cooldowns['chansey-eggbomb'], 3);

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-thunderstorm', 'A', 2));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 80, 85]);
    assert.equal(status(game.teams.A[2], 'zapdos-thunderstorm-active'), undefined);
    assert.deepEqual(game.teams.B.map((unit) => Boolean(status(unit, 'zapdos-thunderstorm-paralysis'))), [true, true, true]);
    assert.equal(game.weather, null, 'detonating Thunderstorm ends the weather early');

    game = createGame({ seed: 29, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderstorm', 'A', 2));
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-flight', 'A', 2));
    game = enact(game, action('B', 1, 'pidgey-gust', 'A', 2));
    assert.equal(game.teams.B[1].hp, 93);
    assert.equal(game.teams.A[2].hp, 100);
    assert.equal(game.events.some((event) => event.kind === 'blocked' && /Flight/.test(event.message)), true);
});

test('Thunderstorm accelerates Zap Cannon, adds 10 piercing damage, and its expiry stuns', () => {
    let game = createGame({ seed: 31, teams: birdTeams });
    game = enact(game, action('A', 2, 'zapdos-thunderstorm', 'A', 2));
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 2, 'zapdos-zap-cannon', 'B', 0));

    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    const cannon = status(game.teams.B[0], 'zapdos-zap-cannon');
    assert.equal(cannon?.onExpireDamage, 40);
    assert.equal(cannon?.durationActions, 1);

    ready(game, 'B', { clearCooldowns: true });
    game = pass(game);
    // 40 base + 5 from Thunderstorm's own Electric bonus (Zap Cannon is not the excluded skill),
    // plus this turn's Thunderstorm random-target tick also lands on Chansey for 10 more.
    assert.equal(game.teams.B[0].hp, 40);
    assert.equal(status(game.teams.B[0], 'zapdos-zap-cannon'), undefined);
    assert.ok(status(game.teams.B[0], 'zapdos-zap-cannon-stun'));
    ready(game, 'B');
    assert.match(validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)), /cannot use skills/i);
});

test('a full legendary-bird team turn replays deterministically', () => {
    let game = createGame({ seed: 37, teams: neutralTeams });
    const queued = [
        action('A', 0, 'articuno-sheer-cold', 'B', 0, [Energy.BLOODLINE]),
        action('A', 1, 'moltres-sunny-day', 'A', 1),
        action('A', 2, 'zapdos-thunderstorm', 'A', 2),
    ];
    const resolved = resolveQueuedTurn(game, queued);
    assert.equal(resolved.ok, true, resolved.error);
    game = resolved.state;

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
