const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('a newly-applied status not already covered by a bespoke effect plays a buff/debuff burst in either arena, keyed off metadata.harmful', () => {
    assert.match(script, /let handled = false;/);
    assert.match(
        script,
        /if \(\s*!handled &&\s*!status\?\.metadata\?\.infiniteDuration &&\s*!isPokemonEvolutionStatus\(status\)\s*\) \{\s*window\.BattleFX\?\.status\(card, Boolean\(status\?\.metadata\?\.harmful\)\);/
    );
    assert.doesNotMatch(script, /currentMatchArena === 'pokemon' &&\s*!status\?\.metadata\?\.infiniteDuration/);
});

test('every existing bespoke status effect branch marks the status handled so it does not also get a generic burst', () => {
    const forEachBlock = script.slice(
        script.indexOf('changedStatuses.forEach((status) => {'),
        script.indexOf('window.BattleFX?.status(card, Boolean(status?.metadata?.harmful));')
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

test('the engine centres the status burst on the character-face rect and picks the buff or debuff effect', () => {
    const engine = fs.readFileSync(path.join(root, 'scripts', 'battle-fx.js'), 'utf8');
    assert.match(engine, /const faceOf = \(card\) => card\?\.querySelector\?\.\('\.character-face'\) \|\| card;/);
    assert.match(engine, /key: harmful \? 'type\/debuffApply' : 'type\/buffApply'/);
});
