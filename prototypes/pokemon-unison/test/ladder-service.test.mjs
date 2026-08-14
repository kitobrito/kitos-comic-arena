import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultLadderState, getCumulativeExperienceForLevel, LADDER_WIN_EXPERIENCE } from '../reference/ladder-catalog.mjs';
import { createLadderService } from '../reference/ladder-service.mjs';
import { createPlayerService } from '../reference/player-service.mjs';

async function registerPlayer(playerService, username) {
    const { player } = await playerService.register({ username, email: '', password: 'longenough1' });
    return player;
}

test('a new player starts at the default ladder state', async () => {
    const playerService = createPlayerService();
    const alice = await registerPlayer(playerService, 'Alice');
    assert.deepEqual(alice.profile.ladder, createDefaultLadderState());
});

test('only ladder-mode match results affect ladder stats', async () => {
    const playerService = createPlayerService();
    const ladderService = createLadderService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    const bob = await registerPlayer(playerService, 'Bob');

    for (const mode of ['solo', 'private', 'quick']) {
        ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode });
    }

    assert.deepEqual(playerService.getById(alice.id).profile.ladder, createDefaultLadderState());
    assert.deepEqual(playerService.getById(bob.id).profile.ladder, createDefaultLadderState());
});

test('a ladder win awards EXP and wins, a ladder loss awards losses and less EXP', async () => {
    const playerService = createPlayerService();
    const ladderService = createLadderService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    const bob = await registerPlayer(playerService, 'Bob');

    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });

    const aliceLadder = playerService.getById(alice.id).profile.ladder;
    const bobLadder = playerService.getById(bob.id).profile.ladder;

    assert.equal(aliceLadder.wins, 1);
    assert.equal(aliceLadder.losses, 0);
    assert.equal(aliceLadder.streak, 1);
    assert.equal(aliceLadder.experiencePoints, LADDER_WIN_EXPERIENCE);

    assert.equal(bobLadder.wins, 0);
    assert.equal(bobLadder.losses, 1);
    assert.equal(bobLadder.streak, -1);
    assert.ok(bobLadder.experiencePoints > 0);
    assert.ok(bobLadder.experiencePoints < aliceLadder.experiencePoints);
});

test('winning and losing streaks accumulate and reset on the opposite result', async () => {
    const playerService = createPlayerService();
    const ladderService = createLadderService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    const bob = await registerPlayer(playerService, 'Bob');

    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });
    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });
    assert.equal(playerService.getById(alice.id).profile.ladder.streak, 2);
    assert.equal(playerService.getById(bob.id).profile.ladder.streak, -2);

    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'B', mode: 'ladder' });
    assert.equal(playerService.getById(alice.id).profile.ladder.streak, -1);
    assert.equal(playerService.getById(bob.id).profile.ladder.streak, 1);

    const aliceLadder = playerService.getById(alice.id).profile.ladder;
    assert.equal(aliceLadder.highestStreak, 2);
});

test('enough wins raise level and rank name to match the ported production curve', async () => {
    const playerService = createPlayerService();
    const ladderService = createLadderService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    const bob = await registerPlayer(playerService, 'Bob');

    // Level 2 requires getCumulativeExperienceForLevel(2) total EXP.
    const winsNeeded = Math.ceil(getCumulativeExperienceForLevel(2) / LADDER_WIN_EXPERIENCE);
    for (let i = 0; i < winsNeeded; i += 1) {
        ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });
    }

    const aliceLadder = playerService.getById(alice.id).profile.ladder;
    assert.ok(aliceLadder.level >= 2, `expected level >= 2, got ${aliceLadder.level}`);
    assert.equal(aliceLadder.highestLevel, aliceLadder.level);
});

test('leaderboard sorts by level, then EXP, then wins, assigns ladderRank, and marks exactly one top rank when reached', async () => {
    const playerService = createPlayerService();
    const ladderService = createLadderService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    const bob = await registerPlayer(playerService, 'Bob');
    await registerPlayer(playerService, 'Carol');

    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });
    ladderService.onMatchComplete({ playerIds: { A: alice.id, B: bob.id }, winner: 'A', mode: 'ladder' });

    const board = ladderService.leaderboard();
    assert.equal(board[0].username, 'Alice');
    assert.equal(board[0].ladder.ladderRank, 1);
    assert.equal(board.every((entry) => !entry.ladder.isTopRank), true);

    const refreshedAlice = playerService.getById(alice.id).profile.ladder;
    assert.equal(refreshedAlice.ladderRank, 1);
});
