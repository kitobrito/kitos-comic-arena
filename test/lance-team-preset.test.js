const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// Lance is a single roster tile standing in for his whole starting team.
// Picking him is supposed to auto-fill and lock all three team slots at once
// (Dragonite/Gyarados/Aerodactyl) instead of behaving like a normal
// one-slot character. This suite follows the codebase's existing convention
// for scripts/script.js (see selection-keyboard-lock.test.js,
// ui-stability-regressions.test.js) of asserting against the source text
// directly, since the shared client bundle has no jsdom harness.

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const characters = require('../characters');
const { resolveMissionUnlockPointCost } = require('../server');

const findCharacter = (id) => characters.find((character) => character.id === id);

test('Lance preset and his bundled team ids are declared', () => {
    assert.match(script, /const LANCE_PRESET_CHARACTER_ID = 'lance'/);
    assert.match(
        script,
        /const LANCE_TEAM_CHARACTER_IDS = \['lance-dragonite-1', 'lance-gyarados', 'lance-aerodactyl'\]/
    );
});

test('roster display filters out hiddenFromSelection characters', () => {
    assert.match(script, /if \(roster\[index\]\?\.hiddenFromSelection\) return false;/);
    assert.match(script, /if \(character\?\.hiddenFromSelection\) return;/);
});

test('picking the Lance tile requires an empty team and fills all three slots at once', () => {
    assert.match(script, /const assignLanceTeamPreset = \(lanceRosterIndex\) => \{/);
    assert.match(
        script,
        /if \(selectedAssignments\.some\(\(assignment\) => assignment\)\) \{[\s\S]*?Clear your team first[\s\S]*?return false;\s*\}/
    );
    assert.match(
        script,
        /const bundleRosterIndices = LANCE_TEAM_CHARACTER_IDS\.map\(getRosterIndexByCharacterId\);/
    );
    assert.match(
        script,
        /bundleRosterIndices\.forEach\(\(rosterIndex, slotIndex\) => \{\s*setSelectedSlot\(slotIndex, \{ characterIndex: rosterIndex, rosterIndex \}, \{ confirm: true \}\);/
    );
});

test('removing any bundled Pokemon clears the whole Lance team and restores his tile', () => {
    assert.match(script, /const clearLanceBundleFromSlot = \(slotIndex\) => \{/);
    assert.match(script, /const bundleSlotIndices = getLanceBundleSlotIndices\(\);/);
    assert.match(script, /bundleSlotIndices\.forEach\(\(index\) => setSelectedSlot\(index, null\)\);/);
    assert.match(
        script,
        /const lanceRosterIndex = getRosterIndexByCharacterId\(LANCE_PRESET_CHARACTER_ID\);[\s\S]*?fillRosterSlot\(lanceRosterIndex\);/
    );
});

test('every removal path (double-click, drag to roster, drag cancel) is bundle-aware', () => {
    assert.match(
        script,
        /handleSelectedSlotDoubleClick = \(slotIndex\) => \{\s*const assignment = selectedAssignments\[slotIndex\];\s*if \(!assignment\) return;\s*if \(clearLanceBundleFromSlot\(slotIndex\)\) return;/
    );
    assert.match(
        script,
        /if \(clearLanceBundleFromSlot\(payload\.selectedIndex\)\) return;\s*const assignment = selectedAssignments\[payload\.selectedIndex\];\s*setSelectedSlot\(payload\.selectedIndex, null\);\s*fillRosterSlot\(assignment\.rosterIndex\);/
    );
    assert.match(
        script,
        /if \(clearLanceBundleFromSlot\(payload\.selectedIndex\)\) return true;/
    );
});

test('click-to-add and drag-to-add both route the Lance tile through the preset assigner', () => {
    assert.match(
        script,
        /if \(roster\[rosterIndex\]\?\.id === LANCE_PRESET_CHARACTER_ID\) \{\s*assignLanceTeamPreset\(rosterIndex\);\s*return;\s*\}/
    );
    assert.match(
        script,
        /roster\[payload\.rosterIndex\]\?\.id === LANCE_PRESET_CHARACTER_ID\s*\) \{\s*return assignLanceTeamPreset\(payload\.rosterIndex\);\s*\}/
    );
});

test('dragging a bundled slot individually is refused', () => {
    assert.match(
        script,
        /\(payload\.type === 'selected' && getLanceBundleSlotIndices\(\)\.includes\(payload\.selectedIndex\)\) \|\|\s*getLanceBundleSlotIndices\(\)\.includes\(targetSlotIndex\)\s*\) \{\s*return false;\s*\}/
    );
});

test('the Lance roster tile shows as already-selected while his bundle is deployed', () => {
    assert.match(
        script,
        /\(character\?\.id === LANCE_PRESET_CHARACTER_ID && getLanceBundleSlotIndices\(\)\.length > 0\)/
    );
});

test('only the middle team slot renders when Lance is fielded -- the other two collapse away', () => {
    assert.match(
        script,
        /const getLanceBundleMiddleSlotIndex = \(\) => Math\.floor\(selectedSlots\.length \/ 2\);/
    );
    assert.match(
        script,
        /if \(isBundled && slotIndex !== getLanceBundleMiddleSlotIndex\(\)\) \{\s*slotElement\.classList\.add\('lance-bundle-collapsed'\);[\s\S]*?return;\s*\}/
    );
    assert.match(
        script,
        /const displayCharacter = isBundled\s*\?\s*roster\[getRosterIndexByCharacterId\(LANCE_PRESET_CHARACTER_ID\)\] \|\| character\s*:\s*character;/
    );
    const styleCss = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    assert.match(styleCss, /\.selected-character-slot\.lance-bundle-collapsed\s*\{\s*display: none;\s*\}/);
});

test('the character preview panel shows Lance and his champion render, not the fielded Pokemon', () => {
    assert.match(
        script,
        /const LANCE_CHAMPION_PREVIEW_RENDER_URL = 'assets\/images\/PokemonArena\/BIB\/lancepokemonchampion\.webp';/
    );
    assert.match(
        script,
        /const handleCharacterSelect = \(index, \{ openViewer = true, displayCharacter = null \} = \{\}\) => \{/
    );
    assert.match(script, /renderCharacter\(displayCharacter \|\| character, index\);/);
    assert.match(
        script,
        /handleCharacterSelect\(assignment\.characterIndex, \{\s*openViewer: false,\s*displayCharacter: isBundled\s*\?\s*\{ \.\.\.character, name: 'Lance', facePicture: LANCE_CHAMPION_PREVIEW_RENDER_URL \}\s*:\s*null,\s*\}\);/
    );
    assert.match(
        script,
        /handleCharacterSelect\(assignment\.characterIndex, \{\s*openViewer: true,\s*displayCharacter: isBundled/
    );
});

test('the champion render is registered as a proper full-body featured render, not a face-crop', () => {
    assert.match(script, /'lance-gyarados': 'lancepokemonchampion\.webp',/);
    const renderPath = path.join(
        root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', 'lancepokemonchampion.webp'
    );
    assert.ok(fs.existsSync(renderPath), 'the registered featured render file should exist');
});

test("Lance's 1000-point unlock cost survives the server's price clamp", () => {
    // resolveMissionUnlockPointCost() was silently clamping any mission's
    // explicit cost down to MISSION_UNLOCK_POINT_PRICE_MAX (600) -- Lance is
    // the first mission that has ever asked for more than that.
    assert.equal(
        resolveMissionUnlockPointCost({ missionId: 'lance-champion-trial', unlockPointCost: 1000, level_requirement: 30 }),
        1000
    );
    const syncScript = fs.readFileSync(path.join(root, 'sync_pokemon_lance_mission.js'), 'utf8');
    assert.match(syncScript, /unlockPointCost:\s*1000,/);
});

test('Lance himself is a pickable preset while his three Pokemon are reachable only through him', () => {
    const lance = findCharacter('lance');
    const dragonite1 = findCharacter('lance-dragonite-1');
    const gyarados = findCharacter('lance-gyarados');
    const aerodactyl = findCharacter('lance-aerodactyl');
    assert.ok(lance, 'expected a top-level "lance" character entry');
    assert.equal(lance.hiddenFromSelection, false);
    for (const mon of [dragonite1, gyarados, aerodactyl]) {
        assert.ok(mon, `expected ${mon?.id || 'a Lance Pokemon'} to exist`);
        assert.equal(mon.hiddenFromSelection, true);
    }
});
