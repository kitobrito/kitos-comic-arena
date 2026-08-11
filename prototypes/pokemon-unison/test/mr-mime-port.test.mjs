import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
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

function matchup({
    teamA = ['mr-mime', 'chansey', 'squirtle'],
    teamB = ['charmander', 'zubat', 'pikachu'],
    seed = 0x4d494d45,
} = {}) {
    return createGame({ seed, teams: { A: teamA, B: teamB } });
}

test('Mr. Mime exposes the four production skills, costs, cooldowns, and artwork', () => {
    const mime = ROSTER['mr-mime'];

    assert.deepEqual(mime.types, ['Psychic', 'Fairy']);
    assert.deepEqual(mime.forms.base.skillIds, [
        'mr-mime-dazzling-gleam',
        'mr-mime-forcefield',
        'mr-mime-light-screen',
        'mr-mime-safeguard',
    ]);
    assert.deepEqual(
        mime.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.NINJUTSU, Energy.RANDOM], cooldown: 0 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 3 },
            { energy: [Energy.NINJUTSU], cooldown: 5 },
        ]
    );
    mime.skills.forEach((skill) => assert.match(skill.image, /Mr\.mime/i));
});

test('Dazzling Gleam damages the enemy team and stacks the next screen bonus', () => {
    let game = matchup();
    game = enact(game, action('A', 0, 'mr-mime-dazzling-gleam', 'B', 0));

    assert.equal(game.teams.B[0].hp, 75);
    assert.equal(game.teams.B[1].hp, 95);
    assert.equal(game.teams.B[2].hp, 90);
    assert.equal(game.teams.A[0].counters['screen-charge'], 1);
});

test('Forcefield spends stacked charge, grants tracked Barrier, and discounts Light Screen', () => {
    let game = matchup();
    game = enact(game, action('A', 0, 'mr-mime-dazzling-gleam', 'B', 0));
    game = enact(game, action('B', 0, 'charmander-ember', 'A', 0));
    game = enact(game, action('A', 0, 'mr-mime-dazzling-gleam', 'B', 0));
    game = enact(game, action('B', 0, 'charmander-scratch', 'A', 0));
    game = enact(game, action('A', 0, 'mr-mime-forcefield', 'B', 0));

    assert.deepEqual(game.teams.B.map((unit) => unit.barrier), [30, 30, 30]);
    assert.deepEqual(game.teams.B.map((unit) => unit.barrierCapacity), [30, 30, 30]);
    assert.equal(game.teams.A[0].counters['screen-charge'], 0);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'mr-mime-light-screen-discount'),
        true
    );

    game.currentPlayer = 'A';
    game.energy.A = { taijutsu: 1, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    assert.equal(
        validateAction(game, action('A', 0, 'mr-mime-light-screen', 'A', 0)),
        null
    );
});

test('Barrier absorbs outgoing ordinary damage but affliction damage bypasses it', () => {
    let ordinary = matchup();
    ordinary = enact(ordinary, action('A', 0, 'mr-mime-forcefield', 'B', 0));
    ordinary = enact(ordinary, action('B', 1, 'zubat-bite', 'A', 0));

    assert.equal(ordinary.teams.A[0].hp, 95);
    assert.equal(ordinary.teams.B[1].barrier, 0);
    assert.equal(ordinary.teams.B[1].barrierCapacity, 20);

    let affliction = matchup();
    affliction = enact(affliction, action('A', 0, 'mr-mime-forcefield', 'B', 0));
    affliction = enact(affliction, action('B', 0, 'charmander-ember', 'A', 0));

    assert.equal(affliction.teams.A[0].hp, 75);
    assert.equal(affliction.teams.B[0].barrier, 20);
});

test('Safeguard strengthens Light Screen, extends both screens, and improves healing', () => {
    let game = matchup();
    game.teams.A.forEach((unit) => { unit.hp = 50; });

    game = enact(game, action('A', 0, 'mr-mime-safeguard', 'A', 0));
    game = enact(game, action('B', 0, 'charmander-scratch', 'A', 1));
    game = enact(game, action('A', 0, 'mr-mime-dazzling-gleam', 'B', 0));
    game = enact(game, action('B', 1, 'zubat-bite', 'A', 1));
    game = enact(game, action('A', 0, 'mr-mime-light-screen', 'A', 0));

    assert.deepEqual(game.teams.A.map((unit) => unit.shield), [30, 30, 30]);
    assert.deepEqual(game.teams.A.map((unit) => unit.shieldCapacity), [30, 30, 30]);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'mr-mime-light-screen')
            ?.durationActions,
        2
    );

    game = enact(game, action('B', 0, 'charmander-scratch', 'A', 2));
    game = enact(game, action('A', 1, 'chansey-softboil', 'A', 2));
    assert.equal(game.teams.A[2].hp, 71.25);
});

test('Safeguard removes one turn from incoming stun effects', () => {
    let game = matchup({
        teamB: ['krabby', 'charmander', 'pikachu'],
    });

    game = enact(game, action('A', 0, 'mr-mime-safeguard', 'A', 0));
    game = enact(game, action('B', 0, 'krabby-crabhammer', 'A', 0));

    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'krabby-crabhammer-stun'),
        false
    );
    assert.equal(game.events.some((event) => event.kind === 'reduced-status'), true);
});

test('Mr. Mime screens and Barrier consumption replay deterministically', () => {
    let game = matchup({ seed: 7341 });
    game = enact(game, action('A', 0, 'mr-mime-dazzling-gleam', 'B', 0));
    game = enact(game, action('B', 0, 'charmander-ember', 'A', 0));
    game = enact(game, action('A', 0, 'mr-mime-forcefield', 'B', 0));
    game = enact(game, action('B', 1, 'zubat-bite', 'A', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
