import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createGame, typeEffectiveness, validateAction } from '../reference/engine.mjs';
import { ROSTER, unitPresentation } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function matchup({ seed = 0x5eed1234 } = {}) {
    return createGame({
        seed,
        teams: {
            A: ['butterfree', 'pidgey', 'chansey'],
            B: ['zubat', 'pikachu', 'squirtle'],
        },
    });
}

test('Butterfree and both Pidgey forms expose their complete production skill slots', () => {
    assert.equal(ROSTER.butterfree.forms.base.skillIds.length, 4);
    assert.equal(ROSTER.butterfree.skills.length, 5);
    assert.equal(ROSTER.pidgey.forms.base.skillIds.length, 4);
    assert.equal(ROSTER.pidgey.forms.pidgeotto.skillIds.length, 4);
    assert.equal(ROSTER.pidgey.skills.length, 8);
});

test('the standalone type engine uses production double resistance and capped dual-type scoring', () => {
    assert.equal(typeEffectiveness('Electric', ['Ground']).modifier, -10);
    assert.equal(typeEffectiveness('Ground', ['Flying']).modifier, -10);
    assert.equal(typeEffectiveness('Psychic', ['Dark']).modifier, -10);
    assert.equal(typeEffectiveness('Flying', ['Bug', 'Flying']).modifier, 5);
});

test('type effectiveness adjusts only the first damage entry for each target in a cast', () => {
    let game = matchup();
    game.teams.B[1].statuses.push({
        id: 'pidgey-sand-attack', name: 'Sand-Attack', harmful: true,
        durationActions: 3, sourcePlayer: 'A', sourceSlot: 1, appliedTurn: 0,
    });
    game = enact(game, action('A', 1, 'pidgey-gust', 'B', 1));

    assert.equal(game.teams.B[1].hp, 80);
    const targetDamage = game.events.filter(
        (event) => event.kind === 'damage' && event.targetSlot === 1 && event.message.startsWith("Pidgey's Gust")
    );
    assert.deepEqual(targetDamage.map((event) => event.effectiveness), [-5, 0]);
});

test('Confusion discounts and empowers Psybeam on Butterfree’s next turn', () => {
    let game = matchup({ seed: 42 });
    game = enact(game, action('A', 0, 'butterfree-confusion', 'B', 2));
    game = enact(game, action('B', 0, 'zubat-draining-fangs', 'B', 0));
    game.energy.A = { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 };

    const psybeam = action('A', 0, 'butterfree-psybeam', 'B', 2);
    assert.equal(validateAction(game, psybeam), null);
    game = enact(game, psybeam);
    assert.equal(game.teams.B[2].hp, 45);
});

test('Confusion can reflect the target’s next harmful skill back onto its user', () => {
    let game = matchup({ seed: 0 });
    game = enact(game, action('A', 0, 'butterfree-confusion', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    game = enact(game, action('B', 0, 'zubat-bite', 'A', 0));

    assert.equal(game.teams.A[0].hp, 100);
    assert.equal(game.teams.B[0].hp, 50);
    assert.equal(game.events.some((event) => event.kind === 'reflected'), true);
});

test('Stun Spore damages at source turn end, freezes cooldowns, and swaps to Sleep Powder', () => {
    let game = matchup();
    game.teams.B[0].cooldowns['zubat-leech-life'] = 2;
    game = enact(game, action('A', 0, 'butterfree-stun-spore', 'B', 0));

    assert.equal(game.teams.B[0].hp, 90);
    assert.equal(game.teams.B[0].cooldowns['zubat-leech-life'], 2);
    assert.equal(unitPresentation(game.teams.A[0]).skillIds.includes('butterfree-sleep-powder'), true);
    assert.equal(unitPresentation(game.teams.A[0]).skillIds.includes('butterfree-stun-spore'), false);
});

test('Sleep Powder blocks all skills, wakes on new damage, and swaps back to Stun Spore', () => {
    let game = matchup();
    game = enact(game, action('A', 0, 'butterfree-stun-spore', 'B', 0));
    game = enact(game, action('B', 0, 'zubat-draining-fangs', 'B', 0));
    game = enact(game, action('A', 0, 'butterfree-sleep-powder', 'B', 1));

    const thundershock = action('B', 1, 'pikachu-thundershock', 'A', 0);
    assert.equal(validateAction(game, thundershock), 'This Pokémon cannot use skills.');
    assert.equal(unitPresentation(game.teams.A[0]).skillIds.includes('butterfree-stun-spore'), true);

    game = enact(game, action('B', 0, 'zubat-bite', 'A', 1));
    game = enact(game, action('A', 1, 'pidgey-peck', 'B', 1));
    assert.equal(game.teams.B[1].statuses.some((status) => status.id === 'butterfree-sleep-powder-stun'), false);
    assert.notEqual(validateAction(game, thundershock), 'This Pokémon cannot use skills.');
});

test('Whirlwind blocks incoming Physical and Special skills for the allied team', () => {
    let game = matchup();
    game = enact(game, action('A', 0, 'butterfree-whirlwind', 'A', 0));
    game = enact(game, action('B', 0, 'zubat-bite', 'A', 1));

    assert.equal(game.teams.A[1].hp, 100);
    assert.equal(game.events.some((event) => event.kind === 'blocked'), true);
});

test('Pidgey evolves from effectiveness-adjusted damage dealt and activates all Pidgeotto skills', () => {
    let game = matchup();
    game.teams.A[1].hp = 50;
    game.teams.A[1].counters.evolution = 30;
    game = enact(game, action('A', 1, 'pidgey-gust', 'B', 0));

    const pidgey = game.teams.A[1];
    assert.equal(pidgey.form, 'pidgeotto');
    assert.equal(pidgey.counters.evolution, 50);
    assert.equal(pidgey.hp, 50);
    assert.deepEqual(unitPresentation(pidgey).skillIds, [
        'pidgeotto-gust',
        'pidgeotto-whirlwind',
        'pidgeotto-peck',
        'pidgeotto-sand-attack',
    ]);
});

test('Sand-Attack deterministically redirects harmful skills to any living Pokémon', () => {
    let game = matchup();
    game = enact(game, action('A', 1, 'pidgey-sand-attack', 'B', 0));
    game = enact(game, action('B', 0, 'zubat-bite', 'A', 1));

    assert.equal(game.teams.A[1].hp, 100);
    assert.equal(game.teams.A[2].hp, 80);
    assert.equal(game.events.some((event) => event.kind === 'blind-target' && event.targetSlot === 2), true);
});

test('Pidgey Whirlwind evasion uses the seeded authoritative roll', () => {
    let game = matchup({ seed: 0 });
    game = enact(game, action('A', 1, 'pidgey-whirlwind', 'A', 1));
    game = enact(game, action('B', 0, 'zubat-bite', 'A', 1));

    assert.equal(game.teams.A[1].hp, 100);
    assert.equal(game.events.some((event) => event.kind === 'evade'), true);
});
