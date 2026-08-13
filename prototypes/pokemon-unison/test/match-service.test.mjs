import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    createMatchService,
    MatchServiceError,
    planDeterministicBotTurn,
} from '../reference/match-service.mjs';
import { createJsonMatchStorage } from '../reference/match-storage.mjs';

const withSuggestedPayment = (action) => ({
    ...action,
    ...(action?.randomEnergyRequired > 0
        ? { randomEnergy: [...(action.suggestedRandomEnergy ?? [])] }
        : {}),
});

test('standalone matches require an invite and private player tokens', () => {
    const service = createMatchService();
    const created = service.create({ seed: 42 });

    assert.equal(created.player, 'A');
    assert.equal(created.waitingForOpponent, true);
    assert.deepEqual(created.state.legalActions, []);
    assert.throws(
        () => service.join(created.matchId, 'wrong-code'),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_invite'
    );

    const joined = service.join(created.matchId, created.inviteCode);
    assert.equal(joined.player, 'B');
    assert.equal(joined.waitingForOpponent, false);
    assert.notEqual(joined.token, created.token);
    assert.throws(
        () => service.view(created.matchId, 'not-a-player-token'),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_token'
    );
});

test('the standalone service owns player identity, actions, revisions, and censored views', () => {
    const service = createMatchService();
    const created = service.create({ seed: 7 });
    const joined = service.join(created.matchId, created.inviteCode);
    const before = service.view(created.matchId, created.token);
    const legal = before.state.legalActions[0];

    assert.ok(legal);
    const after = service.act(created.matchId, created.token, {
        ...withSuggestedPayment(legal),
        player: 'B',
    });
    assert.equal(after.revision, 1);
    assert.equal(after.state.currentPlayer, 'B');
    assert.equal(after.state.viewer, 'A');

    const opponent = service.view(created.matchId, joined.token);
    assert.equal(opponent.state.viewer, 'B');
    assert.deepEqual(Object.keys(opponent.state.energy.A), ['total']);
    assert.deepEqual(Object.keys(after.state.energy.B), ['total']);
    assert.throws(
        () => service.act(created.matchId, created.token, legal),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_action'
    );
});

test('Random costs require and reserve the player selected energy types', () => {
    const service = createMatchService();
    const created = service.create({ seed: 7 });
    const joined = service.join(created.matchId, created.inviteCode);
    service.resolveTurn(created.matchId, created.token);
    service.resolveTurn(created.matchId, joined.token);
    const before = service.view(created.matchId, created.token);
    const action = before.state.legalActions.find((candidate) =>
        candidate.randomEnergyRequired === 1 && candidate.energyCosts.some((cost) => cost !== 'random')
    );

    assert.ok(action);
    assert.equal(action.randomEnergyRequired, 1);
    assert.deepEqual(before.state.availableEnergy, before.state.energy.A);
    assert.throws(
        () => service.queue(created.matchId, created.token, action),
        (error) => error instanceof MatchServiceError &&
            error.code === 'invalid_queued_action' &&
            /choose 1 energy/i.test(error.message)
    );

    const randomPayment = action.suggestedRandomEnergy[0];
    const fixedPayment = action.energyCosts.find((cost) => cost !== 'random');
    const queued = service.queue(created.matchId, created.token, {
        ...action,
        randomEnergy: [randomPayment],
    });
    assert.deepEqual(queued.pendingTurn.actions[0].randomEnergy, [randomPayment]);
    const expectedSpent = Object.fromEntries(Object.keys(before.state.energy.A).map((type) => [type, 0]));
    expectedSpent[fixedPayment] += 1;
    expectedSpent[randomPayment] += 1;
    Object.keys(expectedSpent).forEach((type) => {
        assert.equal(queued.state.availableEnergy[type], before.state.energy.A[type] - expectedSpent[type]);
    });
});

test('arena economy grants one opening energy, three to the second player, and one per survivor at turn end', () => {
    const service = createMatchService();
    const created = service.create({ seed: 2026 });
    const joined = service.join(created.matchId, created.inviteCode);
    const total = (pool) => Object.values(pool).reduce((sum, value) => sum + value, 0);

    assert.equal(total(service.view(created.matchId, created.token).state.energy.A), 1);
    assert.equal(total(service.view(created.matchId, joined.token).state.energy.B), 0);

    const afterA = service.resolveTurn(created.matchId, created.token);
    assert.equal(total(afterA.state.energy.A), 4);
    assert.equal(afterA.state.currentPlayer, 'B');
    assert.equal(total(service.view(created.matchId, joined.token).state.energy.B), 3);

    const afterB = service.resolveTurn(created.matchId, joined.token);
    assert.equal(afterB.state.currentPlayer, 'A');
    assert.equal(total(service.view(created.matchId, created.token).state.energy.A), 4);
    assert.equal(total(afterB.state.energy.B), 6);
});

test('replay export preserves a non-default starting player', () => {
    const service = createMatchService();
    const created = service.create({ seed: 99, startingPlayer: 'B' });
    service.join(created.matchId, created.inviteCode);

    assert.equal(service.replay(created.matchId, created.token).startingPlayer, 'B');
    assert.equal(service.replay(created.matchId, created.token).economyMode, 'arena');
});

test('surrender records the opponent win and clears the queued turn', () => {
    const service = createMatchService();
    const created = service.create({ seed: 99 });
    service.join(created.matchId, created.inviteCode);
    const action = service.view(created.matchId, created.token).state.legalActions[0];
    if (action) service.queue(created.matchId, created.token, withSuggestedPayment(action));

    const surrendered = service.surrender(created.matchId, created.token);
    assert.equal(surrendered.state.winner, 'B');
    assert.deepEqual(surrendered.pendingTurn.actions, []);
    assert.equal(surrendered.state.recentEvents.at(-1).kind, 'surrender');
});

test('solo matches use a deterministic server-owned opponent through the normal turn engine', () => {
    const service = createMatchService();
    const created = service.create({ seed: 333, opponent: 'bot' });

    assert.equal(created.mode, 'solo');
    assert.equal(created.opponent.type, 'bot');
    assert.equal(created.waitingForOpponent, false);
    assert.equal(created.inviteCode, undefined);
    assert.equal(created.state.currentPlayer, 'A');
    assert.throws(
        () => service.join(created.matchId, 'anything'),
        (error) => error instanceof MatchServiceError && error.code === 'bot_match'
    );

    const humanAction = created.state.legalActions[0];
    service.queue(created.matchId, created.token, humanAction);
    const afterRound = service.resolveTurn(created.matchId, created.token);
    const transcript = service.replay(created.matchId, created.token);

    assert.equal(afterRound.revision, 2);
    assert.equal(afterRound.state.currentPlayer, 'A');
    assert.equal(transcript.turns.length, 2);
    assert.equal(transcript.turns[0].length, 1);
    assert.equal(transcript.turns[1].every((action) => action.player === 'B'), true);
    assert.equal(new Set(transcript.turns[1].map((action) => action.actorSlot)).size, transcript.turns[1].length);
});

test('custom teams are authoritative, unique, and limited to ported roster entries', () => {
    const service = createMatchService();
    const teams = {
        A: ['pikachu', 'zubat', 'chansey'],
        B: ['bulbasaur', 'squirtle', 'charmander'],
    };
    const created = service.create({ seed: 377, opponent: 'bot', teams });

    assert.deepEqual(created.state.teams.A.map((unit) => unit.speciesId), teams.A);
    assert.deepEqual(created.state.teams.B.map((unit) => unit.speciesId), teams.B);
    assert.throws(
        () => service.create({ teams: { A: ['pikachu', 'pikachu', 'chansey'], B: teams.B } }),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_teams'
    );
    assert.throws(
        () => service.create({ teams: { A: ['pikachu', 'zubat', 'missingno'], B: teams.B } }),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_teams'
    );
    assert.deepEqual(service.roster().characters.map((character) => character.id), [
        'pokemon-trainer',
        'charmander',
        'squirtle',
        'bulbasaur',
        'pikachu',
        'butterfree',
        'koffing',
        'gastly',
        'abra',
        'krabby',
        'scyther',
        'eevee',
        'jolteon',
        'flareon',
        'vaporeon',
        'ekans',
        'machop',
        'magikarp', 'mr-mime', 'hitmonchan', 'hitmonlee', 'aerodactyl', 'magnemite', 'onix', 'meowth', 'clefairy', 'jigglypuff', 'beedrill',
        'articuno',
        'moltres',
        'zapdos',
        'zubat',
        'chansey',
        'pidgey',
        'mew',
        'mewtwo',
        'dragonite',
    ]);
});

test('bot planning is stable for the same authoritative state', () => {
    const firstService = createMatchService();
    const secondService = createMatchService();
    const first = firstService.create({ seed: 444, opponent: 'bot', startingPlayer: 'B' });
    const second = secondService.create({ seed: 444, opponent: 'bot', startingPlayer: 'B' });

    assert.equal(first.revision, 1);
    assert.equal(first.state.currentPlayer, 'A');
    assert.deepEqual(
        firstService.replay(first.matchId, first.token),
        secondService.replay(second.matchId, second.token)
    );
    assert.equal(planDeterministicBotTurn(first.state).every((action) => action.player === 'A'), true);
});

test('team turn queues stay private, support undo, and resolve as one public revision', () => {
    const service = createMatchService();
    const created = service.create({ seed: 111 });
    const joined = service.join(created.matchId, created.inviteCode);
    const first = service.view(created.matchId, created.token).state.legalActions[0];
    const queued = service.queue(created.matchId, created.token, withSuggestedPayment(first));

    assert.equal(queued.revision, 0);
    assert.equal(queued.queueRevision, 1);
    assert.equal(queued.pendingTurn.actions.length, 1);
    const opponent = service.view(created.matchId, joined.token);
    assert.equal(opponent.queueRevision, 0);
    assert.equal(opponent.pendingTurn.hidden, true);
    assert.deepEqual(opponent.pendingTurn.actions, []);
    assert.throws(
        () => service.queue(created.matchId, joined.token, { ...first, actorSlot: 2 }),
        (error) => error instanceof MatchServiceError && error.code === 'not_your_turn'
    );
    assert.throws(
        () => service.queue(created.matchId, created.token, withSuggestedPayment(first)),
        (error) => error instanceof MatchServiceError && error.code === 'invalid_queued_action'
    );

    const undone = service.undoQueued(created.matchId, created.token);
    assert.equal(undone.pendingTurn.actions.length, 0);
    assert.equal(undone.queueRevision, 2);

    const firstAgain = undone.state.legalActions[0];
    service.queue(created.matchId, created.token, withSuggestedPayment(firstAgain));
    const resolved = service.resolveTurn(created.matchId, created.token);
    assert.equal(resolved.revision, 1);
    assert.equal(resolved.queueRevision, 0);
    assert.equal(resolved.state.currentPlayer, 'B');
    assert.deepEqual(resolved.pendingTurn.actions, []);
});

test('file-backed matches survive restart without storing raw player or invite secrets', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-storage-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const firstService = createMatchService({ storage: createJsonMatchStorage(directory) });
    const created = firstService.create({ seed: 123 });
    const joined = firstService.join(created.matchId, created.inviteCode);
    const firstAction = firstService.view(created.matchId, created.token).state.legalActions[0];
    const afterAction = firstService.act(created.matchId, created.token, withSuggestedPayment(firstAction));
    assert.equal(afterAction.revision, 1);

    const files = await readdir(directory);
    assert.deepEqual(files, [`${created.matchId}.json`]);
    const storedText = await readFile(join(directory, files[0]), 'utf8');
    assert.equal(storedText.includes(created.token), false);
    assert.equal(storedText.includes(joined.token), false);
    assert.equal(storedText.includes(created.inviteCode), false);
    assert.match(storedText, /"tokenDigests"/);
    assert.match(storedText, /"revision": 1/);

    const restarted = createMatchService({ storage: createJsonMatchStorage(directory) });
    const restoredA = restarted.view(created.matchId, created.token);
    const restoredB = restarted.view(created.matchId, joined.token);
    assert.equal(restoredA.revision, 1);
    assert.equal(restoredB.state.currentPlayer, 'B');

    const secondAction = restoredB.state.legalActions[0];
    assert.equal(restarted.act(created.matchId, joined.token, withSuggestedPayment(secondAction)).revision, 2);
});

test('file-backed matches preserve an unfinished private queue across restart', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-queue-storage-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const firstService = createMatchService({ storage: createJsonMatchStorage(directory) });
    const created = firstService.create({ seed: 222 });
    const joined = firstService.join(created.matchId, created.inviteCode);
    const firstAction = firstService.view(created.matchId, created.token).state.legalActions[0];
    firstService.queue(created.matchId, created.token, withSuggestedPayment(firstAction));

    const restarted = createMatchService({ storage: createJsonMatchStorage(directory) });
    const restoredA = restarted.view(created.matchId, created.token);
    const restoredB = restarted.view(created.matchId, joined.token);
    assert.equal(restoredA.pendingTurn.actions.length, 1);
    assert.equal(restoredA.queueRevision, 1);
    assert.deepEqual(restoredB.pendingTurn.actions, []);
    assert.equal(restarted.resolveTurn(created.matchId, created.token).revision, 1);
});

test('file-backed solo matches retain bot ownership and resume automatic turns', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-bot-storage-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const firstService = createMatchService({ storage: createJsonMatchStorage(directory) });
    const created = firstService.create({ seed: 555, opponent: 'bot' });
    const firstAction = created.state.legalActions[0];
    firstService.queue(created.matchId, created.token, firstAction);

    const restarted = createMatchService({ storage: createJsonMatchStorage(directory) });
    const restored = restarted.view(created.matchId, created.token);
    assert.equal(restored.mode, 'solo');
    assert.equal(restored.pendingTurn.actions.length, 1);
    const resolved = restarted.resolveTurn(created.matchId, created.token);
    assert.equal(resolved.revision, 2);
    assert.equal(resolved.state.currentPlayer, 'A');
});
