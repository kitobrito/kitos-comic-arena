const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPrompt,
    getMimeTypeFromExt,
    parseArgs,
    resolveOutputPath,
    slugify,
} = require('../scripts/gemini-pokemon-image');

test('slugify matches Pokemon asset naming style', () => {
    assert.equal(slugify('Hyper Beam'), 'hyperbeam');
    assert.equal(slugify('Face Picture'), 'facepicture');
});

test('parseArgs reads pokemon image generator options', () => {
    const parsed = parseArgs([
        '--pokemon',
        'magikarp',
        '--name',
        'Hyper Beam',
        '--type',
        'skill',
        '--ext',
        'webp',
        '--json',
    ]);

    assert.equal(parsed.pokemon, 'magikarp');
    assert.equal(parsed.name, 'Hyper Beam');
    assert.equal(parsed.type, 'skill');
    assert.equal(parsed.ext, 'webp');
    assert.equal(parsed.json, true);
});

test('buildPrompt defaults to Pokemon anime style', () => {
    const prompt = buildPrompt({
        pokemon: 'Pikachu',
        name: 'Thunder',
        type: 'skill',
    });

    assert.match(prompt, /digital art anime style of the official Pokemon anime/i);
    assert.match(prompt, /Pikachu Thunder/);
});

test('resolveOutputPath writes into PokemonArena folders by default', () => {
    const outputPath = resolveOutputPath({
        pokemon: 'magikarp',
        name: 'Hyper Beam',
        ext: 'jpg',
    });

    assert.match(outputPath.replaceAll('\\', '/'), /assets\/images\/PokemonArena\/magikarp\/hyperbeam\.jpg$/);
});

test('getMimeTypeFromExt maps supported output extensions', () => {
    assert.equal(getMimeTypeFromExt('png'), 'image/jpeg');
    assert.equal(getMimeTypeFromExt('jpg'), 'image/jpeg');
    assert.equal(getMimeTypeFromExt('webp'), 'image/jpeg');
});
