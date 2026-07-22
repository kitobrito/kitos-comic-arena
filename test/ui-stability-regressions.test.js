const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('shared client bundle stops selection setup on login and battle pages', () => {
    const guardIndex = script.indexOf('if (!slotList) return;');
    const firstRosterWriteIndex = script.indexOf("slotList.innerHTML = '';");

    assert.ok(guardIndex >= 0, 'selection setup must have a missing-roster guard');
    assert.ok(guardIndex < firstRosterWriteIndex, 'the guard must run before the first roster write');
});

test('selection actions explain their desktop and mobile activation gestures', () => {
    assert.match(script, /Double-click .* to add them to Your Team\./);
    assert.match(script, /Tap .* again to add them\./);
    assert.match(script, /Double-click .* in Your Team to remove them\./);
    assert.match(script, /Tap .* to remove them from your team\./);
});

test('dragging between occupied team slots swaps them and saves only the completed move', () => {
    const setSlotStart = script.indexOf('const setSelectedSlot =');
    const moveStart = script.indexOf('const moveDragPayloadToSelectedSlot =');
    const moveEnd = script.indexOf('const handleSelectedSlotDrop =');
    const setSlotSource = script.slice(setSlotStart, moveStart);
    const moveSource = script.slice(moveStart, moveEnd);

    assert.doesNotMatch(setSlotSource, /persistTeamSelection\(/);
    assert.match(moveSource, /setSelectedSlot\(sourceSlotIndex, displaced \|\| null\);/);
    assert.match(moveSource, /setSelectedSlot\(targetSlotIndex, incoming\);/);
    assert.equal((moveSource.match(/persistTeamSelection\(\)/g) || []).length, 1);
});

test('every page using the shared client bundle requests the stability build', () => {
    ['selection-login.html', 'selection.html', 'ingame.html'].forEach((filename) => {
        const html = fs.readFileSync(path.join(root, filename), 'utf8');
        assert.match(html, /scripts\/script\.js\?v=[^"']*ui-stability-v1/);
    });
});
