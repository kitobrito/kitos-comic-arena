const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('turn confirmation uses standard click activation on every input type', () => {
    assert.match(script, /endTurnOkButton\.addEventListener\('click', \(\) => \{/);
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
    assert.match(ingame, /scripts\/script\.js\?v=turn-confirm-hotfix-v1/);
});
