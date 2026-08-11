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

const teams = {
    A: ['magikarp', 'charmander', 'squirtle'],
    B: ['chansey', 'scyther', 'pidgey'],
};

test('Magikarp and Gyarados expose the complete current four-slot kits and costs', () => {
    const magikarp = ROSTER.magikarp;
    assert.equal(magikarp.skills.length, 9);
    assert.deepEqual(magikarp.forms.base.skillIds, [
        'magikarp-tackle', 'magikarp-splash', 'magikarp-flail', 'magikarp-struggle',
    ]);
    assert.deepEqual(magikarp.forms.gyarados.skillIds, [
        'gyarados-hyper-beam', 'gyarados-dragon-rage', 'gyarados-ice-fang', 'gyarados-hydro-pump',
    ]);
    assert.deepEqual(
        magikarp.skills.find((skill) => skill.id === 'magikarp-struggle').energy,
        [Energy.RANDOM]
    );
    assert.deepEqual(
        magikarp.skills.find((skill) => skill.id === 'gyarados-hyper-beam').energy,
        [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM, Energy.RANDOM]
    );
    assert.deepEqual(
        magikarp.skills.find((skill) => skill.id === 'gyarados-hydro-pump').energy,
        [Energy.NINJUTSU, Energy.RANDOM, Energy.RANDOM]
    );
});

test('Struggle is legal only while all three other active Magikarp skills are cooling down', () => {
    let game = createGame({ seed: 1033, teams });
    const struggle = action('A', 0, 'magikarp-struggle', 'B', 0);
    assert.match(validateAction(game, struggle), /all other active skills/i);
    assert.equal(
        legalActions(game).some((entry) => entry.actorSlot === 0 && entry.skillId === 'magikarp-struggle'),
        false
    );

    game.teams.A[0].cooldowns = {
        'magikarp-tackle': 1,
        'magikarp-splash': 1,
        'magikarp-flail': 1,
    };
    assert.equal(validateAction(game, struggle), null);
    game = enact(game, struggle);
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.A[0].hp, 95);
});

test('the sixth Magikarp turn evolves it into Water/Flying Gyarados and restores 10 HP', () => {
    let game = createGame({ seed: 1039, teams });
    game.teams.A[0].hp = 70;
    assert.equal(game.teams.A[0].counters.evolution, 1);

    for (let turn = 2; turn <= 6; turn += 1) {
        game = pass(game);
        game = pass(game);
    }

    const gyarados = game.teams.A[0];
    assert.equal(gyarados.form, 'gyarados');
    assert.equal(gyarados.hp, 80);
    assert.equal(gyarados.counters.evolution, 6);
    assert.deepEqual(unitPresentation(gyarados).types, ['Water', 'Flying']);
    assert.deepEqual(unitPresentation(gyarados).skillIds, ROSTER.magikarp.forms.gyarados.skillIds);
});

test('Splash can evolve Magikarp immediately and transfers slot cooldowns', () => {
    let game = createGame({ seed: 1049, teams });
    game.teams.A[0].hp = 80;
    game.teams.A[0].counters.evolution = 5;
    game.teams.A[0].cooldowns['magikarp-tackle'] = 2;
    game.teams.A[0].cooldowns['magikarp-flail'] = 3;
    game = enact(game, action('A', 0, 'magikarp-splash', 'A', 0));

    const gyarados = game.teams.A[0];
    assert.equal(gyarados.form, 'gyarados');
    assert.equal(gyarados.hp, 90);
    assert.equal(gyarados.cooldowns['gyarados-hyper-beam'], 2);
    assert.equal(gyarados.cooldowns['gyarados-ice-fang'], 3);
    assert.equal(gyarados.cooldowns['gyarados-dragon-rage'], undefined);
    assert.equal(gyarados.cooldowns['magikarp-splash'], 4);
});

test('Dragon Rage ticks on three Gyarados turn ends and temporarily replaces Hyper Beam', () => {
    let game = createGame({ seed: 1051, teams });
    game.teams.A[0].form = 'gyarados';
    game = enact(game, action('A', 0, 'gyarados-dragon-rage', 'B', 2));
    assert.equal(game.teams.B[2].hp, 80);

    game = pass(game);
    const gyaradosSkills = unitPresentation(game.teams.A[0]).skillIds;
    assert.equal(gyaradosSkills[0], 'gyarados-hyper-beam-affliction');
    game = pass(game);
    assert.equal(game.teams.B[2].hp, 60);
    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.B[2].hp, 40);
    game = pass(game);
    assert.equal(unitPresentation(game.teams.A[0]).skillIds[0], 'gyarados-hyper-beam');
});

test('Dragon Rage makes Hyper Beam affliction damage and Hyper Beam locks the next Gyarados turn', () => {
    let game = createGame({ seed: 1061, teams });
    game.teams.A[0].form = 'gyarados';
    game = enact(game, action('A', 0, 'gyarados-dragon-rage', 'B', 2));
    game = pass(game);
    ready(game, 'A');
    game = enact(game, action('A', 0, 'gyarados-hyper-beam-affliction', 'B', 0));
    assert.equal(game.teams.B[0].hp, 35);
    game = pass(game);
    assert.equal(
        legalActions(game).some((entry) => entry.actorSlot === 0),
        false
    );
    game = pass(game);
    game = pass(game);
    assert.equal(
        legalActions(game).some((entry) => entry.actorSlot === 0),
        true
    );
});

test('Ice Fang uses the current 45-damage runtime, ignores ordinary reduction, respects defense, and stuns', () => {
    let game = createGame({ seed: 1063, teams });
    game.teams.A[0].form = 'gyarados';
    game.teams.B[0].shield = 10;
    game.teams.B[0].statuses.push({
        id: 'test-reduction', name: 'Test Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionPercent: 50,
    });
    game = enact(game, action('A', 0, 'gyarados-ice-fang', 'B', 0));
    assert.equal(game.teams.B[0].shield, 0);
    assert.equal(game.teams.B[0].hp, 65);
    assert.match(
        validateAction(game, action('B', 0, 'chansey-eggbomb', 'A', 0)),
        /cannot use skills/i
    );
});

test('Hydro Pump keeps selected and splash packets separate', () => {
    let game = createGame({ seed: 1069, teams });
    game.teams.A[0].form = 'gyarados';
    game = enact(game, action('A', 0, 'gyarados-hydro-pump', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [55, 85, 85]);
});

test('turn-count evolution and Gyarados actions replay deterministically', () => {
    let game = createGame({ seed: 1087, teams });
    for (let turn = 2; turn <= 6; turn += 1) {
        game = pass(game);
        game = pass(game);
    }
    game = enact(game, action('A', 0, 'gyarados-hydro-pump', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
