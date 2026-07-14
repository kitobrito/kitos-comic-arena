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

test('selection identity uses the ladder profile for the active arena', () => {
    const hydrateIdentityBlock = script.match(
        /const hydratePlayerIdentity = async[\s\S]*?\n    };\n\n    document\.addEventListener\('visibilitychange'/
    )?.[0] || '';

    assert.match(
        hydrateIdentityBlock,
        /getArenaProfileView\(cachedUser\.profile, resolvedArenaMode\)/
    );
    assert.match(
        hydrateIdentityBlock,
        /getArenaProfileView\(apiUser\.profile, resolvedArenaMode\)/
    );
    assert.doesNotMatch(hydrateIdentityBlock, /ladder: apiUser\.profile\?\.ladder/);
});

test('selection drags snap near team slots and otherwise return selected characters to roster', () => {
    assert.match(script, /const snapPadding = 12/);
    assert.match(script, /getSelectedSlotDropIndex\(clientX, clientY, dragState\)/);
    assert.match(
        script,
        /if \(payload\?\.type === 'selected'\) \{\s*return returnSelectedPayloadToRoster\(payload\);/s
    );
    assert.match(
        script,
        /finishSelectionPointerDrop\(\s*dragState\.payload,\s*upEvent\.clientX,\s*upEvent\.clientY,\s*dragState/s
    );
});

test('the skill scroll stays above a full team so the third portrait cannot intercept it', () => {
    const viewerRule = styles.match(/\.skillviewer\s*\{[^}]*\}/s)?.[0] || '';
    const selectedListRule = styles.match(/\.selected-character-slot-list\s*\{[^}]*\}/s)?.[0] || '';

    assert.match(viewerRule, /z-index:\s*4/);
    assert.match(selectedListRule, /z-index:\s*3/);
});
