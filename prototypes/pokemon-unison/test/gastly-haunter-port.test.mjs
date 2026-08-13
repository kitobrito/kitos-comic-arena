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

const gastlyTeams = {
    A: ['gastly', 'charmander', 'squirtle'],
    B: ['pidgey', 'zubat', 'chansey'],
};

test('Gastly and Haunter expose the current four-slot forms and costs', () => {
    const gastly = ROSTER.gastly;
    assert.equal(gastly.skills.length, 8);
    assert.deepEqual(gastly.types, ['Ghost', 'Poison']);
    assert.deepEqual(gastly.forms.base.skillIds, [
        'gastly-lick',
        'gastly-curse',
        'gastly-spite',
        'gastly-glare',
    ]);
    assert.deepEqual(gastly.forms.haunter.skillIds, [
        'haunter-lick',
        'haunter-curse',
        'haunter-spite',
        'haunter-glare',
    ]);
    assert.deepEqual(gastly.skills.find((skill) => skill.id === 'gastly-lick').energy, [Energy.NINJUTSU]);
    assert.deepEqual(gastly.skills.find((skill) => skill.id === 'gastly-curse').energy, [Energy.NINJUTSU, Energy.GENJUTSU]);
    assert.deepEqual(gastly.skills.find((skill) => skill.id === 'gastly-spite').energy, [Energy.GENJUTSU, Energy.RANDOM]);
    assert.deepEqual(gastly.skills.find((skill) => skill.id === 'gastly-glare').energy, [Energy.GENJUTSU]);
    assert.equal(
        gastly.skills.find((skill) => skill.id === 'gastly-glare').description,
        'Guard Breaks one enemy and paralyzes their cooldowns for 2 turns. If that enemy uses a new skill while affected, they take 15 affliction damage.'
    );
});

test('Lick counts successful damage toward evolution and scales its stun chance from missing HP', () => {
    let game = createGame({ seed: 0, teams: gastlyTeams });
    game.teams.A[0].hp = 50;
    game = enact(game, action('A', 0, 'gastly-lick', 'B', 1));

    assert.equal(game.teams.B[1].hp, 80);
    assert.equal(game.teams.A[0].counters.evolution, 20);
    assert.equal(game.teams.B[1].statuses.some((status) => status.id === 'gastly-lick-lock'), true);
    assert.match(
        validateAction(game, action('B', 1, 'zubat-leech-life', 'A', 1)),
        /harmful skills are stunned/
    );

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['gastly-lick'];
    game = enact(game, action('A', 0, 'gastly-lick', 'B', 1));
    assert.equal(game.teams.A[0].counters.evolution, 35);
    assert.equal(game.teams.A[0].form, 'haunter');
    assert.equal(game.teams.A[0].hp, 60);
    assert.equal(unitPresentation(game.teams.A[0]).name, 'Haunter');
});

test('Curse deals immediate damage, costs Gastly 35 HP once, and ticks on later target turns', () => {
    let game = createGame({ seed: 18, teams: gastlyTeams });
    game = enact(game, action('A', 0, 'gastly-curse', 'B', 0));

    assert.equal(game.teams.A[0].form, 'base');
    assert.equal(game.teams.A[0].hp, 65);
    assert.equal(game.teams.A[0].counters.evolution, undefined);
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'gastly-curse-mark'), true);

    game = pass(game);
    assert.equal(game.teams.B[0].hp, 85);
    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 70);

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});

test('Spite applies current incoming reduction and flat-damage ordering', () => {
    let game = createGame({ seed: 999999, teams: gastlyTeams });
    game = enact(game, action('A', 0, 'gastly-spite', 'B', 0));

    ready(game, 'A');
    game = enact(game, action('A', 1, 'charmander-scratch', 'B', 0));
    assert.equal(game.teams.B[0].hp, 85);

    ready(game, 'A');
    game = enact(game, action('A', 1, 'charmander-ember', 'B', 0));
    assert.equal(game.teams.B[0].hp, 55);
});

test('Glare punishes only a skill being used for the first time and then consumes itself', () => {
    let game = createGame({ seed: 31, teams: gastlyTeams });
    game = enact(game, action('A', 0, 'gastly-glare', 'B', 0));
    game = enact(game, action('B', 0, 'pidgey-gust', 'A', 1));
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'gastly-glare-lock'), false);

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['gastly-glare'];
    game = enact(game, action('A', 0, 'gastly-glare', 'B', 0));
    ready(game, 'B');
    delete game.teams.B[0].cooldowns['pidgey-gust'];
    // Reset Pidgey's unrelated evolution progress so this second Gust cast can't incidentally
    // cross its evolution threshold and heal Pidgey, which would muddy the Glare assertion below.
    game.teams.B[0].counters.evolution = 0;
    game = enact(game, action('B', 0, 'pidgey-gust', 'A', 1));
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'gastly-glare-lock'), true);
});

test('Rare Candy immediately evolves Gastly and keeps its evolution tracker authoritative', () => {
    const teams = {
        A: ['pokemon-trainer', 'gastly', 'squirtle'],
        B: ['pidgey', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 47, teams });
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));

    assert.equal(game.teams.A[1].form, 'haunter');
    assert.equal(game.teams.A[1].shield, 25);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'gastly-evolution-tracker'), true);
});
