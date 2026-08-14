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
            A: ['chikorita', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Chikorita exposes exactly four active skills per form (six total across base/Bayleaf/Meganium) and its passive is not a castable skill', () => {
    assert.equal(ROSTER.chikorita.skills.length, 6);
    assert.deepEqual(ROSTER.chikorita.forms.base.skillIds, [
        'chikorita-aerial-razor-leaf', 'chikorita-light-screen',
        'chikorita-chikorita-solar-beam', 'chikorita-vine-defense',
    ]);
    assert.deepEqual(ROSTER.chikorita.forms.bayleaf.skillIds, [
        'chikorita-bayleaf-magical-leaf', 'chikorita-light-screen',
        'chikorita-chikorita-solar-beam', 'chikorita-vine-defense',
    ]);
    assert.deepEqual(ROSTER.chikorita.forms.meganium.skillIds, [
        'chikorita-meganium-magical-leaf', 'chikorita-light-screen',
        'chikorita-chikorita-solar-beam', 'chikorita-vine-defense',
    ]);
});

test('Bayleaf Magical Leaf splits its damage and stacks a temporary outgoing-damage debuff', () => {
    let game = matchup({ seed: 6 });
    game.teams.A[0].form = 'bayleaf';
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'chikorita-bayleaf-magical-leaf', 'B', 0));

    // Pidgey and Zubat are both part-Flying, which resists Grass (a flat reduction,
    // not a multiplier, per the production type table), so they take less than the
    // raw 30/15; Chansey (pure Normal) takes the full, unreduced 15 splash.
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 95, 85]);
    const mainDebuff = game.teams.B[0].statuses.find((status) => status.id === 'chikorita-magical-leaf-debuff');
    const splashDebuff = game.teams.B[1].statuses.find((status) => status.id === 'chikorita-magical-leaf-debuff');
    assert.equal(mainDebuff?.outgoingDamageDebuff, 15);
    assert.equal(splashDebuff?.outgoingDamageDebuff, 10);
});

test('Meganium Magical Leaf splits its damage and stacks a larger temporary outgoing-damage debuff', () => {
    let game = matchup({ seed: 6 });
    game.teams.A[0].form = 'meganium';
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'chikorita-meganium-magical-leaf', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [70, 85, 75]);
    const mainDebuff = game.teams.B[0].statuses.find((status) => status.id === 'chikorita-magical-leaf-debuff');
    const splashDebuff = game.teams.B[1].statuses.find((status) => status.id === 'chikorita-magical-leaf-debuff');
    assert.equal(mainDebuff?.outgoingDamageDebuff, 20);
    assert.equal(splashDebuff?.outgoingDamageDebuff, 15);
});

test('Sweet Scent applies a -5 aura to every enemy at game start and cycles Physical/Special/Affliction each turn', () => {
    const game = matchup();
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'chikorita-sweet-scent-aura-A-0')?.damageBonusBySkillClass,
        { Physical: -5 }
    );
    assert.deepEqual(
        game.teams.A[0].statuses.find((status) => status.id === 'chikorita-sweet-scent-passive')?.cyclingClassAura.classes,
        ['Physical', 'Special', 'Affliction']
    );
});

test('Aerial Razor Leaf splits damage 20/15 and permanently debuffs Sweet Scent’s current class by 10/5', () => {
    let game = matchup();
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'chikorita-aerial-razor-leaf', 'B', 0));

    // Grass is not-very-effective against Pidgey (Normal/Flying) and Zubat (Poison/Flying),
    // so their totals are floored below the raw 20/15/15 split; Chansey (plain Normal) is untouched.
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 95, 85]);
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'chikorita-razor-leaf-debuff')?.damageBonusBySkillClass,
        { Physical: -10 }
    );
    assert.deepEqual(
        game.teams.B[1].statuses.find((status) => status.id === 'chikorita-razor-leaf-debuff')?.damageBonusBySkillClass,
        { Physical: -5 }
    );
});

test('Light Screen shields for 25, and the first enemy skill to hit it weakens Sweet Scent’s class and adds a Solar Beam stack', () => {
    let game = matchup();
    game = step(game, action('A', 0, 'chikorita-light-screen', 'A', 0));
    assert.equal(game.teams.A[0].shield, 25);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'chikorita-light-screen-debuff')?.damageBonusBySkillClass,
        { Physical: -5 }
    );
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'chikorita-sweet-scent-passive')?.solarBeamStacks,
        1
    );
});

test('Solar Beam deals 35 plus 5 per Solar Beam stack, consumes the stacks, and stuns the current class for 3 turns', () => {
    let game = matchup({ seed: 2 });
    game.teams.A[0].statuses.find((status) => status.id === 'chikorita-sweet-scent-passive').solarBeamStacks = 3;
    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'chikorita-chikorita-solar-beam', 'B', 0));

    // 35 + 3*5 = 50, minus Grass's not-very-effective penalty against Pidgey (Normal/Flying).
    assert.equal(game.teams.B[0].hp, 55);
    assert.deepEqual(
        game.teams.B[0].statuses.find((status) => status.id === 'chikorita-solar-beam-stun')?.cannotUseSkillClasses,
        ['Physical']
    );
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'chikorita-sweet-scent-passive')?.solarBeamStacks,
        0
    );
    assert.equal(
        validateAction(game, action('B', 0, 'pidgey-gust', 'A', 0)),
        "This Pokemon's Physical skills are stunned."
    );
});

test('Vine Defense makes Chikorita invulnerable for one turn', () => {
    let game = matchup({ seed: 3 });
    game = step(game, action('A', 0, 'chikorita-vine-defense', 'A', 0));
    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
});
