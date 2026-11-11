'use strict';

// Choosing Eevee's evolution (Jolteon, Flareon or Vaporeon) adds it to the roster; Eevee stays playable.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeMissionState, profileHasUnlockedCharacter } = require('../server');

test('an evolved player keeps Eevee and gains the evolution', () => {
    const missions = normalizeMissionState({ unlockedCharacterIds: ['eevee'], eeveeEvolutionCharacterId: 'jolteon' });
    assert.ok(missions.unlockedCharacterIds.includes('eevee'), 'Eevee stays unlocked');
    assert.ok(missions.unlockedCharacterIds.includes('jolteon'), 'Jolteon is unlocked');
    const profile = { arenas: { pokemon: { missions } } };
    assert.equal(profileHasUnlockedCharacter(profile, 'eevee', new Set(), 'pokemon'), true);
    assert.equal(profileHasUnlockedCharacter(profile, 'eevee', new Set(['eevee']), 'pokemon'), true);
});

test('team select and the evolve action no longer remove Eevee', () => {
    const root = path.join(__dirname, '..');
    const client = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.doesNotMatch(client, /characterId === 'eevee' &&\s*getSelectedEeveeEvolutionId\(\)/);
    assert.doesNotMatch(client, /Eevee (has been|is) permanently removed/);
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    assert.doesNotMatch(server, /unlocked(Character)?Ids\.delete\('eevee'\)/);
    assert.match(server, /reward: 'Choose Jolteon, Flareon, or Vaporeon\. Eevee stays playable\.'/);
});
