const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildInitialBoard } = require('../battleLogic');

// battleLogic.js's own `defaultCharacters` is a plain, non-cache-busted
// require('./characters.js') captured once at module-load time (unlike
// server.js's loadCharactersDataFromFile(), which deliberately busts the
// require cache before every read). Any buildInitialBoard(...) call site in
// server.js that omits the second argument silently falls back to that
// frozen snapshot instead of the live, override-merged charactersData --
// which is exactly how Lance's Pokemon ended up starting at 100 HP instead
// of their configured 50 (maxHp was correct on disk and on the live
// characters.js payload, but real matches never saw it).
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('every buildInitialBoard call site in server.js passes the live charactersData', () => {
    const calls = Array.from(serverSource.matchAll(/battleLogic\.buildInitialBoard\(([^)]*)\)/g));
    assert.ok(calls.length >= 6, 'expected at least the known 6 buildInitialBoard call sites');
    calls.forEach((match) => {
        assert.match(
            match[1],
            /charactersData/,
            `buildInitialBoard call "${match[0]}" should pass charactersData explicitly`
        );
    });
});

test('buildInitialBoard actually honors a passed-in maxHp override (proves the wiring matters)', () => {
    const players = [{ username: 'tester', team: [0] }];
    const fiftyHpRoster = [{ id: 'test-mon', characterId: 'test-mon', name: 'Test Mon', maxHp: 50, skills: [] }];
    const hundredHpRoster = [{ id: 'test-mon', characterId: 'test-mon', name: 'Test Mon', skills: [] }];

    const boardWithOverride = buildInitialBoard(players, fiftyHpRoster);
    assert.equal(boardWithOverride.tester[0].hp, 50);
    assert.equal(boardWithOverride.tester[0].maxHp, 50);

    const boardWithoutOverride = buildInitialBoard(players, hundredHpRoster);
    assert.equal(boardWithoutOverride.tester[0].hp, 100);
    assert.equal(boardWithoutOverride.tester[0].maxHp, 100);
});
