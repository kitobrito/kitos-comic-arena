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

function poison(unit) {
    return unit.statuses.find((status) => status.id === 'beedrill-poison-sting-status');
}

const teams = {
    A: ['beedrill', 'squirtle', 'bulbasaur'],
    B: ['chansey', 'eevee', 'pidgey'],
};

test('Beedrill and Mega Beedrill expose their complete source slots, costs, passive, and artwork', () => {
    const beedrill = ROSTER.beedrill;
    assert.deepEqual(beedrill.types, ['Bug', 'Poison']);
    assert.equal(beedrill.forcedEvolutionForm, 'mega-beedrill');
    assert.deepEqual(beedrill.forms.base.skillIds, [
        'beedrill-poison-sting',
        'beedrill-twinneedle',
        'beedrill-envenom',
        'beedrill-hive-swarm',
    ]);
    assert.deepEqual(beedrill.forms['mega-beedrill'].skillIds, [
        'mega-beedrill-poison-sting',
        'beedrill-twinneedle',
        'mega-beedrill-fell-stinger',
        'beedrill-hive-swarm-mega',
    ]);
    assert.deepEqual(
        beedrill.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1 },
            { energy: [Energy.NINJUTSU], cooldown: 2 },
            { energy: [Energy.NINJUTSU], cooldown: 3 },
            { energy: [Energy.RANDOM], cooldown: 6 },
            { energy: [Energy.RANDOM], cooldown: 6 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 0 },
        ]
    );
    assert.equal(beedrill.forms['mega-beedrill'].healOnEnter, 25);
    beedrill.skills.forEach((skill) => assert.match(skill.image, /PokemonArena\/beedrill/i));
});

test('Poison Sting immediately deals and permanently repeats its growing stack', () => {
    let game = createGame({ seed: 1401, teams });
    game = enact(game, action('A', 0, 'beedrill-poison-sting', 'B', 0));
    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(poison(game.teams.B[0])?.turnStartDamage, 5);
    assert.equal(poison(game.teams.B[0])?.poisonStingStacks, 1);

    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'beedrill-poison-sting', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(poison(game.teams.B[0])?.turnStartDamage, 10);
    assert.equal(poison(game.teams.B[0])?.poisonStingStacks, 2);
});

test('Envenom bursts only poisoned enemies and its second use evolves Beedrill', () => {
    let game = createGame({ seed: 1403, teams });
    game.teams.A[0].hp = 40;
    game = enact(game, action('A', 0, 'beedrill-poison-sting', 'B', 0));
    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'beedrill-envenom', 'B', 0));
    assert.equal(game.teams.A[0].counters.envenomUses, 1);
    assert.equal(game.teams.A[0].form, 'base');
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'beedrill-envenom-blind'), true);
    assert.equal(game.teams.B[1].hp, 100);

    game = pass(game);
    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 0, 'beedrill-envenom', 'B', 0));
    assert.equal(game.teams.A[0].form, 'mega-beedrill');
    assert.equal(game.teams.A[0].hp, 65);
    assert.equal(game.teams.A[0].counters.envenomUses, 2);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'beedrill-evolution-tracker'), false);
    assert.equal(game.teams.A[0].statuses.some((status) =>
        status.id === 'beedrill-mega-reduction' && status.unpierceableDamageReductionFlat === 10
    ), true);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Mega Beedrill');
});

test('Hive Swarm installs Hive Sting, blocks two damage packets, and ignores enemy stuns', () => {
    const hiveTeams = {
        A: ['beedrill', 'squirtle', 'bulbasaur'],
        B: ['jigglypuff', 'beedrill', 'pidgey'],
    };
    let game = createGame({ seed: 1409, teams: hiveTeams });
    game = enact(game, action('A', 0, 'beedrill-hive-swarm', 'A', 0));
    const hive = game.teams.A[0].statuses.find((status) => status.id === 'beedrill-hive-swarm-status');
    assert.equal(hive?.ignoreNextEnemyDamageEffects, 2);

    const planning = structuredClone(game);
    ready(planning, 'A');
    assert.equal(validateAction(planning, action('A', 0, 'beedrill-hive-sting', 'B', 0)), null);
    assert.match(validateAction(planning, action('A', 0, 'beedrill-hive-swarm', 'A', 0)), /Unknown skill/);

    ready(game, 'B');
    game = enact(game, action('B', 0, 'jigglypuff-sing', 'A', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'jigglypuff-sing-lock'), false);
    assert.deepEqual(game.teams.A.slice(1).map((unit) =>
        unit.statuses.some((status) => status.id === 'jigglypuff-sing-lock')
    ), [true, true]);

    game = pass(game);
    ready(game, 'B');
    game = enact(game, action('B', 1, 'beedrill-twinneedle', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.events.filter((event) => event.kind === 'ignored-damage').length, 2);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'beedrill-hive-swarm-status')?.ignoreNextEnemyDamageEffects,
        0
    );
});

test('Hive Sting casts the current permanent Poison Sting stack on the enemy team', () => {
    let game = createGame({ seed: 1411, teams });
    game = enact(game, action('A', 0, 'beedrill-hive-swarm', 'A', 0));
    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'beedrill-hive-sting', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [90, 90, 90]);
    assert.deepEqual(game.teams.B.map((unit) => poison(unit)?.poisonStingStacks), [1, 1, 1]);
});

test('Fell Stinger scales from Poison Sting and permanently blinds only a surviving target', () => {
    let game = createGame({ seed: 1417, teams });
    game.teams.A[0].form = 'mega-beedrill';
    game = enact(game, action('A', 0, 'mega-beedrill-poison-sting', 'B', 0));
    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'mega-beedrill-fell-stinger', 'B', 0));
    assert.equal(game.teams.B[0].hp, 45);
    assert.equal(game.teams.B[0].statuses.some((status) =>
        status.id === 'mega-beedrill-permanent-blind' && status.durationActions === null
    ), true);

    game = createGame({ seed: 1418, teams });
    game.teams.A[0].form = 'mega-beedrill';
    game = enact(game, action('A', 0, 'mega-beedrill-poison-sting', 'B', 0));
    game = pass(game);
    game.teams.B[0].hp = 25;
    ready(game, 'A');
    game = enact(game, action('A', 0, 'mega-beedrill-fell-stinger', 'B', 0));
    assert.equal(game.teams.B[0].alive, false);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'mega-beedrill-permanent-blind'), false);
});

test('Rare Candy grants Mega Beedrill healing, reduction, and tracked defense', () => {
    const candyTeams = {
        A: ['pokemon-trainer', 'beedrill', 'bulbasaur'],
        B: ['chansey', 'eevee', 'pidgey'],
    };
    let game = createGame({ seed: 1423, teams: candyTeams });
    game.teams.A[1].hp = 40;
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(game.teams.A[1].form, 'mega-beedrill');
    assert.equal(game.teams.A[1].hp, 65);
    assert.equal(game.teams.A[1].shield, 25);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'beedrill-mega-reduction'), true);

    game.teams.A[1].shield = 0;
    ready(game, 'B');
    game = enact(game, action('B', 2, 'pidgey-gust', 'A', 1));
    assert.equal(game.teams.A[1].hp, 55);
});

test('Twinneedle chance and Beedrill evolution actions replay deterministically', () => {
    let game = createGame({ seed: 1, teams });
    game = enact(game, action('A', 0, 'beedrill-twinneedle', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'beedrill-twinneedle-blind'), true);
    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
