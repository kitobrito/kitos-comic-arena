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

test('the Eevee family exposes four complete current skill slots per character', () => {
    const expectations = {
        eevee: ['eevee-dig', 'eevee-swift', 'eevee-hidden-power', 'eevee-protect'],
        jolteon: ['jolteon-pin-missile', 'jolteon-thunderbolt', 'jolteon-thunder-fang', 'jolteon-charge'],
        flareon: ['flareon-heating-up', 'flareon-fire-spin', 'flareon-fire-blast', 'flareon-double-team'],
        vaporeon: ['vaporeon-aurora-beam', 'vaporeon-sand-attack', 'vaporeon-hydro-pump', 'vaporeon-acid-armor'],
    };
    for (const [speciesId, skillIds] of Object.entries(expectations)) {
        assert.deepEqual(ROSTER[speciesId].forms.base.skillIds, skillIds);
        assert.equal(ROSTER[speciesId].skills.length, 4);
    }
    assert.deepEqual(ROSTER.eevee.skills[2].energy, [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM]);
    assert.deepEqual(ROSTER.jolteon.skills[0].energy, [Energy.TAIJUTSU]);
    assert.deepEqual(ROSTER.flareon.skills[1].energy, [Energy.BLOODLINE, Energy.RANDOM]);
    assert.deepEqual(ROSTER.vaporeon.skills[2].energy, [Energy.TAIJUTSU, Energy.NINJUTSU]);
});

test('Eevee Dig and Protect preserve source-anchored invulnerability', () => {
    let game = createGame({
        seed: 811,
        teams: {
            A: ['eevee', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'eevee-dig', 'B', 0));
    assert.equal(game.teams.B[0].hp, 70);
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);

    ready(game, 'A');
    game = enact(game, action('A', 0, 'eevee-protect', 'A', 1));
    game = enact(game, action('B', 1, 'zubat-leech-life', 'A', 1));
    assert.equal(game.teams.A[1].hp, 100);
});

test('Hidden Power independently selects seeded random enemies for all three packets', () => {
    let game = createGame({
        seed: 1,
        teams: {
            A: ['eevee', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'eevee-hidden-power', 'B', 0));
    const packets = game.events
        .filter((event) => event.kind === 'damage' && event.message.includes('Hidden Power'))
        .map((event) => ({ amount: event.amount, targetSlot: event.targetSlot }));
    assert.deepEqual(packets, [
        { amount: 30, targetSlot: 0 },
        { amount: 20, targetSlot: 0 },
        { amount: 10, targetSlot: 1 },
    ]);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [50, 90, 100]);

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});

test('Swift applies one type-adjusted team packet to every living enemy', () => {
    let game = createGame({
        seed: 809,
        teams: {
            A: ['eevee', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'eevee-swift', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
});

test('Pin Missile applies team damage, delayed cooldown penalties, and targeting retaliation', () => {
    let game = createGame({
        seed: 823,
        teams: {
            A: ['jolteon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'jolteon-pin-missile', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 95, 90]);
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.B[0].hp, 70);
    assert.equal(game.teams.B[0].cooldowns['chansey-eggbomb'], 3);
});

test('Thunderbolt traps the first targeting enemy and Thunder Fang installs its permanent slow', () => {
    let game = createGame({
        seed: 827,
        teams: {
            A: ['jolteon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'jolteon-thunderbolt', 'B', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(
        game.teams.B[0].statuses.some((status) =>
            status.id === 'jolteon-thunderbolt-cooldown-paralysis' && status.durationActions === 2
        ),
        true
    );
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'jolteon-thunderbolt-paralyze-trap'),
        false
    );

    ready(game, 'A');
    game = enact(game, action('A', 0, 'jolteon-thunder-fang', 'B', 1));
    assert.equal(
        game.teams.B[1].statuses.some((status) => status.id === 'jolteon-thunder-fang-stun'),
        true
    );
    assert.equal(
        game.teams.B[1].statuses.some((status) =>
            status.id === 'jolteon-thunder-fang-cooldown-increase' && status.durationActions === null
        ),
        true
    );
});

test('Charge changes costs, adds packet damage, and reduces piercing or affliction damage by half', () => {
    let game = createGame({
        seed: 829,
        teams: {
            A: ['jolteon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'jolteon-charge', 'A', 0));
    ready(game, 'A');
    game.energy.A = {
        [Energy.TAIJUTSU]: 1,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 0,
        [Energy.GENJUTSU]: 0,
    };
    const chargedActions = legalActions(game, 'A').filter((entry) => entry.actorSlot === 0);
    assert.equal(chargedActions.some((entry) => entry.skillId === 'jolteon-thunderbolt'), true);
    assert.equal(chargedActions.some((entry) => entry.skillId === 'jolteon-thunder-fang'), true);

    game = enact(game, action('A', 0, 'jolteon-thunder-fang', 'B', 0));
    assert.equal(game.teams.B[0].hp, 60);
    ready(game, 'B');
    game = enact(game, action('B', 1, 'zubat-leech-life', 'A', 0));
    assert.equal(game.teams.A[0].hp, 87);
});

test('Heating Up adds tracked defense and its source-bound aura ends when Flareon is defeated', () => {
    let game = createGame({
        seed: 839,
        teams: {
            A: ['flareon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'flareon-heating-up', 'A', 0));
    assert.equal(game.teams.A[0].shield, 20);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'flareon-heating-up-defense')
            ?.trackedShieldPoints,
        20
    );
    assert.equal(
        game.teams.B.every((unit) =>
            unit.statuses.some((status) => status.id === 'flareon-heating-up-burn-aura')
        ),
        true
    );
    game = pass(game);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [95, 95, 95]);
    game.teams.A[0].hp = 20;
    ready(game, 'B');
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].alive, false);
    assert.equal(
        game.teams.B.some((unit) =>
            unit.statuses.some((status) => status.id === 'flareon-heating-up-burn-aura')
        ),
        false
    );
});

test('Fire Spin rejects duplicate casts, blocks ally aid, and ticks on target turns', () => {
    let game = createGame({
        seed: 853,
        teams: {
            A: ['flareon', 'charmander', 'squirtle'],
            B: ['eevee', 'chansey', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'flareon-fire-spin', 'B', 1));
    ready(game, 'A');
    delete game.teams.A[0].cooldowns['flareon-fire-spin'];
    assert.match(
        validateAction(game, action('A', 0, 'flareon-fire-spin', 'B', 1)),
        /already affected/
    );
    ready(game, 'B');
    assert.match(
        validateAction(game, action('B', 0, 'eevee-protect', 'B', 1)),
        /invulnerable to helpful/
    );
    game = pass(game);
    assert.equal(game.teams.B[1].hp, 85);
    assert.equal(
        game.teams.B[1].statuses.find((status) => status.id === 'flareon-fire-spin-burn')
            ?.durationActions,
        2
    );
});

test('Fire Blast keeps its selected and splash burns distinct', () => {
    let game = createGame({
        seed: 857,
        teams: {
            A: ['flareon', 'charmander', 'squirtle'],
            B: ['chansey', 'pidgey', 'eevee'],
        },
    });
    game = enact(game, action('A', 0, 'flareon-fire-blast', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [80, 100, 100]);
    game = pass(game);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [70, 95, 95]);
});

test('Flareon Double Team blocks the next enemy turn', () => {
    let game = createGame({
        seed: 858,
        teams: {
            A: ['flareon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game = enact(game, action('A', 0, 'flareon-double-team', 'A', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
});

test('Aurora Beam branches by relation and Sand-Attack discounts Hydro Pump', () => {
    let game = createGame({
        seed: 859,
        teams: {
            A: ['vaporeon', 'charmander', 'squirtle'],
            B: ['scyther', 'chansey', 'pidgey'],
        },
    });
    game.teams.A[1].hp = 50;
    game = enact(game, action('A', 0, 'vaporeon-aurora-beam', 'A', 1));
    assert.equal(game.teams.A[1].hp, 70);
    assert.equal(
        game.teams.A[1].statuses.find((status) => status.id === 'vaporeon-aurora-beam-empowered')
            ?.nonAfflictionDamageBonusFlat,
        5
    );

    ready(game, 'A');
    game = enact(game, action('A', 0, 'vaporeon-sand-attack', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id === 'vaporeon-sand-attack-blind'),
        true
    );
    ready(game, 'A');
    game.energy.A = {
        [Energy.TAIJUTSU]: 1,
        [Energy.NINJUTSU]: 0,
        [Energy.BLOODLINE]: 0,
        [Energy.GENJUTSU]: 0,
    };
    assert.equal(
        legalActions(game, 'A').some((entry) =>
            entry.actorSlot === 0 && entry.skillId === 'vaporeon-hydro-pump'
        ),
        true
    );

    delete game.teams.A[0].cooldowns['vaporeon-aurora-beam'];
    game = enact(game, action('A', 0, 'vaporeon-aurora-beam', 'B', 0));
    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(
        game.teams.B[0].statuses.find((status) => status.id === 'vaporeon-aurora-beam-weakened')
            ?.nonAfflictionDamageBonusFlat,
        -5
    );
    game = enact(game, action('B', 0, 'scyther-fury-cutter', 'A', 0));
    assert.equal(
        game.events.some((event) =>
            event.kind === 'blind-target' && event.skillId === 'scyther-fury-cutter'
        ),
        true
    );
});

test('Hydro Pump heals the team and Acid Armor heals before blocking a targeting skill', () => {
    let game = createGame({
        seed: 863,
        teams: {
            A: ['vaporeon', 'charmander', 'squirtle'],
            B: ['chansey', 'zubat', 'pidgey'],
        },
    });
    game.teams.A.forEach((unit) => { unit.hp = 50; });
    game = enact(game, action('A', 0, 'vaporeon-hydro-pump', 'B', 0));
    assert.deepEqual(game.teams.A.map((unit) => unit.hp), [65, 65, 65]);

    ready(game, 'A');
    game = enact(game, action('A', 0, 'vaporeon-acid-armor', 'A', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.deepEqual(game.teams.A.map((unit) => unit.hp), [70, 70, 70]);
});
