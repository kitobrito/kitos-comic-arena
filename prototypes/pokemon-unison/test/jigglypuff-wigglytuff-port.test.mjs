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

function mark(unit) {
    return unit.statuses.find((status) => status.id === 'jigglypuff-perish-song-mark');
}

const teams = {
    A: ['jigglypuff', 'squirtle', 'bulbasaur'],
    B: ['chansey', 'eevee', 'pidgey'],
};

test('Jigglypuff and Wigglytuff expose both complete forms, source costs, cooldowns, passive, and artwork', () => {
    const jigglypuff = ROSTER.jigglypuff;
    assert.deepEqual(jigglypuff.types, ['Normal', 'Fairy']);
    assert.equal(jigglypuff.forcedEvolutionForm, 'wigglytuff');
    assert.deepEqual(jigglypuff.forms.base.skillIds, [
        'jigglypuff-perish-song',
        'jigglypuff-sing',
        'jigglypuff-wish',
        'jigglypuff-humiliate',
    ]);
    assert.deepEqual(jigglypuff.forms.wigglytuff.skillIds, [
        'wigglytuff-perish-song',
        'wigglytuff-sing',
        'wigglytuff-wish',
        'wigglytuff-humiliate',
    ]);
    assert.deepEqual(
        jigglypuff.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 3 },
            { energy: [Energy.RANDOM], cooldown: 2 },
            { energy: [], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.NINJUTSU, Energy.NINJUTSU, Energy.RANDOM], cooldown: 3 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [], cooldown: 2 },
        ]
    );
    assert.equal(jigglypuff.forms.wigglytuff.healOnEnter, 10);
    jigglypuff.skills.forEach((skill) => assert.match(skill.image, /PokemonArena\/jigglypuff/i));
});

test('Perish Song keeps one source-bound mark, counts target turns, executes through defense, and evolves its source', () => {
    let game = createGame({ seed: 1301, teams });
    game.teams.A[0].hp = 40;
    game.teams.B[0].shield = 50;
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    assert.equal(mark(game.teams.B[0])?.durationActions, 4);

    game = pass(game);
    assert.equal(mark(game.teams.B[0])?.durationActions, 3);
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 1));
    assert.equal(mark(game.teams.B[0]), undefined);
    assert.equal(mark(game.teams.B[1])?.durationActions, 4);

    for (let targetTurns = 0; targetTurns < 4; targetTurns += 1) {
        game = pass(game);
        if (targetTurns < 3 && !game.winner) game = pass(game);
    }
    assert.equal(game.teams.B[1].alive, false);
    assert.equal(game.teams.B[1].hp, 0);
    assert.equal(game.teams.A[0].form, 'wigglytuff');
    assert.equal(game.teams.A[0].hp, 50);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Wigglytuff');
});

test('Perish Song is removed immediately when its source is defeated', () => {
    let game = createGame({ seed: 1303, teams });
    game.teams.A[0].hp = 10;
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    ready(game, 'B');
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].alive, false);
    assert.equal(mark(game.teams.B[0]), undefined);
});

test('Sing channels for two turns, stuns only its single target, and advances every enemy Perish Song each turn', () => {
    let game = createGame({ seed: 1307, teams });
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    game = pass(game);
    assert.equal(mark(game.teams.B[0])?.durationActions, 3);
    game = enact(game, action('A', 0, 'jigglypuff-sing', 'B', 0));
    // The channel only advances Perish Song at the start of Jigglypuff's own next turn, not immediately on cast.
    assert.equal(mark(game.teams.B[0])?.durationActions, 3);
    assert.deepEqual(
        game.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'jigglypuff-sing-stun')),
        [true, false, false]
    );
    assert.match(
        validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)),
        /harmful skills/
    );
    assert.equal(validateAction(game, action('B', 0, 'chansey-softboil', 'B', 1)), null);

    // One more full round: the mark's own natural decay plus the channel's own advance both fire.
    game = pass(game);
    game = pass(game);
    assert.equal(mark(game.teams.B[0])?.durationActions, 1);
});

test('Wish heals on the allied turn and a marked enemy targeting it advances Perish Song before healing', () => {
    let game = createGame({ seed: 1319, teams });
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 2));
    game = pass(game);
    game.teams.A[1].hp = 50;
    game = enact(game, action('A', 0, 'jigglypuff-wish', 'A', 1));
    assert.equal(game.teams.A[1].hp, 50);
    ready(game, 'B');
    game = enact(game, action('B', 2, 'pidgey-gust', 'A', 1));
    assert.equal(game.events.some((event) =>
        event.kind === 'status-accelerated' && event.remainingTurns === 2
    ), true);
    assert.equal(game.teams.A[1].hp, 55);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'jigglypuff-wish-heal'), false);
    assert.equal(mark(game.teams.B[2])?.durationActions, 1);
});

test('Humiliate requires a new harmful skill, grants one seeded color, and consumes after success', () => {
    let game = createGame({ seed: 1321, teams });
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'jigglypuff-humiliate', 'B', 0));
    ready(game, 'B');
    const energyEventsBefore = game.events.length;
    game = enact(game, action('B', 0, 'chansey-softboil', 'B', 1));
    assert.equal(mark(game.teams.B[0])?.durationActions, 2);
    assert.equal(
        game.events.slice(energyEventsBefore).some((event) =>
            event.kind === 'energy' && /Humiliate/.test(event.message)
        ),
        false
    );

    game = createGame({ seed: 1322, teams });
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'jigglypuff-humiliate', 'B', 0));
    ready(game, 'B');
    const harmfulEnergyEventsBefore = game.events.length;
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 1));
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'jigglypuff-humiliate-mark'),
        false
    );
    const humiliateEnergy = game.events.slice(harmfulEnergyEventsBefore).find((event) =>
        event.kind === 'energy' && /Humiliate/.test(event.message)
    );
    assert.ok(humiliateEnergy);
    assert.ok([Energy.TAIJUTSU, Energy.NINJUTSU, Energy.BLOODLINE, Energy.GENJUTSU].includes(humiliateEnergy.energy));
});

test('Humiliate costs no energy and instantly grants energy if the target is already Sing-locked', () => {
    let game = createGame({ seed: 1323, teams });
    game = enact(game, action('A', 0, 'jigglypuff-sing', 'B', 0));
    assert.ok(game.teams.B[0].statuses.some((status) => status.id === 'jigglypuff-sing-stun'));

    ready(game, 'A');
    const energyBefore = game.energy.A[Energy.TAIJUTSU] + game.energy.A[Energy.NINJUTSU] +
        game.energy.A[Energy.BLOODLINE] + game.energy.A[Energy.GENJUTSU];
    const eventsBefore = game.events.length;
    game = enact(game, action('A', 0, 'jigglypuff-humiliate', 'B', 0));
    const energyAfter = game.energy.A[Energy.TAIJUTSU] + game.energy.A[Energy.NINJUTSU] +
        game.energy.A[Energy.BLOODLINE] + game.energy.A[Energy.GENJUTSU];
    assert.equal(energyAfter, energyBefore + 1, 'the Sing-lock check grants energy immediately on cast');
    assert.ok(game.events.slice(eventsBefore).some((event) => event.kind === 'energy'));
});

test('Wigglytuff Wish heals the team and an all-target skill advances the one shared countdown once', () => {
    let game = createGame({ seed: 1327, teams });
    game.teams.A[0].form = 'wigglytuff';
    game = enact(game, action('A', 0, 'wigglytuff-perish-song', 'B', 1));
    game = pass(game);
    game.teams.A.forEach((unit) => { unit.hp = 50; });
    game = enact(game, action('A', 0, 'wigglytuff-wish', 'A', 0));
    ready(game, 'B');
    game = enact(game, action('B', 1, 'eevee-swift', 'A', 0));
    const accelerations = game.events.filter((event) =>
        event.kind === 'status-accelerated' && event.skillId !== 'ignored'
    );
    assert.equal(accelerations.length, 1);
    assert.deepEqual(game.teams.A.map((unit) => unit.hp), [55, 55, 55]);
    // B[1]'s own turn completing this same action also naturally decays its (target-anchored) mark,
    // so the Wish-triggered acceleration on top of that empties the 3-turn evolved mark entirely.
    assert.equal(mark(game.teams.B[1]), undefined);
    assert.equal(game.teams.B[1].alive, false);
});

test('Rare Candy evolves Jigglypuff and Perish Song sequences replay deterministically', () => {
    const candyTeams = {
        A: ['pokemon-trainer', 'jigglypuff', 'bulbasaur'],
        B: ['chansey', 'eevee', 'pidgey'],
    };
    let candy = createGame({ seed: 1329, teams: candyTeams });
    candy.teams.A[1].hp = 40;
    candy = enact(candy, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(candy.teams.A[1].form, 'wigglytuff');
    assert.equal(candy.teams.A[1].hp, 50);
    assert.equal(candy.teams.A[1].shield, 25);

    let game = createGame({ seed: 1331, teams });
    game = enact(game, action('A', 0, 'jigglypuff-perish-song', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'jigglypuff-sing', 'B', 0));
    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
