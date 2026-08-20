const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('a newly-applied status not already covered by a bespoke effect plays a buff/debuff sprite burst keyed off metadata.harmful', () => {
    assert.match(script, /let handled = false;/);
    assert.match(
        script,
        /if \(\s*!handled &&\s*currentMatchArena === 'pokemon' &&\s*!status\?\.metadata\?\.infiniteDuration &&\s*!isPokemonEvolutionStatus\(status\)\s*\) \{/
    );
    assert.match(
        script,
        /key: status\?\.metadata\?\.harmful \? 'debuffApply' : 'buffApply',/
    );
});

test('every existing bespoke status effect branch marks the status handled so it does not also get a generic burst', () => {
    const forEachBlock = script.slice(
        script.indexOf('changedStatuses.forEach((status) => {'),
        script.indexOf("key: status?.metadata?.harmful ? 'debuffApply' : 'buffApply',")
    );
    const bespokeBranches = forEachBlock.match(/showTemporaryCardFx\(/g) || [];
    const handledMarks = forEachBlock.match(/handled = true;/g) || [];
    assert.ok(bespokeBranches.length >= 7, 'expected at least the 7 known bespoke status branches');
    assert.equal(
        handledMarks.length,
        bespokeBranches.length,
        'every bespoke showTemporaryCardFx branch above the fallback must set handled = true'
    );
});

test('the fallback burst positions itself from the character-face rect, matching the faint burst pattern', () => {
    assert.match(
        script,
        /const face = card\.querySelector\('\.character-face'\);\s*const faceRect = \(face \|\| card\)\.getBoundingClientRect\(\);\s*playPokemonSpriteBurst\(\{\s*x: faceRect\.left \+ faceRect\.width \/ 2,\s*y: faceRect\.top \+ faceRect\.height \/ 2,\s*key: status\?\.metadata\?\.harmful/
    );
});
