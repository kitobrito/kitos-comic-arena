import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    legalActions,
    resolveQueuedTurn,
    viewerState,
} from '../reference/engine.mjs';
import { Energy } from '../reference/roster.mjs';

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

function status(unit, id) {
    return unit.statuses.find((entry) => entry.id === id);
}

test('casting a different weather effect replaces the current one immediately', () => {
    let game = createGame({ seed: 5, teams: { A: ['moltres', 'articuno', 'pikachu'], B: ['bulbasaur', 'eevee', 'jigglypuff'] } });
    game = enact(game, action('A', 0, 'moltres-sunny-day', 'A', 0));
    assert.equal(game.weather?.key, 'sunny-day');

    ready(game, 'A', { clearCooldowns: true });
    game = enact(game, action('A', 1, 'articuno-blizzard', 'B', 0));
    assert.equal(game.weather?.key, 'snowstorm');
    assert.equal(game.weather?.roundsRemaining, 4, 'the new weather starts at its own full duration');
});

test('Sunny Day reduces Grass energy costs and increases Electric energy costs by 1 Random', () => {
    let game = createGame({ seed: 7, teams: { A: ['moltres', 'bulbasaur', 'pikachu'], B: ['eevee', 'jigglypuff', 'chansey'] } });

    const vineBefore = legalActions(game, 'A').find((entry) => entry.skillId === 'bulbasaur-vine-whip');
    const shockBefore = legalActions(game, 'A').find((entry) => entry.skillId === 'pikachu-thundershock');
    assert.deepEqual(vineBefore?.energyCosts, [Energy.TAIJUTSU, Energy.RANDOM]);
    assert.deepEqual(shockBefore?.energyCosts, [Energy.GENJUTSU]);

    game = enact(game, action('A', 0, 'moltres-sunny-day', 'A', 0));
    ready(game, 'A', { clearCooldowns: true });

    const vineAfter = legalActions(game, 'A').find((entry) => entry.skillId === 'bulbasaur-vine-whip');
    const shockAfter = legalActions(game, 'A').find((entry) => entry.skillId === 'pikachu-thundershock');
    assert.deepEqual(vineAfter?.energyCosts, [Energy.TAIJUTSU], 'Grass skills cost 1 less Random energy');
    assert.deepEqual(shockAfter?.energyCosts, [Energy.GENJUTSU, Energy.RANDOM], 'Electric skills cost 1 more Random energy');
});

test('Snowstorm makes Ice skills impossible to evade, even against certain evasion', () => {
    let game = createGame({ seed: 9, teams: { A: ['articuno', 'moltres', 'zapdos'], B: ['pidgey', 'eevee', 'chansey'] } });
    game = enact(game, action('A', 0, 'articuno-blizzard', 'B', 0));
    assert.equal(game.weather?.key, 'snowstorm');

    game = pass(game);
    ready(game, 'B', { clearCooldowns: true });
    game = enact(game, action('B', 0, 'pidgey-whirlwind', 'B', 0));
    status(game.teams.B[0], 'pidgey-whirlwind').evadeChancePercent = 100;

    ready(game, 'A', { clearCooldowns: true });
    const hpBefore = game.teams.B[0].hp;
    game = enact(game, action('A', 0, 'articuno-ice-beam', 'B', 0));
    assert.ok(game.teams.B[0].hp < hpBefore, 'Ice Beam still hits despite 100% evasion');
    assert.equal(game.events.some((event) => event.kind === 'evade'), false);
});

test('weather is public and identical in both viewers\' state', () => {
    let game = createGame({ seed: 13, teams: { A: ['articuno', 'moltres', 'zapdos'], B: ['chansey', 'eevee', 'jigglypuff'] } });
    game = enact(game, action('A', 0, 'articuno-blizzard', 'B', 0));

    const viewA = viewerState(game, 'A');
    const viewB = viewerState(game, 'B');
    assert.deepEqual(viewA.weather, viewB.weather);
    assert.equal(viewA.weather.key, 'snowstorm');
    assert.equal(viewA.weather.roundsRemaining, 4);
    assert.equal(viewA.weather.totalRounds, 4);
});

test('weather expires after exactly its stated number of rounds', () => {
    let game = createGame({ seed: 17, teams: { A: ['articuno', 'moltres', 'zapdos'], B: ['chansey', 'eevee', 'jigglypuff'] } });
    game = enact(game, action('A', 0, 'articuno-blizzard', 'B', 0));
    assert.equal(game.weather?.roundsRemaining, 4);

    for (let round = 0; round < 3; round += 1) {
        game = pass(game);
        game = pass(game);
    }
    assert.equal(game.weather?.roundsRemaining, 1, 'three full rounds have elapsed');

    game = pass(game);
    game = pass(game);
    assert.equal(game.weather, null, 'the fourth round clears the weather');
});
