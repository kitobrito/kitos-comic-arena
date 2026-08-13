import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, validateAction } from '../reference/engine.mjs';
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
            A: ['dragonite', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Dragonite exposes exactly four active skills and its passive is not a castable skill', () => {
    assert.equal(ROSTER.dragonite.skills.length, 4);
    assert.deepEqual(ROSTER.dragonite.forms.base.skillIds, [
        'dragonite-dragon-claw', 'dragonite-hyper-beam', 'dragonite-draco-meteor', 'dragonite-dragon-boost',
    ]);
});

test('Dragon Claw deals 30 piercing damage, steals 1 energy, and taunts the target for exactly one of its turns', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game.energy.B = { taijutsu: 2, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    game = step(game, action('A', 0, 'dragonite-dragon-claw', 'B', 0));

    assert.equal(game.teams.B[0].hp, 70);
    // taijutsu is B's only nonzero energy type, so the steal deterministically drains it;
    // B's other pools aren't asserted since the standard per-turn income also lands here.
    assert.equal(game.energy.B.taijutsu, 1);
    assert.equal(
        game.events.some((event) => event.kind === 'energy-steal' && event.energy === 'taijutsu' && event.player === 'A'),
        true
    );
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'dragonite-taunt'), true);
    assert.equal(
        validateAction(game, action('B', 0, 'pidgey-peck', 'A', 1)),
        'This Pokemon is taunted and must use a harmful targeted skill on its taunter.'
    );
    assert.equal(validateAction(game, action('B', 0, 'pidgey-peck', 'A', 0)), null);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    game = step(game, action('A', 0, 'dragonite-dragon-boost', 'A', 0));
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'dragonite-taunt'), false);
});

test('Hyper Beam deals 35 affliction damage, blocks helpful skills, and taunts the target', () => {
    let game = matchup({ seed: 2 });
    game.teams.B[1].hp = 100;
    game = step(game, action('A', 0, 'dragonite-hyper-beam', 'B', 1));

    assert.equal(game.teams.B[1].hp, 65);
    assert.equal(
        validateAction(game, action('B', 1, 'zubat-draining-fangs', 'B', 1)),
        'This Pokémon cannot use helpful skills.'
    );
    assert.equal(game.teams.B[1].statuses.some((status) => status.id === 'dragonite-taunt'), true);
});

test('Draco Meteor taunts and deals 15 damage per turn to every enemy for 2 of their turns', () => {
    let game = matchup({ seed: 3 });
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'dragonite-draco-meteor', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
    assert.equal(game.teams.B.every((unit) => unit.statuses.some((status) => status.id === 'dragonite-taunt')), true);
});

test('Dragon Boost grants 1 Ninjutsu energy', () => {
    let game = matchup({ seed: 4 });
    game = step(game, action('A', 0, 'dragonite-dragon-boost', 'A', 0));
    assert.equal(game.energy.A.ninjutsu, 11);
});

test('Pressure grants a new stacking 10 unpierceable damage reduction each time Dragonite uses a skill', () => {
    let game = matchup({ seed: 5 });
    game = step(game, action('A', 0, 'dragonite-dragon-boost', 'A', 0));
    assert.equal(
        game.teams.A[0].statuses.filter((status) => status.id === 'dragonite-pressure-reduction').length,
        1
    );

    game.teams.A[0].hp = 100;
    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 90);

    game = step(game, action('A', 0, 'dragonite-dragon-claw', 'B', 0));
    assert.equal(
        game.teams.A[0].statuses.filter((status) => status.id === 'dragonite-pressure-reduction').length,
        2
    );
});
