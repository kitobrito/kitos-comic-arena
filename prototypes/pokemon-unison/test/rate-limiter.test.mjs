import assert from 'node:assert/strict';
import test from 'node:test';

import { clientIp, createRateLimiter } from '../reference/rate-limiter.mjs';

test('a key is allowed up to max hits within the window, then blocked', () => {
    let clock = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => clock });

    assert.equal(limiter.check('1.2.3.4'), true);
    assert.equal(limiter.check('1.2.3.4'), true);
    assert.equal(limiter.check('1.2.3.4'), true);
    assert.equal(limiter.check('1.2.3.4'), false, 'the 4th hit within the window is blocked');
});

test('different keys are tracked independently', () => {
    let clock = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => clock });

    assert.equal(limiter.check('alice'), true);
    assert.equal(limiter.check('alice'), false);
    assert.equal(limiter.check('bob'), true, 'a different key has its own independent budget');
});

test('hits older than the window expire, freeing up new attempts', () => {
    let clock = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, now: () => clock });

    assert.equal(limiter.check('alice'), true);
    assert.equal(limiter.check('alice'), true);
    assert.equal(limiter.check('alice'), false);

    clock += 60_001;
    assert.equal(limiter.check('alice'), true, 'the earlier hits have aged out of the sliding window');
});

test('clientIp prefers the first x-forwarded-for hop, falling back to the socket address', () => {
    assert.equal(
        clientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, socket: { remoteAddress: '10.0.0.1' } }),
        '203.0.113.5'
    );
    assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '10.0.0.2' } }), '10.0.0.2');
    assert.equal(clientIp({ headers: {}, socket: {} }), 'unknown');
});
