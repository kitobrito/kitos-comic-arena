import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ROSTER } from '../reference/roster.mjs';
import { SKILL_ART } from '../reference/skill-art.mjs';

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const productionCharacters = require('../../../characters.js').filter(
    (character) => String(character?.arena ?? '').toLowerCase() === 'pokemon'
);

function normalizeArtPath(source) {
    if (/^https?:\/\//i.test(source)) return source;
    const clean = source.replace(/^\/+/, '');
    return clean.startsWith('assets/')
        ? `/${clean.replace(/^assets\//, 'game-assets/')}`
        : `/game-assets/${clean}`;
}

function collectSkillArt(value, catalog = new Map()) {
    if (!value || typeof value !== 'object') return catalog;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectSkillArt(entry, catalog));
        return catalog;
    }
    if (typeof value.id === 'string' && typeof value.skillimage === 'string') {
        catalog.set(value.id, normalizeArtPath(value.skillimage));
    }
    Object.values(value).forEach((entry) => collectSkillArt(entry, catalog));
    return catalog;
}

// Skills invented for this prototype with no production counterpart at all -
// see skill-description-parity.test.mjs's AHEAD_OF_PRODUCTION_SKILL_IDS for why
// (Cyndaquil's mission-driven evolution rework; production never evolves it
// in battle).
const PROTOTYPE_ONLY_SKILL_IDS = new Set([
    'cyndaquil-quilava-flame-wheel',
    'cyndaquil-typhlosion-flame-wheel',
    'totodile-croconaw-bite',
    'totodile-feraligatr-dragon-claw',
    'chikorita-bayleaf-magical-leaf',
    'chikorita-meganium-magical-leaf',
]);

test('the standalone art catalog mirrors every Pokemon Arena skill image', () => {
    const productionArt = collectSkillArt(productionCharacters);

    assert.equal(productionArt.size, 317);
    assert.deepEqual(
        Object.entries(SKILL_ART)
            .filter(([id]) => !PROTOTYPE_ONLY_SKILL_IDS.has(id))
            .sort(([left], [right]) => left.localeCompare(right)),
        [...productionArt].sort(([left], [right]) => left.localeCompare(right))
    );
});

test('every current standalone skill exposes an existing local image', () => {
    const skills = Object.values(ROSTER).flatMap((species) => species.skills);

    assert.equal(skills.length, 282);
    skills.forEach((skill) => {
        assert.equal(typeof skill.image, 'string', `${skill.id} has no image path`);
        assert.ok(
            skill.image.startsWith('/game-assets/') || /^https?:\/\//i.test(skill.image),
            `${skill.id} does not use a production image URL`
        );
        if (!skill.image.startsWith('/game-assets/')) return;
        const assetPath = resolve(
            repositoryRoot,
            'assets',
            skill.image.slice('/game-assets/'.length)
        );
        assert.ok(existsSync(assetPath), `${skill.id} image is missing at ${assetPath}`);
    });
});
