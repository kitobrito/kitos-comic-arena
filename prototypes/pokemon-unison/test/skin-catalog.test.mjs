import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createDefaultSkinState,
    getSkinCatalogById,
    normalizeSkinState,
    resolveSkinTypeOverride,
    SKIN_CATALOG,
    SKIN_TYPE_OVERRIDES,
} from '../reference/skin-catalog.mjs';
import { ROSTER } from '../reference/roster.mjs';

test('every SKIN_CATALOG entry has a unique skinId and references a real ROSTER character', () => {
    const skinIds = SKIN_CATALOG.map((entry) => entry.skinId);
    assert.deepEqual(skinIds, [...new Set(skinIds)]);
    SKIN_CATALOG.forEach((entry) => {
        assert.ok(ROSTER[entry.characterId], `${entry.skinId} references unknown character ${entry.characterId}`);
    });
});

test('getSkinCatalogById zeroes the cost of mission-reward-only skins and defaults a missing cost to 100', () => {
    const catalog = getSkinCatalogById([
        { skinId: 'reward-only', characterId: 'ditto', missionRewardOnly: true, unlockPointCost: 750 },
        { skinId: 'no-cost-set', characterId: 'ditto' },
        { skinId: 'normal', characterId: 'ditto', unlockPointCost: 500 },
    ]);
    assert.equal(catalog.get('reward-only').unlockPointCost, 0);
    assert.equal(catalog.get('no-cost-set').unlockPointCost, 100);
    assert.equal(catalog.get('normal').unlockPointCost, 500);
});

test('normalizeSkinState drops unlocked skins that no longer exist in the catalog', () => {
    const catalog = [{ skinId: 'ditto-shiny', characterId: 'ditto', unlockPointCost: 500 }];
    const state = normalizeSkinState(
        { unlockedSkinIds: ['ditto-shiny', 'a-removed-skin'], equippedSkinByCharacterId: {} },
        catalog
    );
    assert.deepEqual(state.unlockedSkinIds, ['ditto-shiny']);
});

test('normalizeSkinState drops an equipped skin that is not unlocked or belongs to the wrong character', () => {
    const catalog = [
        { skinId: 'ditto-shiny', characterId: 'ditto', unlockPointCost: 500 },
        { skinId: 'pikachu-raichu', characterId: 'pikachu', unlockPointCost: 750 },
    ];
    const notUnlocked = normalizeSkinState(
        { unlockedSkinIds: [], equippedSkinByCharacterId: { ditto: 'ditto-shiny' } },
        catalog
    );
    assert.deepEqual(notUnlocked.equippedSkinByCharacterId, {});

    const wrongCharacter = normalizeSkinState(
        { unlockedSkinIds: ['ditto-shiny'], equippedSkinByCharacterId: { pikachu: 'ditto-shiny' } },
        catalog
    );
    assert.deepEqual(wrongCharacter.equippedSkinByCharacterId, {});

    const valid = normalizeSkinState(
        { unlockedSkinIds: ['ditto-shiny'], equippedSkinByCharacterId: { ditto: 'ditto-shiny' } },
        catalog
    );
    assert.deepEqual(valid.equippedSkinByCharacterId, { ditto: 'ditto-shiny' });
});

test('createDefaultSkinState returns an empty, independent state each call', () => {
    const first = createDefaultSkinState();
    first.unlockedSkinIds.push('mutated');
    const second = createDefaultSkinState();
    assert.deepEqual(second.unlockedSkinIds, []);
});

test('SKIN_TYPE_OVERRIDES only references skins that exist in SKIN_CATALOG with a matching pokemonTypes patch', () => {
    const catalogById = getSkinCatalogById();
    Object.entries(SKIN_TYPE_OVERRIDES).forEach(([skinId, types]) => {
        const entry = catalogById.get(skinId);
        assert.ok(entry, `${skinId} is in SKIN_TYPE_OVERRIDES but missing from SKIN_CATALOG`);
        assert.deepEqual(entry.patch?.pokemonTypes, types);
    });
});

test('resolveSkinTypeOverride returns a fresh array for an override skin and null otherwise', () => {
    const override = resolveSkinTypeOverride('charmander-charizard-legendary');
    assert.deepEqual(override, ['Fire', 'Flying']);
    override.push('Tampered');
    assert.deepEqual(resolveSkinTypeOverride('charmander-charizard-legendary'), ['Fire', 'Flying']);

    assert.equal(resolveSkinTypeOverride('ditto-shiny'), null);
    assert.equal(resolveSkinTypeOverride('not-a-real-skin'), null);
});
