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

function ready(state, player, pool = 10) {
    state.currentPlayer = player;
    state.winner = null;
    state.energy[player] = {
        [Energy.TAIJUTSU]: pool,
        [Energy.NINJUTSU]: pool,
        [Energy.BLOODLINE]: pool,
        [Energy.GENJUTSU]: pool,
    };
    return state;
}

const meowthTeams = {
    A: ['meowth', 'squirtle', 'bulbasaur'],
    B: ['chansey', 'eevee', 'pokemon-trainer'],
};

test('Meowth and Persian expose both complete forms, production costs, cooldowns, passive, and artwork', () => {
    const meowth = ROSTER.meowth;

    assert.deepEqual(meowth.types, ['Normal']);
    assert.equal(meowth.forcedEvolutionForm, 'persian');
    assert.deepEqual(meowth.forms.base.skillIds, [
        'meowth-pay-day',
        'meowth-fury-swipes',
        'meowth-fake-out',
        'meowth-night-slash',
    ]);
    assert.deepEqual(meowth.forms.persian.skillIds, [
        'persian-pay-day',
        'persian-fury-swipes',
        'persian-fake-out',
        'persian-night-slash',
    ]);
    assert.deepEqual(
        meowth.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [], cooldown: 2 },
            { energy: [Energy.TAIJUTSU], cooldown: 1 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [], cooldown: 1 },
            { energy: [Energy.TAIJUTSU, Energy.RANDOM], cooldown: 1 },
        ]
    );
    assert.equal(meowth.forms.persian.healOnEnter, 15);
    assert.deepEqual(
        meowth.startStatuses[0].evolveOnCounter,
        { counter: 'evolution', threshold: 3, form: 'persian' }
    );
    meowth.skills.forEach((skill) => assert.match(skill.image, /PokemonArena\/Meowth/i));
});

test('Pay Day steals an actual color, applies it to Night Slash, preserves Persian Random cost, and is consumed', () => {
    let game = createGame({ seed: 1001, teams: meowthTeams });
    game.energy.B = {
        [Energy.TAIJUTSU]: 0,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 0,
        [Energy.GENJUTSU]: 1,
    };
    game = enact(game, action('A', 0, 'meowth-pay-day', 'B', 0));

    const costStatus = game.teams.A[0].statuses.find(
        (status) => status.id === 'meowth-pay-day-night-slash-cost'
    );
    assert.deepEqual(costStatus?.skillCostOverrides, {
        'meowth-night-slash': [Energy.GENJUTSU],
        'persian-night-slash': [Energy.GENJUTSU, Energy.RANDOM],
    });
    assert.equal(game.energy.A[Energy.GENJUTSU], 3);

    ready(game, 'A', 0);
    game.energy.A[Energy.GENJUTSU] = 1;
    game = enact(game, action('A', 0, 'meowth-night-slash', 'B', 0));
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'meowth-pay-day-night-slash-cost'),
        false
    );
});

test('Fury Swipes applies immediate and three-turn typed packets while Persian physical packets pierce reduction', () => {
    let base = createGame({ seed: 1009, teams: meowthTeams });
    base.teams.B[0].statuses.push({
        id: 'test-flat-reduction', name: 'Flat Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionFlat: 5,
    });
    base = enact(base, action('A', 0, 'meowth-fury-swipes', 'B', 0));
    assert.equal(base.teams.B[0].hp, 90);
    assert.equal(
        base.teams.B[0].statuses.find((status) => status.id === 'meowth-fury-swipes-physical')
            ?.durationActions,
        3
    );
    assert.equal(
        base.teams.B[0].statuses.find((status) => status.id === 'meowth-fury-swipes-physical')
            ?.periodicDamageKind,
        'normal'
    );

    let evolved = createGame({ seed: 1013, teams: meowthTeams });
    evolved.teams.A[0].form = 'persian';
    evolved.teams.B[0].statuses.push({
        id: 'test-flat-reduction', name: 'Flat Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionFlat: 5,
    });
    evolved = enact(evolved, action('A', 0, 'persian-fury-swipes', 'B', 0));
    assert.equal(evolved.teams.B[0].hp, 80);
    assert.equal(
        evolved.teams.B[0].statuses.find((status) => status.id === 'meowth-fury-swipes-physical')
            ?.periodicDamageKind,
        'normal-ignore-reduction'
    );
});

test('three successful Fury Swipes extensions evolve Meowth, heal fifteen, and preserve slot cooldowns', () => {
    let game = createGame({ seed: 1019, teams: meowthTeams });
    game.teams.A[0].hp = 60;
    game = enact(game, action('A', 0, 'meowth-fury-swipes', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-pay-day', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-fake-out', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-night-slash', 'B', 0));

    assert.equal(game.teams.A[0].counters.evolution, 3);
    assert.equal(game.teams.A[0].form, 'persian');
    assert.equal(game.teams.A[0].hp, 75);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Persian');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, ROSTER.meowth.forms.persian.skillIds);
    assert.ok(game.teams.A[0].cooldowns['persian-night-slash'] > 0);
});

test('Fake Out ignores invulnerability and its source-specific target history survives evolution', () => {
    let game = createGame({ seed: 1021, teams: meowthTeams });
    game.teams.B[0].statuses.push({
        id: 'test-invulnerable', name: 'Invulnerable', hidden: false, harmful: false,
        durationActions: null, invulnerable: true,
    });
    game = enact(game, action('A', 0, 'meowth-fake-out', 'B', 0));

    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'meowth-fake-out-stun'),
        true
    );
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['meowth-fake-out'];
    assert.match(
        validateAction(game, action('A', 0, 'meowth-fake-out', 'B', 0)),
        /already been targeted/i
    );

    game.teams.A[0].form = 'persian';
    assert.match(
        validateAction(game, action('A', 0, 'persian-fake-out', 'B', 0)),
        /already been targeted/i
    );
    assert.equal(validateAction(game, action('A', 0, 'persian-fake-out', 'B', 1)), null);
});

test('Night Slash branches on initial target HP and upgrades both normal and critical Persian damage', () => {
    let baseCritical = createGame({ seed: 1031, teams: meowthTeams });
    baseCritical.teams.B[0].hp = 50;
    baseCritical = enact(baseCritical, action('A', 0, 'meowth-night-slash', 'B', 0));
    assert.equal(baseCritical.teams.B[0].hp, 15);

    let baseNormal = createGame({ seed: 1033, teams: meowthTeams });
    baseNormal.teams.B[0].hp = 51;
    baseNormal = enact(baseNormal, action('A', 0, 'meowth-night-slash', 'B', 0));
    assert.equal(baseNormal.teams.B[0].hp, 26);

    let persianCritical = createGame({ seed: 1039, teams: meowthTeams });
    persianCritical.teams.A[0].form = 'persian';
    persianCritical.teams.B[0].hp = 50;
    persianCritical = enact(persianCritical, action('A', 0, 'persian-night-slash', 'B', 0));
    assert.equal(persianCritical.teams.B[0].hp, 5);

    let persianNormal = createGame({ seed: 1049, teams: meowthTeams });
    persianNormal.teams.A[0].form = 'persian';
    persianNormal.teams.B[0].hp = 51;
    persianNormal = enact(persianNormal, action('A', 0, 'persian-night-slash', 'B', 0));
    assert.equal(persianNormal.teams.B[0].hp, 21);
});

test("Persian Pay Day marks only other enemies and steals once when each uses a new harmful skill", () => {
    const teams = {
        A: ['meowth', 'squirtle', 'bulbasaur'],
        B: ['abra', 'eevee', 'chansey'],
    };
    let game = createGame({ seed: 1051, teams });
    game.teams.A[0].form = 'persian';
    game.energy.B = {
        [Energy.TAIJUTSU]: 0,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 0,
        [Energy.GENJUTSU]: 1,
    };
    game = enact(game, action('A', 0, 'persian-pay-day', 'B', 0));

    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'persian-pay-day-reactive-theft')),
        [false, true, true]
    );
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'persian-pay-day-night-slash-cost')
            ?.skillCostOverrides['persian-night-slash'],
        [Energy.GENJUTSU, Energy.RANDOM]
    );

    game.teams.B[1].skillUses['eevee-swift'] = 1;
    game.energy.B = {
        [Energy.TAIJUTSU]: 0,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 0,
        [Energy.GENJUTSU]: 3,
    };
    const beforeRepeat = game.energy.A[Energy.GENJUTSU];
    game = enact(game, action('B', 1, 'eevee-swift', 'A', 0));
    assert.equal(game.energy.A[Energy.GENJUTSU], beforeRepeat);
    assert.equal(
        game.teams.B[1].statuses.some((status) => status.id === 'persian-pay-day-reactive-theft'),
        true
    );

    ready(game, 'B', 0);
    game.energy.B[Energy.GENJUTSU] = 3;
    const beforeSteals = game.events.filter((event) => event.kind === 'energy-steal').length;
    game = enact(game, action('B', 1, 'eevee-dig', 'A', 0));
    const newSteals = game.events
        .filter((event) => event.kind === 'energy-steal')
        .slice(beforeSteals);
    assert.equal(newSteals.length, 1);
    assert.equal(newSteals[0].targetPlayer, 'B');
    assert.equal(newSteals[0].targetSlot, 1);
    assert.equal(
        game.teams.B[1].statuses.some((status) => status.id === 'persian-pay-day-reactive-theft'),
        false
    );
});

test('Meowth Fury Swipes extensions, evolution, and form replacement replay deterministically', () => {
    let game = createGame({ seed: 1061, teams: meowthTeams });
    game = enact(game, action('A', 0, 'meowth-fury-swipes', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-pay-day', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-fake-out', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'meowth-night-slash', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
