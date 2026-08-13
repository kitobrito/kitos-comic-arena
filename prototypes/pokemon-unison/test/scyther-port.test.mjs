import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
    resolveQueuedTurn,
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

const scytherTeams = {
    A: ['scyther', 'charmander', 'squirtle'],
    B: ['chansey', 'zubat', 'pidgey'],
};

test('Scyther exposes its four current skills and current override values', () => {
    const scyther = ROSTER.scyther;
    assert.equal(scyther.skills.length, 4);
    assert.deepEqual(scyther.types, ['Bug', 'Flying']);
    assert.deepEqual(scyther.forms.base.skillIds, [
        'scyther-fury-cutter',
        'scyther-swords-dance',
        'scyther-x-cutter',
        'scyther-double-team',
    ]);
    assert.deepEqual(scyther.skills.find((skill) => skill.id === 'scyther-fury-cutter').energy, [Energy.TAIJUTSU]);
    assert.deepEqual(scyther.skills.find((skill) => skill.id === 'scyther-x-cutter').energy, [Energy.TAIJUTSU, Energy.TAIJUTSU]);
    assert.equal(scyther.skills.find((skill) => skill.id === 'scyther-double-team').cooldown, 5);
    assert.equal(
        scyther.skills.find((skill) => skill.id === 'scyther-fury-cutter')
            .effects.find((effect) => effect.requiresActorStatus)?.actorCounterOnDamage.delta,
        2
    );
});

test('Fury Cutter gains one permanent stack per successful hit and scales future hits', () => {
    let game = createGame({ seed: 701, teams: scytherTeams });
    game = enact(game, action('A', 0, 'scyther-fury-cutter', 'B', 0));
    assert.equal(game.teams.B[0].hp, 85);
    assert.equal(game.teams.A[0].counters['fury-cutter'], 1);

    ready(game, 'A');
    delete game.teams.A[0].cooldowns['scyther-fury-cutter'];
    game = enact(game, action('A', 0, 'scyther-fury-cutter', 'B', 0));
    assert.equal(game.teams.B[0].hp, 65);
    assert.equal(game.teams.A[0].counters['fury-cutter'], 2);
});

test('Swords Dance refreshes for three source turns and makes Fury Cutter piercing', () => {
    let game = createGame({ seed: 719, teams: scytherTeams });
    game = enact(game, action('A', 0, 'scyther-swords-dance', 'A', 0));
    game.teams.B[0].shield = 40;
    game.teams.B[0].statuses.push({
        id: 'test-reduction', name: 'Reduction', harmful: false,
        durationActions: null, damageReductionPercent: 90,
    });

    game = pass(game);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'scyther-swords-dance-active')?.durationActions,
        3
    );
    game = enact(game, action('A', 0, 'scyther-fury-cutter', 'B', 0));
    assert.equal(game.teams.B[0].shield, 15);
    assert.equal(game.teams.B[0].hp, 100);
    assert.equal(game.teams.A[0].counters['fury-cutter'], 2);
});

test('X-Cutter resolves its low-HP and Swords Dance critical layers deterministically', () => {
    let game = createGame({ seed: 0, teams: scytherTeams });
    game.teams.A[0].hp = 40;
    game.teams.B[0].hp = 50;
    game.teams.B[0].statuses.push({
        id: 'test-minimum-hp', name: 'Minimum HP', harmful: false,
        durationActions: null, minimumHp: 1,
    });
    game = enact(game, action('A', 0, 'scyther-swords-dance', 'A', 0));
    ready(game, 'A');
    game = enact(game, action('A', 0, 'scyther-x-cutter', 'B', 0));

    const xCutterDamage = game.events
        .filter((event) => event.kind === 'damage' && event.message.includes("X-Cutter"))
        .reduce((total, event) => total + event.amount, 0);
    assert.equal(xCutterDamage, 150);
    assert.equal(game.teams.B[0].hp, 1);
});

test('Double Team guarantees evasion and refreshes when Scyther defeats an enemy', () => {
    let game = createGame({ seed: 743, teams: scytherTeams });
    game = enact(game, action('A', 0, 'scyther-double-team', 'A', 0));
    game = enact(game, action('B', 0, 'chansey-eggbomb', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);

    game.teams.B[0].hp = 10;
    ready(game, 'A');
    game = enact(game, action('A', 0, 'scyther-fury-cutter', 'B', 0));
    assert.equal(game.teams.B[0].alive, false);
    assert.equal(
        game.teams.A[0].statuses.find((status) => status.id === 'scyther-double-team-active')?.durationActions,
        2,
        'the kill added 1 turn, exactly offsetting the natural end-of-turn decrement'
    );

    game = enact(game, action('B', 1, 'zubat-leech-life', 'A', 0));
    assert.equal(game.teams.A[0].hp, 100);
});

test('Scyther actions and layered chance results replay deterministically', () => {
    let game = createGame({ seed: 0, teams: scytherTeams });
    game = enact(game, action('A', 0, 'scyther-swords-dance', 'A', 0));
    game = pass(game);
    game = enact(game, action('A', 0, 'scyther-x-cutter', 'B', 0));

    const replayed = replay(exportReplay(game));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, game);
});
