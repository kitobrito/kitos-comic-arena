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

test('applyMatchState sets pendingTurnState, chakra, and turn state early, in dependency order', () => {
    const fnStart = script.indexOf('const applyMatchState = (data) => {');
    assert.ok(fnStart >= 0, 'expected to find applyMatchState');

    // Order matters and is easy to get backwards (this fix went through two
    // iterations before landing here): pendingTurnState must be set before
    // renderChakra() (buildDisplayedChakraPool() reads pendingTurnState to
    // account for optimistic UI adjustments), and renderChakra() must run
    // before syncTurnState() (which calls updateSkillAffordability(), and
    // that reads the outer playerPoolState -- only ever updated as a side
    // effect of renderChakra() itself). Getting this backwards previously
    // shipped a real regression: skill affordability computed from the
    // previous poll's stale chakra amounts.
    assert.match(
        script,
        /pendingTurnState = normalizePendingTurn\(data\.pendingTurn\);\s*const earlyChakraPool =\s*getScopedValueForCurrentUsername\(data\.chakraPools, currentPlayerUsername\) \|\|\s*playerPoolState \|\|\s*emptyPool\(\);\s*renderChakra\(earlyChakraPool\);\s*syncTurnState\(data\.currentTurn, data\.turnExpiresAt, data\.turnDurationMs\);\s*setIngameArenaUiAssets/
    );

    const earlySyncIndex = script.indexOf('syncTurnState(data.currentTurn, data.turnExpiresAt, data.turnDurationMs);', fnStart);
    assert.ok(earlySyncIndex >= 0, 'expected an early syncTurnState() call before setIngameArenaUiAssets()');

    // Everything downstream of the early block that could plausibly throw --
    // weather/portrait rendering, the visual-signature branch, and the full
    // preload/render pipeline -- must all appear AFTER it now.
    const cosmeticMarkers = [
        'setIngameArenaUiAssets(currentMatchArena);',
        'renderWeatherBanner(activePokemonWeather);',
        'buildMatchVisualSignature(data,',
        "runIngameRenderStep('preload:match-visuals'",
        "runIngameRenderStep('render:health'",
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

test('skill affordability is recomputed once latestBoardState is current, not just from the early sync', () => {
    // updateSkillAffordability() reads latestBoardState, which is only ever
    // set as a side effect of renderBoardHealth() -- and renderBoardHealth()
    // necessarily runs after the early syncTurnState() call above (it's part
    // of the cosmetic pipeline that call was moved ahead of). Without this,
    // stun/dead-gated skill icons would be judged against a one-poll-stale
    // board for a frame.
    assert.match(
        script,
        /runIngameRenderStep\('render:health', \(\) => renderBoardHealth\(data\)\);\s*(?:\/\/[^\n]*\n\s*)*updateSkillAffordability\(\);\s*runIngameRenderStep\('render:statuses'/
    );
});

test('each cosmetic render step is isolated so one failure cannot block the others', () => {
    // Previously these ran as plain sequential measureIngamePerf() calls with
    // no error isolation between them -- a throw in an earlier step (e.g.
    // preload) meant renderBoardHealth() never ran at all for that poll, and
    // would keep never running on every subsequent poll too, since the same
    // bad input recurs -- a silently, permanently stuck health bar with
    // nothing in the console pointing at why.
    assert.match(
        script,
        /const runIngameRenderStep = \(name, fn\) => \{\s*try \{\s*measureIngamePerf\(name, fn\);\s*\} catch \(error\) \{\s*console\.error\(`applyMatchState render step "\$\{name\}" failed`, error\);\s*\}\s*\};/
    );
    ['preload:match-visuals', 'render:chakra', 'render:health', 'render:statuses', 'render:cooldowns'].forEach(
        (stepName) => {
            assert.match(
                script,
                new RegExp(`runIngameRenderStep\\('${stepName}',`),
                `expected "${stepName}" to run through the isolated render-step wrapper`
            );
        }
    );
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
