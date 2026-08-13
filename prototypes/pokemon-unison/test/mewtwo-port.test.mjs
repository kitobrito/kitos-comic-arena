import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, legalActions } from '../reference/engine.mjs';
import { ROSTER } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function fullEnergy(state, player) {
    state.energy[player] = { taijutsu: 10, ninjutsu: 10, bloodline: 10, genjutsu: 10 };
}

function step(state, nextAction) {
    fullEnergy(state, nextAction.player);
    return enact(state, nextAction);
}

function matchup({ seed = 1 } = {}) {
    return createGame({
        seed,
        teams: {
            A: ['mewtwo', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Mewtwo exposes exactly four single-form skills', () => {
    assert.equal(ROSTER.mewtwo.skills.length, 4);
    assert.deepEqual(ROSTER.mewtwo.forms.base.skillIds, [
        'mewtwo-psychic', 'mewtwo-shadow-ball', 'mewtwo-drain-punch', 'mewtwo-recover',
    ]);
});

test('Drain Punch steals 20 HP and empowers the next Psychic or Shadow Ball', () => {
    let game = matchup();
    game.teams.A[0].hp = 50;
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'mewtwo-drain-punch', 'B', 0));

    assert.equal(game.teams.B[0].hp, 80);
    assert.equal(game.teams.A[0].hp, 70);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mewtwo-drain-punch-followup'),
        true
    );
});

test('Psychic deals 20 damage, steals a copy-safe helpful status, and consumes a Drain Punch follow-up for +5 lifesteal', () => {
    let game = matchup({ seed: 2 });
    game.teams.B[0].statuses.push({
        id: 'test-buff', name: 'Test Buff', hidden: false, harmful: false,
        durationActions: 3, sourcePlayer: 'B', sourceSlot: 0, appliedTurn: 0,
    });
    game.teams.A[0].statuses.push({
        id: 'mewtwo-drain-punch-followup', name: 'Drain Punch Follow-Up', hidden: true, harmful: false,
        durationActions: 1, durationAnchor: 'source', sourcePlayer: 'A', sourceSlot: 0, appliedTurn: 0,
    });
    game.teams.A[0].hp = 70;
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'mewtwo-psychic', 'B', 0));

    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.A[0].hp, 75);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mewtwo-drain-punch-followup'),
        false
    );
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'test-buff'),
        false
    );
    const stolen = game.teams.A[0].statuses.find((status) => status.id === 'mewtwo-psychic-stolen-test-buff');
    assert.ok(stolen);
    assert.equal(stolen.durationActions, 2);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mewtwo-psychic-followup'),
        true
    );
});

test('Shadow Ball deals 20 damage, consumes a Psychic follow-up for +5 damage, and locks the target’s skills for exactly one of their turns', () => {
    let game = matchup({ seed: 3 });
    game.teams.A[0].statuses.push({
        id: 'mewtwo-psychic-followup', name: 'Psychic Follow-Up', hidden: true, harmful: false,
        durationActions: 1, durationAnchor: 'source', sourcePlayer: 'A', sourceSlot: 0, appliedTurn: 0,
    });
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'mewtwo-shadow-ball', 'B', 0));

    // Ghost vs Pidgey's Normal/Flying typing floors each of the two separate damage
    // effects (20 base, 5 follow-up bonus) at a minimum of 5, so 20->10 and 5->5.
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mewtwo-psychic-followup'),
        false
    );
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mewtwo-shadow-ball-followup'),
        true
    );
    assert.equal(legalActions(game).some((candidate) => candidate.actorSlot === 0), false);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'mewtwo-drain-punch', 'B', 1));
    assert.equal(legalActions(game).some((candidate) => candidate.actorSlot === 0), true);
});

test('Recover heals 20 HP, 2 less on each consecutive use, and resets after a different skill', () => {
    let game = matchup({ seed: 4 });
    game.teams.A[0].hp = 20;
    game = step(game, action('A', 0, 'mewtwo-recover', 'A', 0));
    assert.equal(game.teams.A[0].hp, 40);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'mewtwo-recover', 'A', 0));
    assert.equal(game.teams.A[0].hp, 58);

    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = step(game, action('A', 0, 'mewtwo-drain-punch', 'B', 0));
    game = step(game, action('B', 1, 'zubat-bite', 'A', 1));
    const hpBeforeReset = game.teams.A[0].hp;
    game = step(game, action('A', 0, 'mewtwo-recover', 'A', 0));
    assert.equal(game.teams.A[0].hp - hpBeforeReset, 20);
});
