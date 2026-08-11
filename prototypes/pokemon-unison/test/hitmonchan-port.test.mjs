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
import { Energy, ROSTER } from '../reference/roster.mjs';

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

function matchup({
    teamA = ['hitmonchan', 'squirtle', 'bulbasaur'],
    teamB = ['chansey', 'pidgey', 'eevee'],
    seed = 0x4849544d,
} = {}) {
    return createGame({ seed, teams: { A: teamA, B: teamB } });
}

test('Hitmonchan exposes the production types, four skills, costs, cooldowns, classes, and artwork', () => {
    const hitmonchan = ROSTER.hitmonchan;

    assert.deepEqual(hitmonchan.types, ['Fighting']);
    assert.deepEqual(hitmonchan.forms.base.skillIds, [
        'hitmonchan-thunder-punch',
        'hitmonchan-fire-punch',
        'hitmonchan-ice-punch',
        'hitmonchan-mega-punch',
    ]);
    assert.deepEqual(
        hitmonchan.skills.map(({ energy, cooldown, classes }) => ({ energy, cooldown, classes })),
        [
            { energy: [Energy.GENJUTSU], cooldown: 2, classes: ['Electric', 'Physical', 'Instant'] },
            { energy: [Energy.BLOODLINE], cooldown: 2, classes: ['Fire', 'Physical', 'Instant'] },
            { energy: [Energy.NINJUTSU], cooldown: 2, classes: ['Ice', 'Physical', 'Instant'] },
            { energy: [Energy.RANDOM], cooldown: 0, classes: ['Normal', 'Physical', 'Instant'] },
        ]
    );
    hitmonchan.skills.forEach((skill) => assert.match(skill.image, /hitmonchan/i));
});

test('Thunder Punch pierces reduction, damages the other enemies, and freezes target cooldown recovery', () => {
    let game = matchup();
    game.teams.B[0].shield = 10;
    game.teams.B[0].shieldCapacity = 10;
    game.teams.B[0].cooldowns['chansey-eggbomb'] = 2;
    game.teams.B[0].statuses.push({
        id: 'test-reduction', name: 'Test Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionPercent: 50,
    });

    game = enact(game, action('A', 0, 'hitmonchan-thunder-punch', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 90, 95]);
    assert.equal(game.teams.B[0].shield, 0);
    assert.equal(game.teams.B[0].cooldowns['chansey-eggbomb'], 2);
    assert.equal(game.teams.B[0].statuses.some((status) => status.paralyzeCooldowns), true);

    game = pass(game);
    game = pass(game);
    assert.equal(game.teams.B[0].cooldowns['chansey-eggbomb'], 1);
});

test('Fire Punch bypasses defense and deals exactly two target-turn affliction ticks', () => {
    let game = matchup();
    game.teams.B[0].shield = 10;
    game.teams.B[0].shieldCapacity = 10;
    game.teams.B[0].statuses.push({
        id: 'test-reduction', name: 'Test Reduction', hidden: false, harmful: false,
        durationActions: null, damageReductionPercent: 50,
    });

    game = enact(game, action('A', 0, 'hitmonchan-fire-punch', 'B', 0));
    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.B[0].shield, 10);

    game = pass(game);
    assert.equal(game.teams.B[0].hp, 70);
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 70);
    game = pass(game);
    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'hitmonchan-fire-punch-burn'),
        false
    );
});

test('Ice Punch blocks only Physical skills and adds two cooldowns to a usable Special skill', () => {
    let game = matchup({ teamB: ['eevee', 'chansey', 'pidgey'] });
    game = enact(game, action('A', 0, 'hitmonchan-ice-punch', 'B', 0));

    const dig = action('B', 0, 'eevee-dig', 'A', 0);
    const swift = action('B', 0, 'eevee-swift', 'A', 0);
    assert.match(validateAction(game, dig), /Physical skills are stunned/i);
    assert.equal(validateAction(game, swift), null);
    assert.equal(
        legalActions(game).some((candidate) => candidate.actorSlot === 0 && candidate.skillId === 'eevee-dig'),
        false
    );
    assert.equal(
        legalActions(game).some((candidate) => candidate.actorSlot === 0 && candidate.skillId === 'eevee-swift'),
        true
    );

    game = enact(game, swift);
    assert.equal(game.teams.B[0].cooldowns['eevee-swift'], 4);
});

test('Safeguard removes Ice Punch Physical stun without removing its separate cooldown penalty', () => {
    let game = matchup({
        teamA: ['mr-mime', 'chansey', 'squirtle'],
        teamB: ['hitmonchan', 'eevee', 'pidgey'],
    });

    game = enact(game, action('A', 0, 'mr-mime-safeguard', 'A', 0));
    game = enact(game, action('B', 0, 'hitmonchan-ice-punch', 'A', 0));

    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'hitmonchan-ice-punch-stun'),
        false
    );
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'hitmonchan-ice-punch-cooldown-increase'),
        true
    );
    assert.equal(game.events.some((event) => event.kind === 'reduced-status'), true);
});

test('elemental punches stack Mega Punch to 45 damage and Mega Punch consumes the full bonus', () => {
    let game = matchup({ teamB: ['chansey', 'mr-mime', 'pidgey'] });

    game = enact(game, action('A', 0, 'hitmonchan-thunder-punch', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonchan-fire-punch', 'B', 1));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonchan-ice-punch', 'B', 2));
    game = pass(game);

    const bonus = game.teams.A[0].statuses.find(
        (status) => status.id === 'hitmonchan-mega-punch-bonus'
    );
    assert.equal(bonus?.storedDamageBonus, 30);
    assert.equal(bonus?.sourceSkillId, 'hitmonchan-mega-punch');

    game = enact(game, action('A', 0, 'hitmonchan-mega-punch', 'B', 0));
    assert.equal(game.teams.B[0].hp, 30);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'hitmonchan-mega-punch-bonus'),
        false
    );

    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonchan-mega-punch', 'B', 0));
    assert.equal(game.teams.B[0].hp, 15);
});

test('Hitmonchan status stacking, turn damage, and bonus consumption replay deterministically', () => {
    let game = matchup({ seed: 8237 });
    game = enact(game, action('A', 0, 'hitmonchan-thunder-punch', 'B', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonchan-fire-punch', 'B', 1));
    game = pass(game);
    game = enact(game, action('A', 0, 'hitmonchan-mega-punch', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
