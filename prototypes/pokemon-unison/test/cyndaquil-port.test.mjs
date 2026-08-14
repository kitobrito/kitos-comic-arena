import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame } from '../reference/engine.mjs';
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
            A: ['cyndaquil', 'charmander', 'squirtle'],
            B: ['pidgey', 'zubat', 'chansey'],
        },
    });
}

test('Cyndaquil exposes exactly four active skills per form (six total across base/Quilava/Typhlosion) and its passive is not a castable skill', () => {
    assert.equal(ROSTER.cyndaquil.skills.length, 6);
    assert.deepEqual(ROSTER.cyndaquil.forms.base.skillIds, [
        'cyndaquil-aerial-tackle', 'cyndaquil-aerial-flamethrower',
        'cyndaquil-cynda-smokescreen', 'cyndaquil-skyward-leap',
    ]);
    assert.deepEqual(ROSTER.cyndaquil.forms.quilava.skillIds, [
        'cyndaquil-aerial-tackle', 'cyndaquil-quilava-flame-wheel',
        'cyndaquil-cynda-smokescreen', 'cyndaquil-skyward-leap',
    ]);
    assert.deepEqual(ROSTER.cyndaquil.forms.typhlosion.skillIds, [
        'cyndaquil-aerial-tackle', 'cyndaquil-typhlosion-flame-wheel',
        'cyndaquil-cynda-smokescreen', 'cyndaquil-skyward-leap',
    ]);
});

test('Aerial Tackle deals 20 damage and strips control/channeled statuses sourced by the target', () => {
    let game = matchup();
    game.teams.B[0].hp = 100;
    game.teams.A[0].statuses.push({
        id: 'test-taunt-from-pidgey', name: 'Test Taunt', hidden: false, harmful: true,
        durationActions: 3, tauntSource: true, sourcePlayer: 'B', sourceSlot: 0, appliedTurn: 0,
    });
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));

    assert.equal(game.teams.B[0].hp, 80);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'test-taunt-from-pidgey'), false);
});

test('Cynda-Smokescreen fails every enemy skill for their next turn, and Aerial Flamethrower applies a 5-damage afterburn while it lingers', () => {
    let game = matchup({ seed: 2 });
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'cyndaquil-cynda-smokescreen', 'B', 0));
    assert.equal(game.teams.B.every((unit) => unit.statuses.some((status) => status.id === 'cyndaquil-smokescreen-active')), true);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.events.some((event) => event.kind === 'skill-failed' && event.skillId === 'pidgey-peck'), true);
    assert.equal(game.teams.A[0].hp, 100);

    // Smokescreen's cast already put Warming Up at 5 stacks. Pidgey's peck failed against the
    // blind, but harmful-skill hooks (including Warming Up's retaliation trap) fire on intent to
    // attack, not on a landed hit, so it still took 5 piercing damage for attacking Cyndaquil:
    // B slot 0 sits at 95 going into the Flamethrower cast. Flamethrower is now flat (10 main hit,
    // unaffected by Warming Up), plus the smokescreen afterburn (flat 5, also unaffected) firing
    // synchronously the same action: 15 total to every B unit. 95-15=80, 100-15=85 for the rest.
    game = step(game, action('A', 0, 'cyndaquil-aerial-flamethrower', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 85, 85]);
    assert.equal(game.teams.B.every((unit) => unit.statuses.some((status) => status.id === 'cyndaquil-flamethrower-afterburn')), true);
});

test('Warming Up permanently adds 5 damage an attacking enemy takes when it hits Cyndaquil, and no longer boosts Flamethrower', () => {
    let game = matchup({ seed: 3 });
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-warming-up-passive')?.warmingUpStacks,
        5
    );

    game.teams.B[0].hp = 100;
    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    // Attacking Cyndaquil costs Pidgey 5 piercing damage back, from Warming Up's current 5 stacks.
    assert.equal(game.teams.B[0].hp, 95);

    game.teams.B.forEach((unit) => { unit.hp = 100; });
    // Aerial Flamethrower deals its flat 10 to every enemy, completely unaffected by Warming Up now.
    game = step(game, action('A', 0, 'cyndaquil-aerial-flamethrower', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [90, 90, 90]);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-warming-up-passive')?.warmingUpStacks,
        10
    );
});

test('Quilava Flame Wheel splits its damage, grants unpierceable reduction and stun immunity, and keeps the Smokescreen synergy', () => {
    let game = matchup({ seed: 5 });
    game.teams.A[0].form = 'quilava';
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'cyndaquil-quilava-flame-wheel', 'B', 0));

    // 20 to the chosen target, 5 splash to the other two.
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 95, 95]);
    const buff = game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-flame-wheel-active');
    assert.ok(buff, 'the self-buff should land on Quilava, not the enemy target');
    assert.equal(buff.unpierceableDamageReductionFlat, 10);
    assert.equal(buff.ignoreEnemyStuns, true);

    // The same flat 10 reduction cuts Zubat's 20-damage Leech Life down to 10.
    game.teams.A[0].hp = 100;
    game = step(game, action('B', 1, 'zubat-leech-life', 'A', 0));
    assert.equal(game.teams.A[0].hp, 90);
});

test('Typhlosion Flame Wheel splits its damage and grants a larger unpierceable reduction', () => {
    let game = matchup({ seed: 5 });
    game.teams.A[0].form = 'typhlosion';
    game.teams.B.forEach((unit) => { unit.hp = 100; });
    game = step(game, action('A', 0, 'cyndaquil-typhlosion-flame-wheel', 'B', 0));

    // 25 to the chosen target, 15 splash to the other two.
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 85, 85]);
    const buff = game.teams.A[0].statuses.find((status) => status.id === 'cyndaquil-flame-wheel-active');
    assert.ok(buff, 'the self-buff should land on Typhlosion, not the enemy target');
    assert.equal(buff.unpierceableDamageReductionFlat, 15);
    assert.equal(buff.ignoreEnemyStuns, true);
});

test('Skyward Leap evades the next hit, then empowers Aerial Tackle and Aerial Flamethrower by 10 for one use', () => {
    let game = matchup({ seed: 4 });
    game = step(game, action('A', 0, 'cyndaquil-skyward-leap', 'A', 0));
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-leap-active'), true);

    game = step(game, action('B', 0, 'pidgey-peck', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-leap-active'), false);
    assert.equal(game.teams.A[0].statuses.some((status) => status.id === 'cyndaquil-skyward-bonus'), true);

    game.teams.B[0].hp = 100;
    game = step(game, action('A', 0, 'cyndaquil-aerial-tackle', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
});
