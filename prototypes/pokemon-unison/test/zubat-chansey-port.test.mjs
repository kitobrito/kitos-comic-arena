import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, validateAction } from '../reference/engine.mjs';
import { ROSTER, unitPresentation } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function matchup({ seed = 0x5eed1234, startingPlayer = 'A' } = {}) {
    return createGame({
        seed,
        startingPlayer,
        teams: {
            A: ['zubat', 'chansey', 'pikachu'],
            B: ['zubat', 'chansey', 'pikachu'],
        },
    });
}

test('Zubat, Golbat, Chansey, and Blissey expose four canonical active skills per form', () => {
    assert.equal(ROSTER.zubat.forms.base.skillIds.length, 4);
    assert.equal(ROSTER.zubat.forms.golbat.skillIds.length, 4);
    assert.equal(ROSTER.chansey.forms.base.skillIds.length, 4);
    assert.equal(ROSTER.chansey.forms.blissey.skillIds.length, 4);
    assert.equal(ROSTER.zubat.skills.length, 8);
    assert.equal(ROSTER.chansey.skills.length, 8);
});

test('Zubat evolves from actual stolen HP and replaces all four active skills', () => {
    let game = matchup();
    game.teams.A[0].hp = 50;
    game.teams.A[0].counters.evolution = 49;
    game = enact(game, action('A', 0, 'zubat-leech-life', 'B', 0));

    const zubat = game.teams.A[0];
    assert.equal(zubat.form, 'golbat');
    assert.equal(zubat.counters.evolution, 50);
    assert.equal(zubat.hp, 75);
    assert.deepEqual(unitPresentation(zubat).skillIds, [
        'golbat-leech-life',
        'golbat-supersonic',
        'golbat-bite',
        'golbat-draining-fangs',
    ]);
});

test('Supersonic adds a random cost and deterministically interrupts a failed skill', () => {
    let game = matchup({ seed: 0 });
    game = enact(game, action('A', 0, 'zubat-supersonic', 'B', 0));

    game.energy.B = { taijutsu: 1, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    const bite = action('B', 0, 'zubat-bite', 'A', 0);
    assert.equal(validateAction(game, bite), 'Not enough energy.');

    game.energy.B.bloodline = 1;
    game = enact(game, bite);
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.events.some((event) => event.kind === 'skill-failed'), true);
});

test('Leech Life reckoning punishes the target’s next skill and advances evolution', () => {
    let game = matchup({ seed: 1 });
    game.teams.A[0].hp = 50;
    game = enact(game, action('A', 0, 'zubat-leech-life', 'B', 0));
    assert.equal(game.teams.A[0].counters.evolution, 15);

    game = enact(game, action('B', 0, 'zubat-bite', 'A', 0));
    assert.equal(game.teams.B[0].hp, 80);
    assert.equal(game.teams.A[0].hp, 50);
    assert.equal(game.teams.A[0].counters.evolution, 20);
});

test('Pokémon Center Healing counts actual healing and grants team defense at turn end', () => {
    let game = matchup();
    game.teams.A.forEach((unit) => { unit.hp = 80; });
    game = enact(game, action('A', 1, 'chansey-pokemon-center-healing', 'A', 0));

    assert.deepEqual(game.teams.A.map((unit) => unit.hp), [90, 90, 90]);
    assert.deepEqual(game.teams.A.map((unit) => unit.shield), [5, 5, 5]);
    assert.deepEqual(game.teams.A.map((unit) => unit.shieldCapacity), [5, 5, 5]);
    assert.equal(game.teams.A[1].counters.evolution, 30);

    game = enact(game, action('B', 0, 'zubat-bite', 'A', 0));
    assert.equal(game.teams.A[0].shield, 0);
    assert.equal(game.teams.A[0].shieldCapacity, 5);
});

test('Chansey evolves at 100 actual healing and activates the Blissey skill set', () => {
    let game = matchup();
    game.teams.A.forEach((unit) => { unit.hp = 50; });
    game.teams.A[1].counters.evolution = 90;
    game = enact(game, action('A', 1, 'chansey-pokemon-center-healing', 'A', 0));

    const chansey = game.teams.A[1];
    assert.equal(chansey.form, 'blissey');
    assert.equal(chansey.counters.evolution, 100);
    assert.deepEqual(unitPresentation(chansey).skillIds, [
        'blissey-eggbomb',
        'blissey-pokemon-center-healing',
        'blissey-softboil',
        'blissey-emergency-life-support',
    ]);
});

test('Blissey Emergency Life Support can legally revive and cleanse a defeated ally', () => {
    let game = matchup();
    game.teams.A[1].form = 'blissey';
    game.teams.A[0].hp = 0;
    game.teams.A[0].alive = false;
    game.teams.A[0].statuses.push({
        id: 'test-harmful', name: 'Test Harm', harmful: true, durationActions: 3,
        sourcePlayer: 'B', sourceSlot: 0, appliedTurn: 0,
    });
    const revive = action('A', 1, 'blissey-emergency-life-support', 'A', 0);

    assert.equal(validateAction(game, revive), null);
    game = enact(game, revive);
    assert.equal(game.teams.A[0].alive, true);
    assert.equal(game.teams.A[0].hp, 50);
    assert.equal(game.teams.A[0].statuses.some((status) => status.harmful), false);
    assert.equal(game.events.some((event) => event.kind === 'revive'), true);
});

test('Pokémon Center removes Blissey Emergency Life Support’s random energy cost', () => {
    let game = matchup();
    game.teams.A[1].form = 'blissey';
    game = enact(game, action('A', 1, 'blissey-pokemon-center-healing', 'A', 0));
    game.currentPlayer = 'A';
    game.energy.A = { taijutsu: 0, ninjutsu: 0, bloodline: 1, genjutsu: 1 };

    assert.equal(
        validateAction(game, action('A', 1, 'blissey-emergency-life-support', 'A', 0)),
        null
    );
});
