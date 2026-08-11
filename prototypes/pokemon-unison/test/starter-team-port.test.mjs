import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, legalActions, viewerState } from '../reference/engine.mjs';
import { ROSTER } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function skillIds(speciesId, formId) {
    return ROSTER[speciesId].forms[formId].skillIds;
}

test('each starter and evolved form exposes exactly four reviewed active skills', () => {
    assert.deepEqual(skillIds('charmander', 'base'), [
        'charmander-ember',
        'charmander-scratch',
        'charmander-flamethrower',
        'charmander-rage',
    ]);
    assert.deepEqual(skillIds('charmander', 'charmeleon'), [
        'charmander-fire-punch',
        'charmander-dragon-claw',
        'charmander-charmeleon-flamethrower',
        'charmander-charmeleon-rage',
    ]);
    assert.equal(skillIds('squirtle', 'base').length, 4);
    assert.equal(skillIds('squirtle', 'wartortle').length, 4);
    assert.equal(skillIds('bulbasaur', 'base').length, 4);
    assert.equal(skillIds('bulbasaur', 'ivysaur').length, 4);
    for (const speciesId of ['charmander', 'squirtle', 'bulbasaur']) {
        assert.ok(ROSTER[speciesId].passiveDescription);
    }
});

test('two successful Charmander proc events evolve it and replace all four skill slots', () => {
    let evolved = null;
    for (let seed = 1; seed <= 500 && !evolved; seed += 1) {
        let game = createGame({ seed });
        game.teams.A[0].hp = 80;
        game = enact(game, action('A', 0, 'charmander-ember', 'B', 0));
        game = enact(game, action('B', 0, 'pikachu-agility', 'B', 0));
        game = enact(game, action('A', 0, 'charmander-ember', 'B', 2));
        if (game.teams.A[0].form === 'charmeleon') evolved = game;
    }

    assert.ok(evolved, 'expected a deterministic seed with two successful Ember procs');
    assert.equal(evolved.teams.A[0].counters.evolution, 2);
    assert.equal(evolved.teams.A[0].hp, 85);
    evolved.currentPlayer = 'A';
    evolved.energy.A = { taijutsu: 5, ninjutsu: 5, bloodline: 5, genjutsu: 5 };
    const activeIds = new Set(legalActions(evolved, 'A').map((entry) => entry.skillId));
    assert.equal(activeIds.has('charmander-ember'), false);
    assert.equal(activeIds.has('charmander-fire-punch'), true);
    assert.equal(viewerState(evolved, 'A').teams.A[0].form, 'charmeleon');
});

test('Rage gains one stack per damaging enemy action and boosts base damage', () => {
    let game = createGame({ seed: 400 });
    game = enact(game, action('A', 0, 'charmander-rage', 'A', 0));
    game = enact(game, action('B', 2, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].counters.rage, 1);

    game = enact(game, action('A', 0, 'charmander-scratch', 'B', 2));
    const scratchDamage = game.events.filter(
        (event) => event.kind === 'damage' && event.message.includes('Scratch')
    )[0];
    assert.equal(scratchDamage.amount, 25);
});

test('Water Gun punishes harmful use with Guard Break and evolution progress', () => {
    let game = createGame({ seed: 9 });
    game = enact(game, action('A', 1, 'squirtle-water-gun', 'B', 0));
    game = enact(game, action('B', 0, 'pikachu-thundershock', 'A', 0));

    assert.equal(game.teams.B[0].statuses.some((status) => status.guardBroken), true);
    assert.equal(game.teams.A[1].counters.evolution, 1);
});

test('a third successful Withdraw block evolves Squirtle into Wartortle', () => {
    let game = createGame({ seed: 11 });
    game.teams.A[1].counters.evolution = 2;
    game.teams.A[1].hp = 70;
    game = enact(game, action('A', 1, 'squirtle-withdraw', 'A', 0));
    game = enact(game, action('B', 2, 'chansey-eggbomb', 'A', 0));

    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[1].form, 'wartortle');
    assert.equal(game.teams.A[1].hp, 80);
    assert.equal(game.events.some((event) => event.kind === 'blocked'), true);
});

test('Bulbasaur gains Sun when an ally acts and evolves at five Sun', () => {
    let game = createGame({ seed: 13 });
    game.teams.A[2].counters.sun = 4;
    game.teams.A[2].hp = 75;
    game = enact(game, action('A', 0, 'charmander-rage', 'A', 0));

    assert.equal(game.teams.A[2].form, 'ivysaur');
    assert.equal(game.teams.A[2].counters.sun, 0);
    assert.equal(game.teams.A[2].hp, 85);
});

test('Sun reduces Solar Beam random cost and Solar Beam consumes it', () => {
    let game = createGame({ seed: 15 });
    game.energy.A = { taijutsu: 1, ninjutsu: 0, bloodline: 1, genjutsu: 0 };
    game.teams.A[2].counters.sun = 4;
    const solar = action('A', 2, 'bulbasaur-solar-beam', 'B', 2);

    assert.equal(legalActions(game).some((entry) => entry.skillId === solar.skillId), true);
    game = enact(game, solar);
    assert.equal(game.teams.A[2].counters.sun, 0);
    assert.equal(game.teams.B[2].hp, 50);
});

test('Razor Leaf resolves its selected and other-enemy scopes independently', () => {
    let game = createGame({ seed: 17 });
    game.teams.A[2].counters.sun = 0;
    game = enact(game, action('A', 2, 'bulbasaur-razor-leaf', 'B', 0));

    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.B[1].hp, 95);
    assert.equal(game.teams.B[2].hp, 90);
});
