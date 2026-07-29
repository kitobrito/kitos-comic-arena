const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const styles = fs.readFileSync(path.join(root, 'styles', 'ingame-experimental.css'), 'utf8');
const sharedStyles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('battle usernames are contained inside their header panels', () => {
    assert.match(styles, /\.player-left,[\s\S]*?\.player-right \{[\s\S]*?overflow: hidden;/);
    assert.match(styles, /\.player-info,[\s\S]*?\.player-inforight \{[\s\S]*?max-width: 127px;[\s\S]*?overflow: hidden;/);
    assert.match(styles, /\.player-name \{[\s\S]*?width: 100%;[\s\S]*?text-overflow: ellipsis;/);
    assert.match(styles, /\.player-info,[\s\S]*?\.player-inforight \{[\s\S]*?position: static;[\s\S]*?left: auto;/);
});

test('skill costs begin after the move browser instead of underneath it', () => {
    assert.match(styles, /\.energytext \{ left: 170px;/);
    assert.match(styles, /\.ingameclasses \{ left: 300px;/);
    assert.match(ingame, /styles\/ingame-experimental\.css\?v=pokemon-gameplay-fixes-v4/);
});

test('experimental battle chat is a visible standalone control beside surrender', () => {
    assert.match(ingame, /<\/div>\s*<section class="match-chat collapsed" aria-label="Match chat">/);
    assert.match(styles, /html\.battle-experimental \.match-chat \{[\s\S]*?top: 494px;[\s\S]*?left: 147px;[\s\S]*?width: 75px;/);
    assert.match(styles, /html\.battle-experimental \.match-chat-panel \{[\s\S]*?bottom: 46px;[\s\S]*?width: 300px;/);
});

test('experimental battle keeps full skill rows visible and centers the end-turn energy dialog', () => {
    assert.match(styles, /\.skillscrollingame\.not-turn,[\s\S]*?clip-path: none;/);
    assert.match(styles, /\.ChakraChooseEndTurn \{[\s\S]*?top: 50%;[\s\S]*?left: 50%;[\s\S]*?translate\(-50%, -50%\)/);
});

test('experimental battle exposes an upward-opening options menu with a death animation toggle', () => {
    assert.match(ingame, /data-ui-setting="deathAnimations"> Death animations/);
    assert.match(
        styles,
        /\.ingame-ui-options-panel \{[\s\S]*?bottom: calc\(100% \+ 8px\);[\s\S]*?left: 0;/
    );
    assert.match(script, /deathAnimations: true/);
    assert.match(script, /if \(!card \|\| !uiSettings\.deathAnimations\) return;/);
    assert.match(sharedStyles, /body\.ui-disable-death-animations \.character-death-shatter/);
    assert.match(ingame, /battle-options-death-toggle-v1/);
    assert.match(ingame, /battle-death-toggle-v1/);
});

test('mobile experimental battle exposes an unscaled options dock and aligned cooldown badges', () => {
    assert.match(script, /setupMobileIngameUiOptions/);
    assert.match(script, /document\.body\.appendChild\(dock\)/);
    assert.match(styles, /\.mobile-ingame-options-dock \{[\s\S]*?position: fixed;/);
    assert.match(styles, /\.mobile-ingame-options-toggle \{[\s\S]*?bottom: max\(10px, env\(safe-area-inset-bottom\)\)/);
    assert.match(styles, /\.skill-cooldown-badge \{[\s\S]*?font-size: 28px;[\s\S]*?text-align: center;/);
    assert.match(script, /badge\.style\.left = `\$\{meta\.imgEl\.offsetLeft\}px`/);
    assert.match(ingame, /mobile-battle-options-v2/);
    assert.match(ingame, /cooldown-alignment-v1/);
});

test('mobile evolution cinematic is centered on the visual viewport', () => {
    assert.match(script, /const viewportWidth = window\.visualViewport\?\.width \|\| window\.innerWidth/);
    assert.match(script, /const centerOnVisibleViewport = viewportWidth <= 680/);
    assert.match(sharedStyles, /@media \(max-width: 680px\) and \(max-height: 520px\)[\s\S]*?scale\(\.72\)/);
    assert.match(ingame, /pokemon-evolution-cinematic-v2/);
});

test('unchanged queued skill previews survive random chakra adjustments', () => {
    assert.match(script, /let renderedSkillOrderSignature = ''/);
    assert.match(
        script,
        /newlyQueuedKeys\.size === 0 && renderSignature === renderedSkillOrderSignature/
    );
    assert.match(script, /const existingPreviews = new Map/);
    assert.match(script, /preview\.dataset\.skillImage !== skillImage/);
    assert.doesNotMatch(script, /renderedSkillOrderSignature = renderSignature;\s*skillOrderEl\.innerHTML = ''/);
    assert.match(ingame, /chakra-queue-stability-v3/);
    assert.match(ingame, /chakra-sync-batch-v1/);
});

test('battle sync applies socket snapshots immediately and polls revisions while waiting', () => {
    assert.match(script, /window\.queueMicrotask\(applyPendingSocketState\)/);
    assert.doesNotMatch(
        script,
        /pendingSocketMatchStateFrame = window\.requestAnimationFrame/
    );
    assert.match(script, /\/api\/match\/\$\{encodeURIComponent\(matchIdFromUrl\)\}\/version/);
    assert.match(script, /remoteRevision <= lastAppliedMatchRevision/);
    assert.match(script, /pollMatchVersionFallback\(\)\.catch/);
    assert.match(ingame, /match-sync-watchdog-v2/);
});

test('battle commands time out without permanently blocking the serialized request chain', () => {
    assert.match(script, /const MATCH_COMMAND_TIMEOUT_MS = 8000/);
    assert.match(script, /Number\(requestOptions\.matchCommandTimeoutMs\) \|\| MATCH_COMMAND_TIMEOUT_MS/);
    assert.match(script, /timeoutError\.name = 'MatchCommandTimeoutError'/);
    assert.match(script, /requestImmediateMatchSync\('command-timeout'\)/);
    assert.match(script, /matchCommandRequestChain = request\.then\(\s*\(\) => undefined,\s*\(\) => undefined/s);
});

test('battle sockets heartbeat and immediately reconcile after mobile resume or reconnect', () => {
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    assert.match(script, /const MATCH_SOCKET_HEARTBEAT_INTERVAL_MS = 4000/);
    assert.match(script, /const MATCH_SOCKET_STALE_AFTER_MS = 12000/);
    assert.match(script, /type: 'match_ping'/);
    assert.match(script, /message\?\.type === 'match_pong'/);
    assert.match(script, /requestImmediateMatchSync\('socket-heartbeat-timeout'\)/);
    assert.match(script, /pollMatchVersionFallback\(\{ force: true \}\)/);
    assert.match(script, /requestImmediateMatchSync\('visibility-resume'\)/);
    assert.match(script, /requestImmediateMatchSync\('page-resume'\)/);
    assert.match(script, /requestImmediateMatchSync\('network-online'\)/);
    assert.match(script, /requestImmediateMatchSync\('window-focus'\)/);
    assert.match(server, /message\?\.type === 'match_ping'/);
    assert.match(server, /type: 'match_pong'/);
});

test('automatic match recovery stays visually silent while genuine gameplay errors remain available', () => {
    assert.match(script, /const isSilentMatchRecoveryError = \(error\)/);
    assert.match(script, /if \(options\.silent \|\| isSilentMatchReconciliationReason\(options\.reason\)\) return/);
    assert.match(script, /recoverCurrentMatchState\(\{ reason, message, silent: true \}\)/);
    assert.match(script, /if \(!silent\) \{\s*setMatchIssueBanner\(/);
    assert.match(script, /if \(silent\) \{\s*connectMatchSocket\(\);\s*return false;/);
    assert.doesNotMatch(script, /Connection to the live match was interrupted\. Reconnecting/);
    assert.doesNotMatch(script, /Live match update failed to apply\. Retrying sync/);
    assert.match(script, /Could not queue that skill/);
    assert.match(script, /if \(!silent\) \{\s*announceMatchIssue\(/);
});
