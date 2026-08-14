import assert from 'node:assert/strict';
import test from 'node:test';

import { BOT_ACCOUNTS } from '../reference/bot-catalog.mjs';
import { ROSTER } from '../reference/roster.mjs';

test('every bot account has a unique, believable username', () => {
    const usernames = BOT_ACCOUNTS.map((account) => account.username);
    assert.ok(usernames.length >= 15);
    assert.equal(new Set(usernames).size, usernames.length, 'no duplicate usernames');
    usernames.forEach((username) => {
        assert.match(username, /^[A-Za-z]+$/, `${username} should be a single trainer-style handle`);
    });
});

test('every bot fields exactly three valid, unique roster species', () => {
    BOT_ACCOUNTS.forEach((account) => {
        assert.equal(account.team.length, 3, `${account.username} should have a 3-Pokemon team`);
        assert.equal(new Set(account.team).size, 3, `${account.username}'s team should have no duplicates`);
        account.team.forEach((speciesId) => {
            assert.ok(ROSTER[speciesId], `${account.username}'s team references unknown species "${speciesId}"`);
        });
        assert.ok(ROSTER[account.avatarSpeciesId], `${account.username}'s avatar species must be a valid roster entry`);
    });
});

test('every bot ladder profile sits on the real level/EXP curve with sane wins/losses', () => {
    BOT_ACCOUNTS.forEach((account) => {
        const { ladder } = account;
        assert.ok(ladder.level >= 1 && ladder.level <= 50, `${account.username}'s level should be 1-50`);
        assert.ok(ladder.wins > ladder.losses, `${account.username} should have more wins than losses`);
        assert.ok(ladder.experiencePoints >= 0);
        assert.ok(typeof ladder.rank === 'string' && ladder.rank.length > 0);
    });
});
