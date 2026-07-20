const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('turn confirmation uses standard click activation on every input type', () => {
    assert.match(script, /endTurnOkButton\.addEventListener\('click', \(event\) => \{/);
    assert.doesNotMatch(script, /endTurnOkButton\.addEventListener\('pointerup'/);
    assert.match(script, /readySectionEl\.addEventListener\('click', \(\) => \{/);
});

test('turn confirmation cannot remain disabled forever on a stalled skill queue', () => {
    assert.match(script, /waitForPendingSkillQueues = async \(timeoutMs = 8000\)/);
    assert.match(script, /if \(!settledBeforeTimeout\) return false/);
    assert.match(script, /reason: 'end-turn-queue-timeout'/);
    assert.match(script, /Attack queue restored\. Review your attacks, then press OK again\./);
});

test('battle page cache-busts the shared script for the confirmation hotfix', () => {
    assert.match(ingame, /styles\/style\.css\?v=turn-confirm-hotfix-v2/);
    assert.match(ingame, /styles\/ingame-experimental\.css\?v=pokemon-gameplay-fixes-v2/);
    assert.match(ingame, /scripts\/script\.js\?v=pokemon-ui-sync-fixes-v1/);
});

test('end-turn dialog blocks the battle below it and clears competing overlays', () => {
    assert.match(ingame, /class="end-turn-modal-backdrop"/);
    assert.match(ingame, /class="ChakraChooseEndTurn" role="dialog" aria-modal="true"/);
    assert.match(script, /document\.body\.classList\.add\('end-turn-modal-open'\)/);
    assert.match(script, /hideStatusReveal\(\{ clearPinned: true, clearHeld: true \}\)/);
    assert.match(script, /endTurnOkButton\.addEventListener\('click', \(event\) => \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/s);
    assert.match(script, /Could not confirm this turn:/);
});

test('turn confirmation waits for random energy requests to reach the server', () => {
    assert.match(script, /let randomChakraRequestsInFlight = 0/);
    assert.match(script, /waitForRandomChakraAdjustments = async \(timeoutMs = 8000\)/);
    assert.match(script, /endTurnOkButton\.disabled = isEndingTurn \|\| isSyncingRandomEnergy/);
    assert.match(script, /Syncing your random energy selection/);
    assert.match(script, /reason: 'end-turn-energy-sync'/);
    assert.match(script, /window\.setTimeout\(\(\) => controller\.abort\(\), 12000\)/);
    assert.match(script, /signal: controller\.signal/);
});

test('experimental battle UI keeps energy exchange and skill buttons clear of portraits', () => {
    const experimentalStyles = fs.readFileSync(
        path.join(root, 'styles', 'ingame-experimental.css'),
        'utf8'
    );
    assert.match(experimentalStyles, /html\.battle-experimental \.exchange-label \{[\s\S]*?display: block;/);
    assert.match(experimentalStyles, /html\.battle-experimental \.skillholder \{\s*left: 82px;/);
    assert.match(experimentalStyles, /width: 360px;/);
});

test('replacement skills can display and enforce their base slot cooldown', () => {
    assert.match(script, /const getCooldownSkillIdForActor = \(actorUnit, skill, skillIdx = null\)/);
    assert.match(script, /getCooldownRemainingForSkill\(actorUnit, skill, skillIdx\)/);
    assert.match(script, /getCooldownSkillIdForActor\(actorUnit, effectiveSkill, meta\.skillIdx\)/);
});

test('health bands use health percentage and the experimental skin preserves their colors', () => {
    const experimentalStyles = fs.readFileSync(
        path.join(root, 'styles', 'ingame-experimental.css'),
        'utf8'
    );
    assert.match(script, /const hpBand = ratio <= 0\.3 \? 'low' : ratio <= 0\.6 \? 'mid' : 'high'/);
    assert.match(experimentalStyles, /html\.battle-experimental \.health-bar\.hp-mid/);
    assert.match(experimentalStyles, /html\.battle-experimental \.health-bar\.hp-low/);
});

test('status reveal panels dismiss when the player interacts elsewhere', () => {
    assert.match(script, /if \(!statusRevealHeld && !statusRevealPinned\) return/);
    assert.match(script, /hideStatusReveal\(\{ clearPinned: true, clearHeld: true \}\)/);
});
