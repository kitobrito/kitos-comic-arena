const assert = require('node:assert/strict');
const test = require('node:test');

const { sanitizeBoardForViewer } = require('../server');

// buildInitialBoard() always sets hp/hpCap/maxHp on every unit (see
// battleLogic.js), and the server-side match document was confirmed correct
// (50/50/50 for Lance's Pokemon) via direct inspection of a live match. But
// sanitizeBoardForViewer() -- the sole function that shapes board data before
// it reaches the client -- whitelisted only slot/rosterIndex/alive/hp/state,
// silently dropping hpCap and maxHp. Every character used to share the same
// 100 HP so the client's own fallback masked this; Lance's 50 HP Pokemon
// exposed it, showing 100 HP client-side despite the server storing 50.
test('sanitizeBoardForViewer forwards hpCap and maxHp, not just hp', () => {
    const board = {
        alice: [
            { slot: 0, rosterIndex: 110, alive: true, hp: 50, hpCap: 50, maxHp: 50, state: {} },
        ],
    };
    const sanitized = sanitizeBoardForViewer(board, 'alice');
    const unit = sanitized.alice[0];
    assert.equal(unit.hp, 50);
    assert.equal(unit.hpCap, 50);
    assert.equal(unit.maxHp, 50);
});

test('sanitizeBoardForViewer omits hpCap/maxHp rather than defaulting to 0 when genuinely absent', () => {
    // Covers pre-existing persisted matches from before buildInitialBoard set
    // these fields at all -- the client's own MAX_HP fallback should still
    // apply, not a false "0 HP cap".
    const board = {
        alice: [{ slot: 0, rosterIndex: 5, alive: true, hp: 100, state: {} }],
    };
    const sanitized = sanitizeBoardForViewer(board, 'alice');
    const unit = sanitized.alice[0];
    assert.equal(unit.hp, 100);
    assert.ok(!('hpCap' in unit));
    assert.ok(!('maxHp' in unit));
});
