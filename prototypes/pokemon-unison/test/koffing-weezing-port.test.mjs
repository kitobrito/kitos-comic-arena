import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
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

function ready(state, player = 'A') {
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

const koffingTeams = {
    A: ['koffing', 'charmander', 'squirtle'],
    B: ['pidgey', 'zubat', 'chansey'],
};

test('Koffing and Weezing expose four complete active slots with current override costs', () => {
    const koffing = ROSTER.koffing;
    assert.equal(koffing.skills.length, 8);
    assert.deepEqual(koffing.forms.base.skillIds, [
        'koffing-smog',
        'koffing-haze',
        'koffing-self-destruct',
        'koffing-smokescreen',
    ]);
    assert.deepEqual(koffing.forms.weezing.skillIds, [
        'koffing-weezing-smog',
        'koffing-weezing-haze',
        'koffing-weezing-self-destruct',
        'koffing-weezing-smokescreen',
    ]);
    assert.deepEqual(
        koffing.skills.find((skill) => skill.id === 'koffing-smokescreen').energy,
        [Energy.RANDOM]
    );
    assert.deepEqual(
        koffing.skills.find((skill) => skill.id === 'koffing-weezing-smokescreen').energy,
        [Energy.RANDOM, Energy.RANDOM]
    );
});

test('Smog deals an immediate packet, stacks later source-turn packets, and replays deterministically', () => {
    let game = createGame({ seed: 0, teams: koffingTeams });
    game = enact(game, action('A', 0, 'koffing-smog', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [95, 95, 95]);
    assert.equal(
        game.teams.B.every((unit) =>
            unit.statuses.some((status) => status.id === 'koffing-poison-gas-harmful-blind')
        ),
        true
    );

    game = pass(game);
    game = enact(game, action('A', 0, 'koffing-smog', 'B', 0));
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [85, 85, 85]);
    game = pass(game);
    game = pass(game);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 75, 75]);

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});

test('Poison Gas is owner-only and its six random outcomes expose the production controls', () => {
    let game = createGame({ seed: 0, teams: koffingTeams });
    game = enact(game, action('A', 1, 'charmander-ember', 'B', 0));
    assert.equal(
        game.teams.B[0].statuses.some((status) => status.id.startsWith('koffing-poison-gas-')),
        false
    );

    const hook = ROSTER.koffing.startStatuses[0].onSuccessfulEnemyDamageRandomStatus;
    assert.equal(hook.chancePercent, 30);
    assert.equal(hook.statusOptions.length, 6);
    assert.equal(hook.statusOptions.some((status) => status.harmfulBlindToSourceTeam), true);
    assert.equal(hook.statusOptions.some((status) => status.paralyzeCooldowns), true);
    assert.equal(hook.statusOptions.some((status) => status.cannotUseHelpfulSkills), true);
    assert.equal(hook.statusOptions.some((status) => status.cannotUseSkills), true);
    assert.equal(hook.statusOptions.some((status) => status.silenceNonDamageEffects), true);
    assert.equal(hook.statusOptions.some((status) => status.damageReductionPercent === 50), true);

    game = createGame({ seed: 1, teams: koffingTeams, startingPlayer: 'B' });
    game.teams.B[2].statuses.push({
        id: 'test-helpful-lock',
        name: 'Helpful Lock',
        harmful: true,
        durationActions: 1,
        cannotUseHelpfulSkills: true,
    });
    assert.equal(
        validateAction(game, action('B', 2, 'chansey-softboil', 'B', 1)),
        'This Pokémon cannot use helpful skills.'
    );
});

test('using each unique Koffing skill once evolves into Weezing and transfers slot cooldowns', () => {
    let game = createGame({ seed: 7, teams: koffingTeams });
    const actions = [
        action('A', 0, 'koffing-smog', 'B', 0),
        action('A', 0, 'koffing-haze', 'A', 0),
        action('A', 0, 'koffing-self-destruct', 'B', 0),
        action('A', 0, 'koffing-smokescreen', 'A', 0),
    ];
    actions.forEach((nextAction) => {
        ready(game);
        game = enact(game, nextAction);
    });

    const koffing = game.teams.A[0];
    assert.equal(koffing.form, 'weezing');
    assert.equal(koffing.hp, 90);
    assert.equal(koffing.counters.evolution, 4);
    assert.equal(koffing.statuses.some((status) => status.id === 'koffing-poison-gas-passive'), false);
    assert.equal(koffing.statuses.some((status) => status.id === 'weezing-poison-gas-passive'), true);
    assert.equal(
        koffing.statuses.find((status) => status.id === 'weezing-poison-gas-passive')
            .onSuccessfulEnemyDamageRandomStatus.chancePercent,
        60
    );
    assert.equal(koffing.cooldowns['koffing-weezing-self-destruct'], 5);
    assert.equal(koffing.cooldowns['koffing-weezing-smokescreen'], undefined);
    assert.equal(koffing.cooldowns['koffing-smokescreen'], 5);
    assert.equal(koffing.cooldowns['koffing-self-destruct'], undefined);
    assert.equal(unitPresentation(koffing).name, 'Weezing');
});

test('Haze cleanses enemy statuses and blocks new non-damage effects without blocking damage', () => {
    const teams = {
        A: ['koffing', 'charmander', 'squirtle'],
        B: ['butterfree', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 0, teams });
    game.teams.A[1].statuses.push({
        id: 'test-enemy-status',
        name: 'Enemy Status',
        harmful: true,
        durationActions: 3,
        sourcePlayer: 'B',
        sourceSlot: 0,
    });
    game = enact(game, action('A', 0, 'koffing-haze', 'A', 0));
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'test-enemy-status'), false);

    game = enact(game, action('B', 0, 'butterfree-confusion', 'A', 1));
    assert.equal(game.teams.A[1].hp, 75);
    assert.equal(
        game.teams.A[1].statuses.some((status) => status.id === 'butterfree-confusion-reflect'),
        false
    );
});

test('Self-Destruct death triggers the fixed five-damage enemy-team aftershock', () => {
    let game = createGame({ seed: 19, teams: koffingTeams });
    game.teams.A[0].hp = 20;
    game = enact(game, action('A', 0, 'koffing-self-destruct', 'B', 0));

    assert.equal(game.teams.A[0].alive, false);
    assert.equal(game.teams.A[0].hp, 0);
    assert.deepEqual(game.teams.B.map((unit) => unit.hp), [75, 75, 75]);
    assert.equal(
        game.events.some((event) =>
            event.kind === 'damage' && event.message.includes('Self-Destruct Aftershock')
        ),
        true
    );
});

test('Rare Candy immediately evolves Koffing and installs Weezing Poison Gas', () => {
    const teams = {
        A: ['pokemon-trainer', 'koffing', 'squirtle'],
        B: ['pidgey', 'zubat', 'chansey'],
    };
    let game = createGame({ seed: 0, teams });
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(game.teams.A[1].form, 'weezing');
    assert.equal(game.teams.A[1].shield, 25);
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'weezing-poison-gas-passive'), true);
});
