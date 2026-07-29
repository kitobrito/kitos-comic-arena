'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { hashPassword, comparePassword } = require('../passwordHashing');

test('password hashing remains bcrypt-compatible outside the main event loop', async () => {
    const eventLoopTicked = new Promise((resolve) => setTimeout(resolve, 0));
    const hashPromise = hashPassword('correct horse battery staple');
    await eventLoopTicked;
    const passwordHash = await hashPromise;

    assert.match(passwordHash, /^\$2[aby]\$\d{2}\$/);
    assert.equal(await comparePassword('correct horse battery staple', passwordHash), true);
    assert.equal(await comparePassword('wrong password', passwordHash), false);
});
