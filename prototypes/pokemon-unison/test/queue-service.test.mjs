import assert from 'node:assert/strict';
import test from 'node:test';

import { createMatchService } from '../reference/match-service.mjs';
import { createPlayerService } from '../reference/player-service.mjs';
import { createQueueService, QueueServiceError } from '../reference/queue-service.mjs';
import { DEFAULT_TEAMS } from '../reference/roster.mjs';

function service({ now } = {}) {
    const matchService = createMatchService(now ? { now } : {});
    const playerService = createPlayerService();
    const queueService = createQueueService(now ? { matchService, playerService, now } : { matchService, playerService });
    return { matchService, playerService, queueService };
}

test('two different players enqueuing the same mode pair into a live match', () => {
    const { matchService, queueService } = service();
    const first = queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    assert.equal(first.status, 'waiting');
    assert.ok(first.queueToken);

    const second = queueService.enqueue({ mode: 'quick', playerId: 'bob', teams: DEFAULT_TEAMS.B });
    assert.equal(second.status, 'matched');
    assert.ok(second.matchId);
    assert.ok(second.token);

    const firstStatus = queueService.status(first.queueToken);
    assert.equal(firstStatus.status, 'matched');
    assert.equal(firstStatus.matchId, second.matchId);
    assert.ok(firstStatus.token);
    assert.notEqual(firstStatus.token, second.token);

    // Both tokens should authenticate the same live match, immediately
    // joined with no invite/waiting-room step.
    const viewA = matchService.view(second.matchId, firstStatus.token);
    const viewB = matchService.view(second.matchId, second.token);
    assert.equal(viewA.player, 'A');
    assert.equal(viewB.player, 'B');
    assert.equal(viewA.mode, 'quick');
    assert.equal(viewA.waitingForOpponent, false);
    assert.ok(Number.isFinite(viewA.turnSecondsRemaining));
});

test('a solo waiting entry stays waiting until a second player enqueues', () => {
    const { queueService } = service();
    const created = queueService.enqueue({ mode: 'ladder', playerId: 'solo-alice', teams: DEFAULT_TEAMS.A });
    assert.equal(created.status, 'waiting');
    assert.deepEqual(queueService.status(created.queueToken), { status: 'waiting' });
});

test('the same player cannot be paired against their own second enqueue', () => {
    const { queueService } = service();
    queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    const secondFromSamePlayer = queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.B });
    assert.equal(secondFromSamePlayer.status, 'waiting');
});

test('quick and ladder pools never pair with each other', () => {
    const { queueService } = service();
    const quickWaiter = queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    const ladderJoiner = queueService.enqueue({ mode: 'ladder', playerId: 'bob', teams: DEFAULT_TEAMS.B });
    assert.equal(ladderJoiner.status, 'waiting');
    assert.deepEqual(queueService.status(quickWaiter.queueToken), { status: 'waiting' });
});

test('cancel removes a waiting entry', () => {
    const { queueService } = service();
    const created = queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    queueService.cancel(created.queueToken);
    assert.throws(
        () => queueService.status(created.queueToken),
        (error) => error instanceof QueueServiceError && error.code === 'queue_entry_not_found'
    );
});

test('status and cancel reject unknown tokens', () => {
    const { queueService } = service();
    assert.throws(
        () => queueService.status('not-a-real-token'),
        (error) => error instanceof QueueServiceError && error.code === 'queue_entry_not_found'
    );
    assert.throws(
        () => queueService.cancel('not-a-real-token'),
        (error) => error instanceof QueueServiceError && error.code === 'queue_entry_not_found'
    );
});

test('enqueue validates mode, sign-in, and team composition', () => {
    const { queueService } = service();
    assert.throws(
        () => queueService.enqueue({ mode: 'ranked', playerId: 'alice', teams: DEFAULT_TEAMS.A }),
        (error) => error instanceof QueueServiceError && error.code === 'invalid_mode'
    );
    assert.throws(
        () => queueService.enqueue({ mode: 'quick', playerId: null, teams: DEFAULT_TEAMS.A }),
        (error) => error instanceof QueueServiceError && error.code === 'sign_in_required'
    );
    assert.throws(
        () => queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: ['charmander', 'charmander'] }),
        (error) => error instanceof QueueServiceError && error.code === 'invalid_teams'
    );
});

test('a ladder-mode match records mode "ladder" for mission/ladder gating', () => {
    const { matchService, queueService } = service();
    queueService.enqueue({ mode: 'ladder', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    const matched = queueService.enqueue({ mode: 'ladder', playerId: 'bob', teams: DEFAULT_TEAMS.B });
    const view = matchService.view(matched.matchId, matched.token);
    assert.equal(view.mode, 'ladder');
});

test('bot accounts are seeded as real players at construction time', () => {
    const { playerService } = service();
    const bots = playerService.listAll().filter((player) => player.isBot);
    assert.ok(bots.length >= 15);
    assert.ok(bots.every((bot) => bot.profile.ladder?.level >= 1));
});

test('a solo waiter does not fall back to a bot before the 15s delay', () => {
    let clock = 1_000_000;
    const { queueService } = service({ now: () => clock });
    const created = queueService.enqueue({ mode: 'quick', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    clock += 14_000;
    assert.deepEqual(queueService.status(created.queueToken), { status: 'waiting' });
});

test('a solo waiter falls back to a real bot opponent after the 15s delay', () => {
    let clock = 1_000_000;
    const { matchService, playerService, queueService } = service({ now: () => clock });
    const created = queueService.enqueue({ mode: 'ladder', playerId: 'alice', teams: DEFAULT_TEAMS.A });
    clock += 15_000;
    const result = queueService.status(created.queueToken);
    assert.equal(result.status, 'matched');
    assert.ok(result.matchId);
    assert.ok(result.token);

    const view = matchService.view(result.matchId, result.token);
    assert.equal(view.mode, 'ladder');
    assert.equal(view.waitingForOpponent, false);
    // The bot is deliberately reported as a human opponent so it feels real.
    assert.equal(view.opponent.type, 'human');
    assert.ok(view.opponent.name);
    assert.ok(view.opponent.avatarUrl);

    const bot = playerService.listAll().find((player) => player.username === view.opponent.name);
    assert.ok(bot?.isBot);

    // Polling again after the entry was already consumed should not
    // re-trigger a second fallback for the same (now gone) queue entry.
    assert.throws(
        () => queueService.status(created.queueToken),
        (error) => error instanceof QueueServiceError && error.code === 'queue_entry_not_found'
    );
});
