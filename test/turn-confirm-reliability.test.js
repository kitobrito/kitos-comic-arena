const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('turn confirmation uses standard click activation on every input type', () => {
    assert.match(script, /endTurnOkButton\.addEventListener\('click', \(event\) => \{/);
    assert.doesNotMatch(script, /endTurnOkButton\.addEventListener\('pointerup'/);
    assert.match(script, /readySectionEl\.addEventListener\('click', \(\) => \{/);
});

test('turn confirmation cannot remain disabled forever on a stalled skill queue', () => {
    assert.match(script, /waitForPendingSkillQueues = async \(timeoutMs = 8000\)/);
    assert.match(script, /if \(!settledBeforeTimeout\) return false/);
    assert.match(script, /reason: 'end-turn-queue-timeout'/);
    assert.match(script, /reason: 'end-turn-queue-timeout',[\s\S]*?silent: true/);
    assert.doesNotMatch(script, /Attack queue restored\. Review your attacks, then press OK again\./);
});

test('skill affordability is rechecked when the target selection is committed', () => {
    assert.match(
        script,
        /const queueSelectedSkill = \(\{[\s\S]*?const effectiveSkill = getEffectiveSkillForActorSlot\(actorSlot, skillIdx\) \|\| null;[\s\S]*?if \(!isActorSkillSelectableNow\(actorSlot, skillIdx, effectiveSkill\)\)/
    );
    assert.match(script, /That skill is no longer affordable with your remaining energy\./);
    assert.match(ingame, /energy-commit-guard-v1/);
});

test('battle page cache-busts the shared script for the confirmation hotfix', () => {
    assert.match(ingame, /styles\/style\.css\?v=pokemon-battle-polish-v1/);
    assert.match(ingame, /styles\/ingame-experimental\.css\?v=pokemon-gameplay-fixes-v4/);
    assert.match(ingame, /scripts\/script\.js\?v=pokemon-battle-polish-v2/);
    assert.match(ingame, /match-db-recovery-v1/);
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
    assert.match(script, /endTurnOkButton\.disabled = isEndingTurn/);
    assert.doesNotMatch(script, /endTurnOkButton\.disabled = isEndingTurn \|\| isSyncingRandomEnergy/);
    assert.match(script, /Saving your energy selection/);
    assert.doesNotMatch(script, /Syncing your random energy selection/);
    assert.doesNotMatch(script, /endTurnOkButton\.textContent = isSyncingRandomEnergy/);
    assert.match(script, /reason: 'end-turn-energy-sync'/);
    assert.match(script, /reason: 'end-turn-energy-sync',[\s\S]*?silent: true/);
    assert.match(script, /timeoutMs = 12000/);
    assert.match(script, /Math\.max\(1000, Number\(timeoutMs\) \|\| 12000\)/);
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

test('terminal match state is part of visual deduplication and skill selection closes status panels', () => {
    assert.match(script, /data\?\.status \|\| ''[\s\S]*?data\?\.winner \|\| ''[\s\S]*?data\?\.endReason \|\| ''/);
    assert.match(script, /const onSkillClick = \(event\) => \{[\s\S]*?hideStatusReveal\(\{ clearPinned: true, clearHeld: true \}\)/);
});

test('battle layout switching happens in place without reloading the live match', () => {
    assert.match(script, /history\.replaceState\(window\.history\.state, '', nextUrl\.toString\(\)\)/);
    assert.match(script, /classList\.toggle\('battle-experimental', useExperimentalBattle\)/);
    assert.doesNotMatch(script, /ingameLayoutToggle\.addEventListener\('click',[\s\S]{0,700}window\.location\.assign/);
});

test('match recovery is bounded and a lethal ladder board requests the terminal result', () => {
    assert.match(script, /timeoutMs = 12000/);
    assert.match(script, /Math\.max\(1000, Number\(timeoutMs\) \|\| 12000\)/);
    assert.match(script, /signal: controller\.signal/);
    assert.match(script, /reason: 'ladder-terminal-board'/);
    assert.match(script, /Confirming the final ladder result/);
});

test('temporary session lookup failures keep the player on the recoverable match URL', () => {
    assert.match(server, /Session lookup failed:/);
    assert.match(server, /res\.status\(503\)\.json\(\{ error: 'Session temporarily unavailable\. Please retry\.' \}\)/);
    assert.doesNotMatch(server, /Session verification failed:[\s\S]{0,120}res\.status\(401\)/);
});
