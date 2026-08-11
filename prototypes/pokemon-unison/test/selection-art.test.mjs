import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ROSTER } from '../reference/roster.mjs';
import {
    SELECTION_EVOLUTION_RENDER_BY_ID,
    SELECTION_RENDER_BY_ID,
    selectionRenderForms,
} from '../reference/selection-art.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const renderRoot = resolve(repositoryRoot, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB');

test('every standalone Pokemon reuses its current optimized character-select render', () => {
    assert.deepEqual(Object.keys(SELECTION_RENDER_BY_ID).sort(), Object.keys(ROSTER).sort());
    Object.entries(SELECTION_RENDER_BY_ID).forEach(([speciesId, filename]) => {
        assert.ok(existsSync(resolve(renderRoot, filename)), `${speciesId} selection render is missing: ${filename}`);
        assert.match(selectionRenderForms(speciesId, ROSTER[speciesId].name)[0].url, /^\/game-assets\/images\/selection-featured\//);
    });
});

test('every mapped evolution render belongs to a standalone Pokemon with an evolved form', () => {
    Object.entries(SELECTION_EVOLUTION_RENDER_BY_ID).forEach(([speciesId, evolution]) => {
        assert.ok(ROSTER[speciesId], `${speciesId} is not in the standalone roster`);
        assert.ok(Object.keys(ROSTER[speciesId].forms).some((formId) => formId !== 'base'));
        assert.ok(existsSync(resolve(renderRoot, evolution.filename)), `${evolution.name} selection render is missing`);
        assert.equal(selectionRenderForms(speciesId, ROSTER[speciesId].name).length, 2);
    });
});
