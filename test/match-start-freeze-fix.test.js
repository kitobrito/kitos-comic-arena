const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// A fresh match's first payload takes applyMatchState's "new visual signature"
// branch, which used to run a long chain of rendering calls (weather,
// portraits, health bars, status FX, cooldown badges, queued-skill visuals,
// predator-ricochet previews...) BEFORE ever calling syncTurnState() -- the
// only place that sets currentTurnUsername and starts the turn-timer
// interval. Any uncaught throw partway through that chain (nothing in it was
// wrapped) left currentTurnUsername permanently null: the ready banner's own
// click handler no-ops without it, the timer never starts, and even the
// fallback poller refuses to run without a turn owner -- a real, silent,
// unrecoverable hard freeze with no self-heal path. This became far more
// likely to trigger once every fresh match's board started carrying real
// per-character hpCap/maxHp for the first time (see the Lance HP fix
// commits), an untested-at-scale data shape flowing through that same chain.

const script = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'script.js'),
    'utf8'
);

test('applyMatchState sets core turn/ready/timer state before any cosmetic rendering can throw', () => {
    const fnStart = script.indexOf('const applyMatchState = (data) => {');
    assert.ok(fnStart >= 0, 'expected to find applyMatchState');
    const fnBody = script.slice(fnStart, fnStart + 4000);
    assert.match(
        fnBody,
        /pendingTurnState = normalizePendingTurn\(data\.pendingTurn\);\s*syncTurnState\(data\.currentTurn, data\.turnExpiresAt, data\.turnDurationMs\);\s*setIngameArenaUiAssets/
    );
    const earlySyncIndex = script.indexOf('syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);', fnStart);
    assert.ok(earlySyncIndex >= 0, 'expected an early syncTurnState() call before setIngameArenaUiAssets()');

    // Everything downstream of the early call that could plausibly throw --
    // weather/portrait rendering, the visual-signature branch, and the full
    // preload/render pipeline -- must all appear AFTER it now.
    const cosmeticMarkers = [
        'setIngameArenaUiAssets(currentMatchArena);',
        'renderWeatherBanner(activePokemonWeather);',
        'buildMatchVisualSignature(data,',
        "measureIngamePerf('preload:match-visuals'",
        "measureIngamePerf('render:health'",
    ];
    cosmeticMarkers.forEach((marker) => {
        const markerIndex = script.indexOf(marker, fnStart);
        assert.ok(markerIndex >= 0, `expected to find "${marker}" inside applyMatchState`);
        assert.ok(
            markerIndex > earlySyncIndex,
            `expected "${marker}" to run after the early syncTurnState() call, not before`
        );
    });
});

test('a throw during the initial match render triggers auto-recovery instead of a silent freeze', () => {
    assert.match(
        script,
        /try \{\s*applyIncomingMatchState\(data, \{ playEntrySound: true \}\);\s*\} catch \(error\) \{[\s\S]*?attemptMatchAutoRecovery\('initial-render-failure'\);\s*\}/
    );
});

test('a throw in the deferred socket-driven match apply triggers recovery instead of an unhandled rejection', () => {
    assert.match(
        script,
        /const applyPendingSocketState = \(\) => \{[\s\S]*?try \{\s*applyIncomingMatchState\(nextState\);\s*\} catch \(error\) \{[\s\S]*?recoverCurrentMatchState\(\{\s*reason: 'deferred-socket-apply-failure',/
    );
});
