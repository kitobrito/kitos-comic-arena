import assert from 'node:assert/strict';
import test from 'node:test';

import { translateLinkedAccountProgress } from '../reference/account-import.mjs';
import { createDefaultLadderState } from '../reference/ladder-catalog.mjs';
import { createDefaultMissionState } from '../reference/mission-catalog.mjs';
import { createDefaultSkinState } from '../reference/skin-catalog.mjs';

test('a missing/null snapshot translates to plain defaults everywhere', () => {
    const result = translateLinkedAccountProgress(null);
    assert.deepEqual(result.missions, createDefaultMissionState());
    assert.deepEqual(result.skins, createDefaultSkinState());
    assert.deepEqual(result.ladder, createDefaultLadderState());
});

test('known character/skin ids carry over, unknown ones are dropped', () => {
    const result = translateLinkedAccountProgress({
        unlockedCharacterIds: ['charmander', 'squirtle', 'not-a-real-character', 'negan'],
        purchasedUnlocks: ['pikachu', 'also-fake'],
        unlockPoints: 250,
        unlockedSkinIds: ['ditto-shiny', 'totally-invented-skin'],
        equippedSkinByCharacterId: { ditto: 'ditto-shiny', charmander: 'not-a-skin' },
        ladder: null,
    });

    assert.deepEqual(new Set(result.missions.unlockedCharacterIds), new Set(['charmander', 'squirtle']));
    assert.deepEqual(result.missions.purchasedUnlocks, ['pikachu']);
    assert.equal(result.missions.unlockPoints, 250);
    assert.deepEqual(result.missions.progressByMissionId, {}, 'partial mission goal progress is never imported');
    assert.deepEqual(result.skins.unlockedSkinIds, ['ditto-shiny']);
    assert.deepEqual(result.skins.equippedSkinByCharacterId, { ditto: 'ditto-shiny' });
    assert.deepEqual(result.ladder, createDefaultLadderState());
});

test('ladder fields map onto the prototype shape, dropping production-only fields', () => {
    const result = translateLinkedAccountProgress({
        ladder: {
            level: 12,
            rank: 'Some Stale Production Rank Name',
            experiencePoints: 4200,
            wins: 30,
            losses: 10,
            streak: 3,
            highestStreak: 7,
            highestLevel: 14,
            ladderRank: 5,
            isHokage: true,
            rankHatUrl: 'https://example.com/hat.png',
            famePoints: 99,
            unlockPoints: 500,
        },
    });

    assert.equal(result.ladder.level, 12);
    // The rank name is recomputed from the shared ladder-catalog curve
    // rather than trusted verbatim from production's stored string.
    assert.notEqual(result.ladder.rank, 'Some Stale Production Rank Name');
    assert.equal(result.ladder.experiencePoints, 4200);
    assert.equal(result.ladder.wins, 30);
    assert.equal(result.ladder.losses, 10);
    assert.equal(result.ladder.streak, 3);
    assert.equal(result.ladder.highestStreak, 7);
    assert.equal(result.ladder.highestLevel, 14);
    // ladderRank/isTopRank are leaderboard-relative and always reset -
    // they get recomputed the next time the leaderboard is queried.
    assert.equal(result.ladder.ladderRank, null);
    assert.equal(result.ladder.isTopRank, false);
    assert.equal('rankHatUrl' in result.ladder, false);
    assert.equal('famePoints' in result.ladder, false);
});

test('malformed numeric fields clamp to sane values instead of throwing', () => {
    const result = translateLinkedAccountProgress({
        unlockPoints: -50,
        ladder: { level: 999, wins: -3, streak: 'not-a-number' },
    });
    assert.equal(result.missions.unlockPoints, 0);
    assert.equal(result.ladder.level, 50);
    assert.equal(result.ladder.wins, 0);
    assert.equal(result.ladder.streak, 0);
});
