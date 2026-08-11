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

const magnemiteTeams = {
    A: ['magnemite', 'squirtle', 'bulbasaur'],
    B: ['chansey', 'eevee', 'hitmonchan'],
};

test('Magnemite and Magneton expose the production types, forms, costs, cooldowns, classes, passive, and artwork', () => {
    const magnemite = ROSTER.magnemite;

    assert.deepEqual(magnemite.types, ['Electric', 'Steel']);
    assert.equal(magnemite.forcedEvolutionForm, 'magneton');
    assert.deepEqual(magnemite.forms.base.skillIds, [
        'magnemite-spark',
        'magnemite-thunder-wave',
        'magnemite-swift',
        'magnemite-magnet-rise',
    ]);
    assert.deepEqual(magnemite.forms.magneton.skillIds, [
        'magneton-spark',
        'magneton-thunder-wave',
        'magneton-flash-cannon',
        'magneton-magnet-rise',
    ]);
    assert.deepEqual(
        magnemite.skills.map(({ energy, cooldown, classes }) => ({ energy, cooldown, classes })),
        [
            { energy: [Energy.RANDOM], cooldown: 0, classes: ['Electric', 'Special', 'Instant'] },
            { energy: [Energy.GENJUTSU], cooldown: 3, classes: ['Electric', 'Special', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 1, classes: ['Normal', 'Special', 'Instant'] },
            { energy: [Energy.GENJUTSU], cooldown: 6, classes: ['Electric', 'Strategic', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 0, classes: ['Electric', 'Special', 'Instant'] },
            { energy: [Energy.GENJUTSU, Energy.GENJUTSU], cooldown: 3, classes: ['Electric', 'Special', 'Instant'] },
            { energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 1, classes: ['Steel', 'Special', 'Instant'] },
            { energy: [Energy.GENJUTSU], cooldown: 6, classes: ['Electric', 'Strategic', 'Instant'] },
        ]
    );
    assert.match(magnemite.passiveDescription, /Spark and Thunder Wave.*Magnet Rise/i);
    magnemite.skills.forEach((skill) => assert.match(skill.image, /mangemite/i));
});

test('Magnet Rise blocks enemy Physical skills and adds five damage to every Magnemite packet', () => {
    const teams = {
        A: ['magnemite', 'squirtle', 'bulbasaur'],
        B: ['hitmonchan', 'chansey', 'eevee'],
    };
    let game = createGame({ seed: 701, teams });
    game = enact(game, action('A', 0, 'magnemite-magnet-rise', 'A', 0));

    game = enact(game, action('B', 0, 'hitmonchan-mega-punch', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);

    game = enact(game, action('A', 0, 'magnemite-spark', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 90, 90]);
    assert.equal(game.teams.A[0].counters.evolution, 1);
});

test('Thunder Wave freezes cooldown recovery, blocks only harmful skills, and empowers the next Spark', () => {
    let game = createGame({ seed: 719, teams: magnemiteTeams });
    game.teams.B[0].cooldowns['chansey-pokemon-center-healing'] = 2;
    game = enact(game, action('A', 0, 'magnemite-thunder-wave', 'B', 0));

    assert.equal(game.teams.B[0].cooldowns['chansey-pokemon-center-healing'], 2);
    assert.match(
        validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)),
        /harmful skills are stunned/i
    );
    assert.equal(validateAction(game, action('B', 0, 'chansey-softboil', 'B', 1)), null);

    ready(game, 'A');
    game = enact(game, action('A', 0, 'magnemite-spark', 'B', 0));
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'magnemite-thunder-wave-mark'),
        false
    );
    assert.equal(game.teams.B[0].cooldowns['chansey-pokemon-center-healing'], 1);
});

test('Swift stacks target-side piercing vulnerability and Spark consumes the full stored amount', () => {
    let game = createGame({ seed: 733, teams: magnemiteTeams });
    game = enact(game, action('A', 0, 'magnemite-swift', 'B', 1));
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['magnemite-swift'];
    game = enact(game, action('A', 0, 'magnemite-swift', 'B', 1));

    assert.equal(
        game.teams.B[1].statuses.find((status) => status.id === 'magnemite-piercing-vulnerability')
            ?.storedPiercingBonus,
        10
    );

    ready(game, 'A');
    game = enact(game, action('A', 0, 'magnemite-spark', 'B', 1));
    assert.equal(game.teams.B[1].hp, 20);
    assert.equal(
        game.teams.B[1].statuses.some((status) => status.id === 'magnemite-piercing-vulnerability'),
        false
    );
});

test('using Spark and Thunder Wave in either order during one Magnet Rise evolves Magnemite and heals ten HP', () => {
    let game = createGame({ seed: 751, teams: magnemiteTeams });
    game.teams.A[0].hp = 60;
    game = enact(game, action('A', 0, 'magnemite-magnet-rise', 'A', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'magnemite-spark', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'magnemite-thunder-wave', 'B', 1));

    assert.equal(game.teams.A[0].form, 'magneton');
    assert.equal(game.teams.A[0].hp, 70);
    assert.equal(game.teams.A[0].counters.evolution, 2);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Magneton');
    assert.deepEqual(unitPresentation(game.teams.A[0]).skillIds, ROSTER.magnemite.forms.magneton.skillIds);

    let reverse = createGame({ seed: 752, teams: magnemiteTeams });
    reverse = enact(reverse, action('A', 0, 'magnemite-magnet-rise', 'A', 0));
    reverse = pass(reverse);
    reverse = enact(reverse, action('A', 0, 'magnemite-thunder-wave', 'B', 0));
    reverse = pass(reverse);
    reverse = enact(reverse, action('A', 0, 'magnemite-spark', 'B', 0));
    assert.equal(reverse.teams.A[0].form, 'magneton');
});

test('Magneton upgrades Spark to three team packets, Thunder Wave to the enemy team, and Flash Cannon vulnerability to ten', () => {
    let sparkGame = createGame({ seed: 769, teams: magnemiteTeams });
    sparkGame.teams.A[0].form = 'magneton';
    sparkGame = enact(sparkGame, action('A', 0, 'magneton-spark', 'B', 0));
    assert.deepEqual(sparkGame.teams.B.map((unit) => unit.hp), [70, 85, 85]);

    let waveGame = createGame({ seed: 773, teams: magnemiteTeams });
    waveGame.teams.A[0].form = 'magneton';
    waveGame = enact(waveGame, action('A', 0, 'magneton-thunder-wave', 'B', 1));
    assert.deepEqual(
        waveGame.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'magneton-thunder-wave-stun')),
        [true, true, true]
    );
    assert.deepEqual(
        waveGame.teams.B.map((unit) => unit.statuses.some((status) => status.id === 'magnemite-thunder-wave-mark')),
        [false, true, false]
    );

    let cannonGame = createGame({ seed: 787, teams: magnemiteTeams });
    cannonGame = enact(cannonGame, action('A', 0, 'magnemite-swift', 'B', 1));
    cannonGame.teams.B[1].hp = 100;
    cannonGame.teams.A[0].form = 'magneton';
    ready(cannonGame, 'A');
    cannonGame = enact(cannonGame, action('A', 0, 'magneton-flash-cannon', 'B', 1));
    assert.equal(cannonGame.teams.B[1].hp, 55);
    assert.equal(
        cannonGame.teams.B[1].statuses.find((status) => status.id === 'magnemite-piercing-vulnerability')
            ?.storedPiercingBonus,
        10
    );
});

test('Magnemite evolution and Magneton multi-packet actions replay deterministically', () => {
    let game = createGame({ seed: 809, teams: magnemiteTeams });
    game = enact(game, action('A', 0, 'magnemite-magnet-rise', 'A', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'magnemite-spark', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'magnemite-thunder-wave', 'B', 1));
    game = pass(game);
    game = enact(game, action('A', 0, 'magneton-spark', 'B', 1));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
