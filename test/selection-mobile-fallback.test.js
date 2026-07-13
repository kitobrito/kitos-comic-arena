const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');

test('mobile roster taps add characters through the slot instead of depending on the image', () => {
    assert.match(script, /slot\.addEventListener\('pointerdown'/);
    assert.match(script, /upEvent\.pointerType !== 'mouse'/);
    assert.match(script, /addRosterCharacterToSelection\(dragState\.payload\.rosterIndex\)/);
    assert.doesNotMatch(
        script,
        /startSelectionPointerDrag\(event, \{ type: 'roster', rosterIndex: index \}, image\)/
    );
});

test('failed roster portraits leave a visible and tappable character fallback', () => {
    assert.match(script, /slot\.dataset\.characterInitial/);
    assert.match(script, /image\.classList\.add\('load-failed'\)/);
    assert.match(styles, /\.slot-item::before/);
    assert.match(styles, /\.slot-image\.load-failed\s*\{[^}]*visibility:\s*hidden/s);
    assert.match(script, /delete slot\.dataset\.characterInitial/);
});
